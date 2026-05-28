import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey, sha256 } from "@/lib/api-keys";
import { validateStonePayload } from "@/lib/dealer-api-validate";
import { detectPreset, mapRow } from "@/lib/dealer-feed-mappings";

async function ensureApprovedDealer(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, is_approved")
    .eq("id", userId)
    .single();
  if (!profile) throw new Error("Profile not found.");
  if (profile.account_type !== "dealer") throw new Error("Only dealer accounts can use this endpoint.");
  if (!profile.is_approved) throw new Error("Your account is pending approval.");
}

export const getDealerApiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureApprovedDealer(supabase, userId);

    const [{ data: key }, { data: dealerProfile }, { data: logs }] = await Promise.all([
      supabase
        .from("api_keys")
        .select("id, key_prefix, is_active, last_used_at, created_at")
        .eq("jeweller_id", userId)
        .eq("key_type", "write")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from("dealer_profiles")
        .select("external_feed_url, auto_sync_enabled, last_synced_at, external_feed_method, external_feed_body")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("sync_logs")
        .select("*")
        .eq("dealer_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      key: key ?? null,
      dealerProfile: dealerProfile ?? null,
      syncLogs: logs ?? [],
    };
  });

export const generateDealerApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureApprovedDealer(supabase, userId);

    const raw = generateApiKey();
    const hash = await sha256(raw);
    const prefix = raw.slice(0, 12);

    // Deactivate prior write keys for this dealer
    await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("jeweller_id", userId)
      .eq("key_type", "write");

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        jeweller_id: userId,
        key_hash: hash,
        key_prefix: prefix,
        key_type: "write",
        label: "Dealer write API",
        is_active: true,
      })
      .select("id, key_prefix, is_active, last_used_at, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { key: data, rawKey: raw };
  });

const syncSettingsSchema = z.object({
  external_feed_url: z.string().url().max(500).nullable(),
  auto_sync_enabled: z.boolean(),
  external_feed_method: z.enum(["GET", "POST"]).default("GET"),
  external_feed_body: z.string().max(4000).nullable().optional(),
});

export const updateDealerSyncSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => syncSettingsSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureApprovedDealer(supabase, userId);

    const { error } = await supabase
      .from("dealer_profiles")
      .update({
        external_feed_url: data.external_feed_url,
        auto_sync_enabled: data.auto_sync_enabled,
        external_feed_method: data.external_feed_method,
        external_feed_body: data.external_feed_body ?? null,
      } as never)
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Trigger a sync from the dealer's external_feed_url. Fetches the URL, parses
 * JSON or CSV (basic), and upserts stones by cert_number — same shape as the
 * bulk endpoint. Writes a row to sync_logs.
 */
