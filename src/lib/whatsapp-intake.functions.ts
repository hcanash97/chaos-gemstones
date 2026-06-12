import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const ParseInputSchema = z.object({
  message: z.string().min(1).max(4000),
});

// Per-stone schema — validates a single parsed gemstone record.
const StoneFieldsSchema = z.object({
  stone_type:         z.string().default(""),
  shape:              z.string().default(""),
  carat_weight:       z.string().default(""),
  colour_grade:       z.string().default(""),
  clarity_grade:      z.string().default(""),
  cert_lab:           z.string().default(""),
  cert_number:        z.string().default(""),
  treatment:          z.string().default(""),
  country_of_origin:  z.string().default(""),
  wholesale_price_usd:z.string().default(""),
  price_currency:     z.string().default("USD"),
  raw_price_text:     z.string().default(""),
  confidence:         z.enum(["high", "medium", "low"]).default("low"),
  warnings:           z.array(z.string()).default([]),
  is_multi_stone:     z.boolean().default(false),
  is_price_update:    z.boolean().default(false),
  is_withdrawal:      z.boolean().default(false),
});

// AI response now always returns an array of stones (one entry per stone
// detected). Legacy single-stone shape is still accepted and wrapped.
const AiResponseSchema = z.union([
  z.object({ stones: z.array(StoneFieldsSchema).min(1) }),
  StoneFieldsSchema.transform((s) => ({ stones: [s] })),
]);

