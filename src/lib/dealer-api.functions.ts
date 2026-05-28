import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey, sha256 } from "@/lib/api-keys";
import { validateStonePayload } from "@/lib/dealer-api-validate";

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
      supabase
        .from("dealer_profiles")
        .select("external_feed_url, auto_sync_enabled, last_synced_at")
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
      })
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

    const { data: dealer } = await supabaseAdmin
      .from("dealer_profiles")
      .select("external_feed_url")
      .eq("id", userId)
      .maybeSingle();

    if (!dealer?.external_feed_url) {
      throw new Error("No sync URL configured.");
    }

    const { data: logRow } = await supabaseAdmin
      .from("sync_logs")
      .insert({ dealer_id: userId, status: "running", source: "manual" })
      .select("id")
      .single();
    const logId = logRow!.id;

    try {
      const res = await fetch(dealer.external_feed_url, {
        headers: { Accept: "application/json,text/csv" },
      });
      if (!res.ok) throw new Error(`Source returned HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") ?? "";
      let rows: Array<Record<string, unknown>> = [];

      if (contentType.includes("json")) {
        const data = await res.json();
        rows = Array.isArray(data) ? data : Array.isArray((data as any)?.stones) ? (data as any).stones : [];
      } else {
        const text = await res.text();
        rows = parseCsv(text);
      }

      if (rows.length > 2000) {
        throw new Error(`Feed contains ${rows.length} rows; maximum supported is 2000`);
      }

      // Load existing cert_numbers
      const { data: existing } = await supabaseAdmin
        .from("stones")
        .select("id, cert_number")
        .eq("dealer_id", userId)
        .not("cert_number", "is", null);
      const certToId = new Map<string, string>();
      for (const s of existing ?? []) if (s.cert_number) certToId.set(s.cert_number, s.id);

      const errors: Array<{ row: number; field: string; message: string }> = [];
      const toCreate: Array<Record<string, unknown>> = [];
      const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];
      const seenCerts = new Set<string>();

      rows.forEach((raw, idx) => {
        const payload = raw as Record<string, unknown>;
        const cert = payload.cert_number ? String(payload.cert_number).trim() : "";
        if (cert) seenCerts.add(cert);
        const existingId = cert ? certToId.get(cert) : undefined;
        const mode = existingId ? "update" : "create";
        const result = validateStonePayload(payload, mode);
        if (!result.ok) {
          result.errors.forEach((e) => errors.push({ row: idx, field: e.field, message: e.message }));
          return;
        }
        if (existingId) toUpdate.push({ id: existingId, data: result.data });
        else toCreate.push({ ...result.data, dealer_id: userId });
      });

      let created = 0;
      let updated = 0;
      if (toCreate.length) {
        const { data, error } = await supabaseAdmin.from("stones").insert(toCreate as never).select("id");
        if (error) throw new Error(error.message);
        created = data?.length ?? 0;
      }
      for (const u of toUpdate) {
        const { error } = await supabaseAdmin
          .from("stones")
          .update(u.data as never)
          .eq("id", u.id)
          .eq("dealer_id", userId);
        if (error) errors.push({ row: -1, field: "_update", message: error.message });
        else updated += 1;
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
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", userId);

      return { ok: true, created, updated, markedInactive, errors };
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