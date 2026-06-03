import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { FALLBACK_RATES, convertPrice } from "@/lib/currency";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...extra },
  });
}

// Per-worker in-memory rate limiter (approximate — resets on CF Worker cold start).
const RATE_LIMIT = 60; // requests per minute per key
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// In-memory exchange-rate cache, valid for one hour per worker.
let cachedRates: Record<string, number> | null = null;
let ratesCachedAt = 0;
async function getServerRates(): Promise<Record<string, number>> {
  if (cachedRates && Date.now() - ratesCachedAt < 3_600_000) return cachedRates;
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const json = (await res.json()) as { rates: Record<string, number> };
    cachedRates = json.rates;
    ratesCachedAt = Date.now();
    return cachedRates;
  } catch {
    return { ...FALLBACK_RATES };
  }
}

function checkRateLimit(keyId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export const Route = createFileRoute("/api/public/feed")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const key = url.searchParams.get("key");
          const includeTest = url.searchParams.get("include_test") === "true";
          if (!key) return json({ error: "Missing 'key' query parameter" }, 401);

          const keyHash = createHash("sha256").update(key).digest("hex");
          const { data: apiKey } = await supabaseAdmin
            .from("api_keys")
            .select("id, jeweller_id, is_active, key_type")
            .eq("key_hash", keyHash)
            .maybeSingle();

          if (!apiKey || !apiKey.is_active) {
            return json({ error: "Invalid or inactive API key" }, 401);
          }
          // Only read keys (jeweller feed keys) may query this endpoint.
          if (apiKey.key_type !== "read") {
            return json({ error: "This endpoint requires a read API key" }, 403);
          }

          if (!checkRateLimit(apiKey.id)) {
            return json({ error: "Rate limit exceeded" }, 429, { "Retry-After": "60" });
          }

          // Check if the jeweller is an admin
          const { data: userRole } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", apiKey.jeweller_id)
            .eq("role", "admin")
            .maybeSingle();

          const isAdmin = !!userRole;
          const showTest = includeTest && isAdmin;

          // Fire-and-forget last_used_at update
          supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", apiKey.id)
            .then(() => {});

          const { data: jProfile } = await supabaseAdmin
            .from("jeweller_profiles")
            .select("markup_global, feed_currency")
            .eq("id", apiKey.jeweller_id)
            .maybeSingle();
          const globalMarkup = Number(jProfile?.markup_global ?? 2);
          const feedCurrency =
            (jProfile as { feed_currency?: string } | null)?.feed_currency ?? "USD";
          const rates = await getServerRates();

          const { data: selections } = await supabaseAdmin
            .from("feed_selections")
            .select("selection_type, stone_id, dealer_id, markup_override")
            .eq("api_key_id", apiKey.id);

          const dealerFollows = (selections ?? []).filter((s) => s.selection_type === "dealer_follow" && s.dealer_id);
          const stonePins = (selections ?? []).filter((s) => s.selection_type === "stone_pin" && s.stone_id);

          type StoneRow = Record<string, unknown> & {
            id: string;
            wholesale_price_usd?: number | null;
            price_currency?: string | null;
            stone_images?: Array<{
              storage_url: string | null;
              external_image_url: string | null;
              is_primary: boolean;
              sort_order: number | null;
            }>;
          };

          const stones: unknown[] = [];
          const excluded: { id: string; reason: string }[] = [];
          const seen = new Set<string>();
          // Track original wholesale (in USD-normalised form) per stone id for rule checks.
          const wholesaleMap = new Map<string, { wholesale: number; sourceCurrency: string }>();

          const pushStone = (s: StoneRow, markup: number) => {
            if (seen.has(s.id)) return;
            seen.add(s.id);
            const wholesale = s.wholesale_price_usd != null ? Number(s.wholesale_price_usd) : null;
            const sourceCurrency = s.price_currency ?? "USD";
            if (wholesale != null) {
              wholesaleMap.set(s.id, { wholesale, sourceCurrency });
            }
            const wholesaleInFeedCurrency =
              wholesale != null
                ? convertPrice(wholesale, sourceCurrency, feedCurrency, rates)
                : null;
            const retailInFeedCurrency =
              wholesaleInFeedCurrency != null
                ? Math.round(wholesaleInFeedCurrency * markup * 100) / 100
                : null;

            // Resolve primary image from storage_url, falling back to external_image_url.
            const sortedImages = [...(s.stone_images ?? [])].sort(
              (a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99),
            );
            const primaryImg = sortedImages.find((img) => img.is_primary) ?? sortedImages[0];
            const image_url = primaryImg?.storage_url || primaryImg?.external_image_url || null;

            // Strip wholesale price — only expose the computed retail price.
            const { wholesale_price_usd, stone_images, ...stoneData } = s;
            stones.push({
              ...stoneData,
              image_url,
              retail_price: retailInFeedCurrency,
              retail_currency: feedCurrency,
              markup_applied: markup,
            });
          };

          if (dealerFollows.length) {
            const dealerIds = dealerFollows.map((d) => d.dealer_id as string);
            let query = supabaseAdmin
              .from("stones")
              .select("*, stone_images(storage_url, external_image_url, is_primary, sort_order)")
              .in("dealer_id", dealerIds)
              .eq("status", "available");
            if (!showTest) {
              query = query.eq("is_test", false);
            }
            const { data } = await query;
            (data ?? []).forEach((s) => {
              const override = dealerFollows.find((d) => d.dealer_id === (s as StoneRow).dealer_id)?.markup_override;
              const m = override != null ? Number(override) : globalMarkup;
              pushStone(s as StoneRow, m);
            });
          }

          if (stonePins.length) {
            const stoneIds = stonePins.map((p) => p.stone_id as string);
            const { data } = await supabaseAdmin
              .from("stones")
              .select("*, stone_images(storage_url, external_image_url, is_primary, sort_order)")
              .in("id", stoneIds)
              .eq("status", "available");
            (data ?? []).forEach((s) => {
              const pin = stonePins.find((p) => p.stone_id === (s as StoneRow).id);
              const m = pin?.markup_override != null ? Number(pin.markup_override) : globalMarkup;
              pushStone(s as StoneRow, m);
            });
          }

          // Apply dealer pricing rules — drop stones below min_price / rap_floor.
          const dealerIdSet = new Set<string>();
          (stones as Array<{ dealer_id?: string }>).forEach((s) => {
            if (s.dealer_id) dealerIdSet.add(s.dealer_id);
          });
          if (dealerIdSet.size > 0) {
            const { data: rules } = await supabaseAdmin
              .from("pricing_rules")
              .select("dealer_id, scope, stone_id, stone_type, rule_type, value, currency, is_active")
              .in("dealer_id", Array.from(dealerIdSet))
              .eq("is_active", true);
            const ruleList = (rules ?? []) as Array<{
              dealer_id: string; scope: string; stone_id: string | null;
              stone_type: string | null; rule_type: string; value: number; currency: string | null;
            }>;
            if (ruleList.length > 0) {
              const kept: unknown[] = [];
              for (const s of stones as Array<Record<string, unknown>>) {
                const dealerId = s.dealer_id as string | undefined;
                const stoneId = s.id as string;
                const stoneType = s.stone_type as string | undefined;
                const w = wholesaleMap.get(stoneId);
                const violates = ruleList.some((r) => {
                  if (r.dealer_id !== dealerId) return false;
                  if (r.scope === "stone" && r.stone_id !== stoneId) return false;
                  if (r.scope === "stone_type" && r.stone_type !== stoneType) return false;
                  if (!w) return false;
                  if (r.rule_type === "min_price") {
                    const ruleCurrency = r.currency || "USD";
                    const wholesaleInRuleCurrency = convertPrice(
                      w.wholesale, w.sourceCurrency, ruleCurrency, rates,
                    );
                    return wholesaleInRuleCurrency < Number(r.value);
                  }
                  // rap_floor and min_margin_pct require a per-stone declared reference price
                  // which isn't modelled yet — skip without excluding.
                  return false;
                });
                if (violates) {
                  excluded.push({ id: stoneId, reason: "below_minimum_price" });
                } else {
                  kept.push(s);
                }
              }
              return json({ stones: kept, excluded, count: kept.length });
            }
          }

          return json({ stones, excluded, count: stones.length });
        } catch (e) {
          console.error("[feed] internal error", e);
          return json({ error: "Internal server error" }, 500);
        }
      },
    },
  },
});