const SaveDraftSchema = z.object({
  stone_type:          z.string().min(1),
  shape:               z.string().nullable(),
  carat_weight:        z.number().nullable(),
  colour_grade:        z.string().nullable(),
  clarity_grade:       z.string().nullable(),
  cert_lab:            z.string().nullable(),
  cert_number:         z.string().nullable(),
  treatment:           z.string().nullable(),
  country_of_origin:   z.string().nullable(),
  wholesale_price_usd: z.number().nullable(),
  price_currency:      z.string().default("USD"),
  notes_for_buyers:    z.string().nullable(),
  raw_message:         z.string(),
  extracted_json:      z.record(z.unknown()),
  confidence:          z.enum(["high", "medium", "low"]),
  warnings:            z.array(z.string()),
  raw_price_text:      z.string().nullable(),
  original_currency:   z.string().nullable(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type ParsedWhatsAppStone = z.infer<typeof StoneFieldsSchema>;

export type ParseResult =
  | { ok: true;  stones: ParsedWhatsAppStone[] }
  | { ok: false; error: string };

export type SaveDraftResult =
  | { ok: true;  stoneId: string; logId: string }
  | { ok: false; error: string; isDuplicate?: boolean };

// ─── Live FX rates (frankfurter.app — free, no key) ─────────────────────────

const FX_FALLBACK: Record<string, number> = {
  GBP: 1.27, EUR: 1.08, AUD: 0.65, CAD: 0.74,
  INR: 0.012, LKR: 0.003, THB: 0.028, PKR: 0.0036,
  HKD: 0.128, SGD: 0.74, AED: 0.272, CHF: 1.12,
};

async function toUsd(amount: number, currency: string): Promise<{ usd: number; rate: number; live: boolean }> {
  if (!currency || currency === "USD") return { usd: amount, rate: 1, live: true };
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=USD`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.USD;
      if (typeof rate === "number" && rate > 0) {
        return { usd: Math.round(amount * rate * 100) / 100, rate, live: true };
      }
    }
  } catch {
    // fall through to static rates
  }
  const fallback = FX_FALLBACK[currency.toUpperCase()];
  if (fallback) return { usd: Math.round(amount * fallback * 100) / 100, rate: fallback, live: false };
  return { usd: amount, rate: 1, live: false };
}

// ─── Plausibility check — flag suspiciously low per-carat prices ─────────────

const MIN_PER_CARAT: Record<string, number> = {
  Diamond: 200,
  "Blue Sapphire": 80,
  Ruby: 80,
  Emerald: 80,
  Sapphire: 80,
  Spinel: 40,
  Tourmaline: 30,
  Tanzanite: 40,
};

function pricePerCaratWarning(stoneType: string, priceUsd: number, caratWeight: number): string | null {
  const key = Object.keys(MIN_PER_CARAT).find((k) =>
    stoneType.toLowerCase().includes(k.toLowerCase()),
  );
  if (!key) return null;
  const perCarat = priceUsd / caratWeight;
  if (perCarat < MIN_PER_CARAT[key]) {
    return `Price of $${Math.round(perCarat)}/ct seems very low for ${stoneType} — verify currency conversion`;
  }
  return null;
}

// ─── AI extraction server function ──────────────────────────────────────────

export const parseWhatsAppMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ParseInputSchema.parse(input))
  .handler(async ({ data }): Promise<ParseResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "ANTHROPIC_API_KEY environment variable is not set on this server." };
    }

    // Strip WhatsApp forward headers (lines like "Forwarded message", timestamps, contact names)
    const cleaned = data.message
      .replace(/^[-─=*]{3,}\s*Forwarded\s*message\s*[-─=*]{3,}/im, "")
      .replace(/^\[?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?\]?\s+[^:]+:/im, "")
      .trim();

    const systemPrompt = `You are an expert gemstone trade analyst. Extract structured data from informal dealer WhatsApp messages.

DEALER ORIGINS: Jaipur, Surat (India), Colombo (Sri Lanka), Bangkok, Chanthaburi (Thailand), Yangon (Myanmar), Peshawar, Karachi (Pakistan).

TRANSLITERATIONS TO RECOGNISE:
- neelam/neelab/nilam = Blue Sapphire
- manik/manak = Ruby
- panna/pana = Emerald
- heera/hira = Diamond
- pukhraj = Yellow Sapphire
- saphier/saffir/safir/sapfir = Sapphire
- GIS/GIS cert/GiA = GIA (lab typo)
- NK/GRS cert = GRS

SHAPE ABBREVIATIONS: rd=Round, ov=Oval, ps/pe=Pear, em/ec=Emerald Cut, cush/cshn=Cushion, rad=Radiant, mq=Marquise, pr/pri=Princess, hrt=Heart, assc=Asscher

TREATMENT SIGNALS:
- "no heat"/"NH"/"unheated"/"garam nahi"/"no treatment" = Unheated
- "heated"/"H"/"heat treated" = Heated  
- "lab grown"/"LG"/"CVD"/"HPHT"/"lab-grown" = Lab-grown
- "FF"/"fracture filled" = Fracture Filled
- "BE"/"beryllium" = Beryllium Treated
- Ambiguous = leave treatment empty and add to warnings

PRICE CURRENCIES: USD, GBP, EUR, LKR, THB, PKR, INR, AED, HKD. Output the original currency code; the server handles conversion.

MULTI-STONE: Messages may contain multiple stones. ALWAYS return a JSON object of the shape \`{ "stones": [ { …stone 1… }, { …stone 2… } ] }\` — one entry per stone detected. If there is only one stone, return an array of length 1. Set is_multi_stone=true on every entry when 2+ stones were parsed from the same message.

INTENT DETECTION:
- "sold"/"already gone"/"not available"/"no more" with no new stone = set is_withdrawal=true
- price-only message with no stone details = set is_price_update=true

CERT NUMBER RULE: Only extract cert_number if an explicit number appears in the text. Never infer or generate one. If a cert lab is mentioned but no number, leave cert_number empty and add warning "Cert lab mentioned but no number provided — verify".

Respond ONLY with a JSON object of the shape { "stones": [ ... ] }. No markdown, no explanation. Each stone entry uses this schema:
{
  "stone_type": "normalised English name e.g. Blue Sapphire, Ruby, Diamond",
  "shape": "normalised e.g. Oval, Round, Cushion, Emerald Cut, Pear",
  "carat_weight": "numeric string e.g. '2.30', empty if not found",
  "colour_grade": "colour description or GIA D-Z letter",
  "clarity_grade": "e.g. VS1, Eye Clean, empty if not found",
  "cert_lab": "normalised lab name e.g. GIA, IGI, GRS — empty if not mentioned",
  "cert_number": "alphanumeric only if explicitly in message — NEVER infer",
  "treatment": "one of: Unheated, Heated, Lab-grown, Fracture Filled, Beryllium Treated — or empty if ambiguous",
  "country_of_origin": "e.g. Sri Lanka, Myanmar, Mozambique — empty if not mentioned",
  "wholesale_price_usd": "numeric string in ORIGINAL currency (not converted) e.g. '4200'",
  "price_currency": "original currency code e.g. USD, LKR, THB",
  "raw_price_text": "exact price text copied from message for audit",
  "confidence": "high | medium | low",
  "warnings": ["array of specific human-readable flags"],
  "is_multi_stone": false,
  "is_price_update": false,
  "is_withdrawal": false
}`;

    let raw: string;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: "user", content: cleaned }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 529 || res.status === 503) {
        // Retry once after 2s on overload
        await new Promise((r) => setTimeout(r, 2000));
        const retry = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 800,
            system: systemPrompt,
            messages: [{ role: "user", content: cleaned }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!retry.ok) {
          const body = await retry.text();
          return { ok: false, error: `Anthropic API error ${retry.status}: ${body.slice(0, 200)}` };
        }
        const json = await retry.json();
        raw = json?.content?.[0]?.text ?? "";
      } else if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `Anthropic API error ${res.status}: ${body.slice(0, 200)}` };
      } else {
        const json = await res.json();
        raw = json?.content?.[0]?.text ?? "";
      }
    } catch (err) {
      const msg = String(err);
      if (msg.includes("TimeoutError") || msg.includes("AbortError")) {
        return { ok: false, error: "AI extraction timed out after 15 seconds. Please try again." };
      }
      return { ok: false, error: `Network error calling Anthropic: ${msg}` };
    }

    // Strip accidental markdown fences
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    // Attempt JSON parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      // Try to repair truncated JSON by closing open braces
      try {
        const repaired = stripped + '"}}'.slice(-(stripped.split("{").length - stripped.split("}").length));
        parsed = JSON.parse(repaired);
      } catch {
        return {
          ok: false,
          error: `AI returned unexpected format. Raw: ${raw.slice(0, 300)}`,
        };
      }
    }

    // Validate against strict schema (accepts both array and legacy single shape)
    const validated = AiResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: `AI response schema mismatch: ${validated.error.issues.map((i) => i.message).join(", ")}`,
      };
    }

    const stones = validated.data.stones;
    const isMulti = stones.length > 1;

    // Per-stone FX conversion + plausibility checks
    for (const stone of stones) {
      if (isMulti) stone.is_multi_stone = true;

      if (stone.wholesale_price_usd && stone.price_currency && stone.price_currency !== "USD") {
        const raw_amount = parseFloat(stone.wholesale_price_usd);
        if (!isNaN(raw_amount) && raw_amount > 0) {
          const { usd, live } = await toUsd(raw_amount, stone.price_currency);
          stone.wholesale_price_usd = String(usd);
          if (!live) {
            stone.warnings.push(`Price converted from ${stone.price_currency} using static rate — verify`);
          } else {
            stone.warnings.push(`Price converted from ${stone.price_currency} to USD at live rate`);
          }
        }
      }

      const carat = parseFloat(stone.carat_weight);
      const price = parseFloat(stone.wholesale_price_usd);
      if (stone.stone_type && !isNaN(carat) && carat > 0 && !isNaN(price) && price > 0) {
        const warn = pricePerCaratWarning(stone.stone_type, price, carat);
        if (warn) stone.warnings.push(warn);
      }
    }

    return { ok: true, stones };
  });

