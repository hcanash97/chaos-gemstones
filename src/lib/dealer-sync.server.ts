// Server-only helper: runs the dealer feed sync for an arbitrary dealer id.
// Used by both the dealer-self trigger (runDealerSync) and the admin trigger
// (adminRunDealerSyncFor). Logic copied verbatim from the original
// runDealerSync handler — same behaviour, just parameterised on dealerId.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateStonePayload } from "@/lib/dealer-api-validate";
import { detectPreset, mapRow } from "@/lib/dealer-feed-mappings";
import { normaliseValue, FIELD_MAP } from "@/lib/import-fields";

function assertSafeFeedUrl(urlStr: string): void {
  const target = new URL(urlStr);
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    throw new Error("Only http(s) URLs are supported");
  }
  const host = target.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "::1" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^fd[0-9a-f]{2}:/i.test(host) ||
    /^fe80:/i.test(host)
  ) {
    throw new Error("Private or local hosts are not allowed");
  }
}

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

export async function runDealerSyncForUser(dealerId: string, source: "manual" | "admin" | "cron" = "manual") {
  const { data: dealer } = await (supabaseAdmin as any)
    .from("dealer_profiles")
    .select("external_feed_url, external_feed_method, external_feed_body")
    .eq("id", dealerId)
    .maybeSingle();

  const dealerRow = dealer as {
    external_feed_url?: string | null;
    external_feed_method?: string | null;
    external_feed_body?: string | null;
  } | null;
  if (!dealerRow?.external_feed_url) {
    throw new Error("No sync URL configured.");
  }

  const { data: logRow } = await supabaseAdmin
    .from("sync_logs")
    .insert({ dealer_id: dealerId, status: "running", source })
    .select("id")
    .single();
  const logId = logRow!.id;

  try {
    assertSafeFeedUrl(dealerRow.external_feed_url);
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
    const rawText = await res.text();
    if (rawText.length > 10 * 1024 * 1024) {
      throw new Error("Feed too large (>10 MB)");
    }
    // Detect format defensively: many dealer inventory systems (Kodllin and
    // similar) return JSON with content-type: text/html or text/plain. Sniff
    // the body if the header is unhelpful.
    const trimmed = rawText.trimStart();
    const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    const isJson = contentType.includes("json") || (contentType.includes("text") && looksLikeJson) || looksLikeJson;

    let rows: Array<Record<string, unknown>> = [];
    if (isJson) {
      let data: unknown;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(
          `Feed body looked like JSON but failed to parse: ${(parseErr as Error).message}`,
        );
      }
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        (data as any).success === false
      ) {
        const msg = (data as any).message || "Feed returned success:false";
        throw new Error(
          `Feed API error: "${msg}". This usually means the API key has expired or the endpoint has changed. Please ask the dealer to check their inventory system and provide a new feed URL.`,
        );
      }
      rows = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.stones) ? (data as any).stones
        : Array.isArray((data as any)?.data) ? (data as any).data
        : Array.isArray((data as any)?.result) ? (data as any).result
        : Array.isArray((data as any)?.items) ? (data as any).items
        : Array.isArray((data as any)?.results) ? (data as any).results
        : [];
      if (rows.length === 0) {
        // Don't silently report "0 stones imported" when the JSON wrapper
        // is unrecognised. Surface a clear error to the dealer.
        const topKeys =
          data && typeof data === "object" && !Array.isArray(data)
            ? Object.keys(data as Record<string, unknown>).slice(0, 6).join(", ")
            : "(non-object)";
        throw new Error(
          `Feed JSON parsed but no array of stones found. Top-level keys: [${topKeys}]. Expected an array, or an object with a "stones"/"data"/"results"/"items" property.`,
        );
      }
    } else {
      rows = parseCsv(rawText);
      if (rows.length === 0) {
        throw new Error(
          "Feed appeared to be CSV but no rows were parsed. Check that the feed has a header row and at least one data row.",
        );
      }
    }

    if (rows.length === 0) throw new Error("Feed returned 0 rows.");

    const preset = detectPreset(rows);

    // Fetch all existing stones for this dealer so we can diff create vs update.
    const { data: existing } = await supabaseAdmin
      .from("stones")
      .select("id, cert_number")
      .eq("dealer_id", dealerId);
    const certToId = new Map<string, string>();
    for (const s of existing ?? []) {
      if (s.cert_number) certToId.set(s.cert_number, s.id);
    }

    // Numeric fields that often arrive as strings from JSON feeds.
    const NUMERIC_FIELDS = new Set([
      "carat_weight", "wholesale_price_usd", "depth_pct", "table_pct",
      "crown_angle", "pavilion_angle", "measurements_length", "measurements_width",
      "measurements_height", "lw_ratio",
    ]);

    const errors: Array<{ row: number; field: string; message: string }> = [];
    const toCreate: Array<{ data: Record<string, unknown>; image_url?: string }> = [];
    const toUpdate: Array<{ id: string; data: Record<string, unknown>; image_url?: string }> = [];
    const seenCerts = new Set<string>();
    let cityFromFeed: string | undefined;

    rows.forEach((raw, idx) => {
      const mapped = mapRow(raw as Record<string, unknown>, preset);
      if (!cityFromFeed && mapped.city) cityFromFeed = mapped.city;
      const rawPayload = mapped.stone;
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawPayload)) {
        const fieldDef = FIELD_MAP[k];
        let coerced = fieldDef && fieldDef.type === "string" ? normaliseValue(fieldDef, v) : v;
        // Many JSON feeds send numeric values as strings (e.g. "61.00"). Coerce them.
        if (NUMERIC_FIELDS.has(k) && coerced !== null && coerced !== undefined && coerced !== "") {
          const n = parseFloat(String(coerced));
          coerced = isNaN(n) ? null : n;
        }
        payload[k] = coerced;
      }

      // If cert_number is missing, try the stockNo from the raw row as a fallback
      // identifier. This prevents rows without certs from endlessly duplicating.
      if (!payload.cert_number && (raw as any).stockNo) {
        payload.cert_number = String((raw as any).stockNo).trim();
      }

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
      else toCreate.push({ data: { ...result.data, dealer_id: dealerId }, image_url: mapped.image_url });
    });

    // Chunk size: 250 rows — safely within Cloudflare Worker memory limits.
    const CHUNK = 250;
    let created = 0;
    let updated = 0;
    const createdImageRows: Array<{ stone_id: string; storage_url: string; external_image_url: string; is_primary: boolean; sort_order: number }> = [];

    // Chunked inserts
    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const chunk = toCreate.slice(i, i + CHUNK);
      const { data, error } = await supabaseAdmin
        .from("stones")
        .insert(chunk.map((c) => c.data) as never)
        .select("id");
      if (error) throw new Error(`Insert failed at row ${i}: ${error.message}`);
      created += data?.length ?? 0;
      (data ?? []).forEach((row: any, j: number) => {
        const img = chunk[j]?.image_url;
        if (img) createdImageRows.push({ stone_id: row.id, storage_url: img, external_image_url: img, is_primary: true, sort_order: 0 });
      });
    }

    if (createdImageRows.length) {
      await supabaseAdmin.from("stone_images").insert(createdImageRows as never);
    }

    // Chunked updates — batch concurrently within each chunk instead of one-at-a-time.
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      const chunk = toUpdate.slice(i, i + CHUNK);
      const results = await Promise.allSettled(
        chunk.map((u) =>
          supabaseAdmin.from("stones").update(u.data as never).eq("id", u.id).eq("dealer_id", dealerId)
        )
      );
      results.forEach((r, j) => {
        if (r.status === "fulfilled" && (r.value as any).error) {
          errors.push({ row: i + j, field: "_update", message: (r.value as any).error.message });
        } else if (r.status === "fulfilled") {
          updated += 1;
        }
      });
    }

    let markedInactive = 0;
    if (seenCerts.size && existing && existing.length) {
      const inactiveIds = (existing ?? []).filter((s) => s.cert_number && !seenCerts.has(s.cert_number)).map((s) => s.id);
      if (inactiveIds.length) {
        const { error } = await supabaseAdmin.from("stones").update({ feed_inactive: true }).in("id", inactiveIds).eq("dealer_id", dealerId);
        if (!error) markedInactive = inactiveIds.length;
      }
    }

    await supabaseAdmin.from("sync_logs").update({
      status: errors.length ? "partial" : "success",
      finished_at: new Date().toISOString(),
      stones_added: created,
      stones_updated: updated,
      stones_marked_inactive: markedInactive,
      errors: errors.slice(0, 50),
    }).eq("id", logId);

    await supabaseAdmin.from("dealer_profiles").update({ last_synced_at: new Date().toISOString() }).eq("id", dealerId);

    if (cityFromFeed) {
      await supabaseAdmin.from("profiles").update({ city: cityFromFeed } as never).eq("id", dealerId).is("city", null);
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
    await supabaseAdmin.from("sync_logs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      errors: [{ row: -1, field: "_fetch", message }],
    }).eq("id", logId);
    throw new Error(message);
  }
}