export const runDealerSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Use admin client to read profile + write logs (avoids RLS edge cases)
    await ensureApprovedDealer(supabaseAdmin, userId);

    const { data: dealer } = await (supabaseAdmin as any)
      .from("dealer_profiles")
      .select("external_feed_url, external_feed_method, external_feed_body")
      .eq("id", userId)
      .maybeSingle();

    const dealerRow = dealer as { external_feed_url?: string | null; external_feed_method?: string | null; external_feed_body?: string | null } | null;
    if (!dealerRow?.external_feed_url) {
      throw new Error("No sync URL configured.");
    }

    const { data: logRow } = await supabaseAdmin
      .from("sync_logs")
      .insert({ dealer_id: userId, status: "running", source: "manual" })
      .select("id")
      .single();
    const logId = logRow!.id;

    try {
      const method = (dealerRow.external_feed_method ?? "GET").toUpperCase();
      const init: RequestInit = {
        method,
        headers: { Accept: "application/json,text/csv" },
      };
      if (method === "POST" && dealerRow.external_feed_body) {
        (init.headers as Record<string, string>)["Content-Type"] = "application/json";
        init.body = dealerRow.external_feed_body;
      }
      const res = await fetch(dealerRow.external_feed_url, init);
      if (!res.ok) throw new Error(`Source returned HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") ?? "";
      let rows: Array<Record<string, unknown>> = [];

      if (contentType.includes("json")) {
        const data = await res.json();
        rows = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.stones)
          ? (data as any).stones
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : Array.isArray((data as any)?.result)
          ? (data as any).result
          : [];
      } else {
        const text = await res.text();
        rows = parseCsv(text);
      }

      if (rows.length > 2000) {
        throw new Error(`Feed contains ${rows.length} rows; maximum supported is 2000`);
      }

      const preset = detectPreset(rows);

      // Load existing cert_numbers
      const { data: existing } = await supabaseAdmin
        .from("stones")
        .select("id, cert_number")
        .eq("dealer_id", userId)
        .not("cert_number", "is", null);
      const certToId = new Map<string, string>();
      for (const s of existing ?? []) if (s.cert_number) certToId.set(s.cert_number, s.id);

      const errors: Array<{ row: number; field: string; message: string }> = [];
      const toCreate: Array<{ data: Record<string, unknown>; image_url?: string }> = [];
      const toUpdate: Array<{ id: string; data: Record<string, unknown>; image_url?: string }> = [];
      const seenCerts = new Set<string>();
      let cityFromFeed: string | undefined;

      rows.forEach((raw, idx) => {
        const mapped = mapRow(raw as Record<string, unknown>, preset);
        if (!cityFromFeed && mapped.city) cityFromFeed = mapped.city;
        const payload = mapped.stone;
        const cert = payload.cert_number ? String(payload.cert_number).trim() : "";
        if (cert) seenCerts.add(cert);
        const existingId = cert ? certToId.get(cert) : undefined;
        const mode = existingId ? "update" : "create";
        const result = validateStonePayload(payload, mode);
        if (!result.ok) {
          result.errors.forEach((e) => errors.push({ row: idx, field: e.field, message: e.message }));
          return;
        }
        if (existingId) toUpdate.push({ id: existingId, data: result.data, image_url: mapped.image_url });
        else toCreate.push({ data: { ...result.data, dealer_id: userId }, image_url: mapped.image_url });
      });

      let created = 0;
      let updated = 0;
      const createdImageRows: Array<{ stone_id: string; storage_url: string; external_image_url: string; is_primary: boolean; sort_order: number }> = [];
      if (toCreate.length) {
        const insertData = toCreate.map((c) => c.data);
        const { data, error } = await supabaseAdmin.from("stones").insert(insertData as never).select("id");
        if (error) throw new Error(error.message);
        created = data?.length ?? 0;
        (data ?? []).forEach((row: any, i: number) => {
          const img = toCreate[i]?.image_url;
          if (img) createdImageRows.push({
            stone_id: row.id,
            storage_url: img,
            external_image_url: img,
            is_primary: true,
            sort_order: 0,
          });
        });
      }
      if (createdImageRows.length) {
        await supabaseAdmin.from("stone_images").insert(createdImageRows as never);
      }
      for (const u of toUpdate) {
        const { error } = await supabaseAdmin
          .from("stones")
          .update(u.data as never)
          .eq("id", u.id)
          .eq("dealer_id", userId);
        if (error) errors.push({ row: -1, field: "_update", message: error.message });
        else updated += 1;
        if (u.image_url) {
          const { data: existingImg } = await supabaseAdmin
            .from("stone_images")
            .select("id")
            .eq("stone_id", u.id)
            .limit(1)
            .maybeSingle();
          if (!existingImg) {
            await supabaseAdmin.from("stone_images").insert({
              stone_id: u.id,
              storage_url: u.image_url,
              external_image_url: u.image_url,
              is_primary: true,
              sort_order: 0,
            } as never);
          }
        }
      }

      // Mark stones with cert_numbers not seen in this feed as feed_inactive
      let markedInactive = 0;
      if (seenCerts.size && existing && existing.length) {
        const inactiveIds = existing
          .filter((s) => s.cert_number && !seenCerts.has(s.cert_number))
          .map((s) => s.id);
        if (inactiveIds.length) {
          const { error } = await supabaseAdmin
            .from("stones")
            .update({ feed_inactive: true })
            .in("id", inactiveIds)
            .eq("dealer_id", userId);
          if (!error) markedInactive = inactiveIds.length;
        }
      }

      await supabaseAdmin
        .from("sync_logs")
        .update({
          status: errors.length ? "partial" : "success",
          finished_at: new Date().toISOString(),
          stones_added: created,
          stones_updated: updated,
          stones_marked_inactive: markedInactive,
          errors: errors.slice(0, 50),
        })
        .eq("id", logId);

      await supabaseAdmin
        .from("dealer_profiles")
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // Optionally update dealer city from feed (only if currently empty)
      if (cityFromFeed) {
        await supabaseAdmin
          .from("profiles")
          .update({ city: cityFromFeed } as never)
          .eq("id", userId)
          .is("city", null);
      }

      return {
        ok: true,
        created,
        updated,
        markedInactive,
        errors,
        preset: preset ? { id: preset.id, label: preset.label } : null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabaseAdmin
        .from("sync_logs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          errors: [{ row: -1, field: "_fetch", message }],
        })
        .eq("id", logId);
      throw new Error(message);
    }
  });

// Tiny CSV parser — supports quoted fields, comma separator, header row.
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') inQuotes = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}