// ─── Save draft stone server function ────────────────────────────────────────

export const saveWhatsAppDraftFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveDraftSchema.parse(input))
  .handler(async ({ context, data }): Promise<SaveDraftResult> => {

    // ── Duplicate cert check ─────────────────────────────────────────────────
    if (data.cert_number && data.cert_lab) {
      const { data: existing } = await context.supabase
        .from("stones")
        .select("id, status")
        .eq("dealer_id", context.userId)
        .eq("cert_number", data.cert_number)
        .maybeSingle();

      if (existing) {
        // Log the duplicate attempt
        await context.supabase.from("whatsapp_intake_log").insert({
          dealer_id: context.userId,
          raw_message: data.raw_message,
          extracted_json: data.extracted_json as never,
          confidence: data.confidence,
          warnings: data.warnings,
          raw_price_text: data.raw_price_text,
          original_currency: data.original_currency,
          stone_id: existing.id,
          status: "duplicate",
          processed_at: new Date().toISOString(),
        });

        return {
          ok: false,
          isDuplicate: true,
          error: `A stone with cert number ${data.cert_number} (${data.cert_lab}) already exists in your listings (ID: ${existing.id.slice(0, 8)}…). Update the existing listing instead.`,
        };
      }
    }

    // ── Insert stone — hidden until approved (is_test: true) ────────────────
    const WHATSAPP_CAVEAT =
      "Sourced via WhatsApp. Availability should be confirmed with the dealer before proceeding — this stone may have been offered to multiple buyers simultaneously.";

    const { data: row, error: insertError } = await context.supabase
      .from("stones")
      .insert({
        dealer_id:           context.userId,
        stone_type:          data.stone_type,
        shape:               data.shape,
        carat_weight:        data.carat_weight,
        colour_grade:        data.colour_grade,
        clarity_grade:       data.clarity_grade,
        cert_lab:            data.cert_lab,
        cert_number:         data.cert_number,
        treatment:           data.treatment,
        country_of_origin:   data.country_of_origin,
        wholesale_price_usd: data.wholesale_price_usd,
        price_currency:      data.price_currency || "USD",
        notes_for_buyers:    WHATSAPP_CAVEAT,
        intake_source:       "whatsapp",
        // Hidden from public marketplace until admin approves
        is_test:             true,
        status:              "available" as const,
        listing_type:        "single",
        available_qty:       1,
        featured:            false,
        has_360:             false,
        has_video:           false,
        bulk_pricing_available: false,
        matching_pair:       false,
      })
      .select("id")
      .single();

    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    // ── Write audit log ──────────────────────────────────────────────────────
    const { data: log, error: logError } = await context.supabase
      .from("whatsapp_intake_log")
      .insert({
        dealer_id:         context.userId,
        raw_message:       data.raw_message,
        extracted_json:    data.extracted_json as never,
        confidence:        data.confidence,
        warnings:          data.warnings,
        raw_price_text:    data.raw_price_text,
        original_currency: data.original_currency,
        stone_id:          row.id,
        status:            "saved",
        processed_at:      new Date().toISOString(),
      })
      .select("id")
      .single();

    if (logError) {
      console.error("[whatsapp-intake] log insert failed", logError.message);
    }

    return { ok: true, stoneId: row.id, logId: log?.id ?? "" };
  });

// ─── Admin: approve a WhatsApp-sourced stone (publish it) ────────────────────

const ApproveSchema = z.object({ stoneId: z.string().uuid() });

export type ApproveResult = { ok: true } | { ok: false; error: string };

export const approveWhatsAppStoneFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveSchema.parse(input))
  .handler(async ({ context, data }): Promise<ApproveResult> => {
    // Only admins
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("account_type")
      .eq("id", context.userId)
      .single();

    if (profile?.account_type !== "admin") {
      return { ok: false, error: "Admin access required." };
    }

    const { error } = await context.supabase
      .from("stones")
      .update({ is_test: false })
      .eq("id", data.stoneId)
      .eq("intake_source", "whatsapp");

    if (error) return { ok: false, error: error.message };

    // Update log status
    await context.supabase
      .from("whatsapp_intake_log")
      .update({ status: "approved" })
      .eq("stone_id", data.stoneId);

    return { ok: true };
  });

// ─── Admin: reject / delete a WhatsApp draft ─────────────────────────────────

const RejectSchema = z.object({ stoneId: z.string().uuid() });

export type RejectResult = { ok: true } | { ok: false; error: string };

export const rejectWhatsAppStoneFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejectSchema.parse(input))
  .handler(async ({ context, data }): Promise<RejectResult> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("account_type")
      .eq("id", context.userId)
      .single();

    if (profile?.account_type !== "admin") {
      return { ok: false, error: "Admin access required." };
    }

    // Mark stone as sold (effectively removes from marketplace) and update log
    const { error } = await context.supabase
      .from("stones")
      .update({ status: "sold" as const, feed_inactive: true })
      .eq("id", data.stoneId)
      .eq("intake_source", "whatsapp");

    if (error) return { ok: false, error: error.message };

    await context.supabase
      .from("whatsapp_intake_log")
      .update({ status: "rejected" })
      .eq("stone_id", data.stoneId);

    return { ok: true };
  });
