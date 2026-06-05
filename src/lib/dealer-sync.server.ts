// Server-only helper: runs the dealer feed sync for an arbitrary dealer id.
// Used by both the dealer-self trigger (runDealerSync) and the admin trigger
// (adminRunDealerSyncFor). Logic copied verbatim from the original
// runDealerSync handler — same behaviour, just parameterised on dealerId.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateStonePayload } from "@/lib/dealer-api-validate";
import { detectPreset, mapRow } from "@/lib/dealer-feed-mappings";
import { normaliseValue, FIELD_MAP } from "@/lib/import-fields";

const SYNC_BATCH_SIZE = 200;
const MAX_STORED_DIAGNOSTICS = 250;

type SyncDiagnosticLevel = "info" | "success" | "warning" | "error";

export type SyncDiagnostic = {
  level: SyncDiagnosticLevel;
  row: number | null;
  batch: number | null;
  stockNo: string | null;
  certNumber: string | null;
  field: string;
  message: string;
  rawValue?: string | null;
  pgCode?: string | null;
  details?: string | null;
  hint?: string | null;
};

type SyncCandidate = {
  sourceIndex: number;
  stockNo: string | null;
  certNumber: string;
  data: Record<string, unknown>;
  image_url?: string;
  existedBefore: boolean;
};

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

function cleanString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  return cleaned ? cleaned : null;
}

function stockRef(raw: Record<string, unknown>): string | null {
  return (
    cleanString(raw.stockNo) ??
    cleanString(raw.stock_no) ??
    cleanString(raw.stockNumber) ??
    cleanString(raw.sku) ??
    cleanString(raw.ref) ??
    cleanString(raw.id)
  );
}

function diagnostic(
  level: SyncDiagnosticLevel,
  message: string,
  opts: Partial<SyncDiagnostic> = {},
): SyncDiagnostic {
  return {
    level,
    row: opts.row ?? null,
    batch: opts.batch ?? null,
    stockNo: opts.stockNo ?? null,
    certNumber: opts.certNumber ?? null,
    field: opts.field ?? "_sync",
    message,
    rawValue: opts.rawValue,
    pgCode: opts.pgCode,
    details: opts.details,
    hint: opts.hint,
  };
}

function postgresDiagnostic(
  message: string,
  error: unknown,
  opts: Partial<SyncDiagnostic> = {},
): SyncDiagnostic {
  const err = error as { message?: string; code?: string; details?: string; hint?: string };
  return diagnostic("error", `${message}: ${err?.message ?? "Unknown database error"}`, {
    ...opts,
    pgCode: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  });
}

function publicErrorText(d: SyncDiagnostic): string {
  const parts = [
    d.batch ? `Batch ${d.batch}` : null,
    d.row ? `Row ${d.row}` : null,
    d.stockNo ? `StockNo: ${d.stockNo}` : null,
    d.certNumber ? `Key: ${d.certNumber}` : null,
  ].filter(Boolean);
  return `${parts.length ? `${parts.join(" / ")} - ` : ""}${d.message}`;
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
      headers: {
        // Use the same User-Agent as the test function — some API gateways
        // reject requests without one (returning 405 or 403).
        "User-Agent": "Chaos-Feed-Importer/1.0",
        Accept: "application/json, text/csv, */*;q=0.5",
      },
      redirect: "follow",
    };
    if (method === "POST" && dealerRow.external_feed_body) {
      (init.headers as Record<string, string>)["Content-Type"] = "application/json";
      init.body = dealerRow.external_feed_body;
    }
    const res = await fetch(dealerRow.external_feed_url, init);
    if (!res.ok) {
      throw new Error(
        `Source returned HTTP ${res.status} when Chaos tried ${method} ${dealerRow.external_feed_url}. HTTP 405 usually means the feed only accepts a different request method, for example POST instead of GET. Save the sync settings, then try again.`,
      );
    }

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

    const diagnostics: SyncDiagnostic[] = [];

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

    const errors: SyncDiagnostic[] = [];
    const candidatesByCert = new Map<string, SyncCandidate>();
    const seenCerts = new Set<string>();
    let cityFromFeed: string | undefined;

    rows.forEach((raw, idx) => {
      const sourceRow = raw as Record<string, unknown>;
      const rowNumber = idx + 1;
      const stockNo = stockRef(sourceRow);
      const mapped = mapRow(sourceRow, preset);
      if (!cityFromFeed && mapped.city) cityFromFeed = mapped.city;
      const rawPayload = mapped.stone;
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawPayload)) {
        const fieldDef = FIELD_MAP[k];
        let coerced = fieldDef && fieldDef.type === "string" ? normaliseValue(fieldDef, v) : v;
        if (NUMERIC_FIELDS.has(k) && coerced !== null && coerced !== undefined && coerced !== "") {
          const numericText = String(coerced).replace(/,/g, "").trim();
          const n = parseFloat(numericText);
          if (!Number.isFinite(n)) {
            errors.push(diagnostic("error", `Invalid numeric value "${String(coerced)}" for ${k}. This row was skipped before reaching the database.`, {
              row: rowNumber,
              stockNo,
              field: k,
              rawValue: String(coerced),
            }));
            return;
          }
          coerced = n;
        }
        payload[k] = coerced;
      }

      const originalCert = cleanString(payload.cert_number);
      if (!originalCert) {
        const fallback = stockNo ? `stock:${stockNo}` : `feed-row:${rowNumber}`;
        payload.cert_number = fallback;
        diagnostics.push(diagnostic("warning", `Missing report/cert number. Using "${fallback}" as the sync key so the row can still be safely upserted.`, {
          row: rowNumber,
          stockNo,
          certNumber: fallback,
          field: "cert_number",
        }));
      } else {
        payload.cert_number = originalCert;
      }

      const cert = String(payload.cert_number).trim();
      if (cert) seenCerts.add(cert);

      const existingId = cert ? certToId.get(cert) : undefined;
      const mode = existingId ? "update" : "create";
      const result = validateStonePayload(payload, mode);
      if (!result.ok) {
        result.errors.forEach((e) => errors.push(diagnostic("error", e.message, {
          row: rowNumber,
          stockNo,
          certNumber: cert,
          field: e.field,
        })));
        return;
      }

      const previous = candidatesByCert.get(cert);
      if (previous) {
        diagnostics.push(diagnostic("warning", `Duplicate sync key also appeared at row ${previous.sourceIndex + 1}. Using the later row and skipping the earlier duplicate to avoid an ON CONFLICT failure.`, {
          row: rowNumber,
          stockNo,
          certNumber: cert,
          field: "cert_number",
        }));
      }

      candidatesByCert.set(cert, {
        sourceIndex: idx,
        stockNo,
        certNumber: cert,
        data: {
          ...result.data,
          dealer_id: dealerId,
          cert_number: cert,
          feed_inactive: false,
        },
        image_url: mapped.image_url,
        existedBefore: !!existingId,
      });
    });

    const candidates = Array.from(candidatesByCert.values());
    let created = 0;
    let updated = 0;
    const createdImageRows: Array<{ stone_id: string; storage_url: string; external_image_url: string; is_primary: boolean; sort_order: number }> = [];

    diagnostics.unshift(diagnostic("info", `Prepared ${candidates.length} valid unique rows from ${rows.length} feed rows. Running database upserts in batches of ${SYNC_BATCH_SIZE}.`, {
      field: "_prepare",
    }));

    for (let i = 0; i < candidates.length; i += SYNC_BATCH_SIZE) {
      const chunk = candidates.slice(i, i + SYNC_BATCH_SIZE);
      const batchNumber = Math.floor(i / SYNC_BATCH_SIZE) + 1;
      const batchStartRow = chunk[0]?.sourceIndex + 1;
      const batchEndRow = chunk[chunk.length - 1]?.sourceIndex + 1;

      const { data, error } = await supabaseAdmin
        .from("stones")
        .upsert(chunk.map((c) => c.data) as never, { onConflict: "dealer_id,cert_number" })
        .select("id, cert_number");

      if (error) {
        errors.push(postgresDiagnostic(`Batch ${batchNumber} failed while upserting feed rows ${batchStartRow}-${batchEndRow}. Retrying this batch row-by-row to find the exact failing stone`, error, {
          batch: batchNumber,
          field: "_upsert",
        }));

        for (const candidate of chunk) {
          const { data: singleData, error: singleError } = await supabaseAdmin
            .from("stones")
            .upsert(candidate.data as never, { onConflict: "dealer_id,cert_number" })
            .select("id, cert_number")
            .single();

          if (singleError) {
            errors.push(postgresDiagnostic("Row failed during isolated retry", singleError, {
              row: candidate.sourceIndex + 1,
              batch: batchNumber,
              stockNo: candidate.stockNo,
              certNumber: candidate.certNumber,
              field: "_upsert",
            }));
            continue;
          }

          if (candidate.existedBefore) updated += 1;
          else created += 1;

          if (!candidate.existedBefore && candidate.image_url && singleData?.id) {
            createdImageRows.push({
              stone_id: singleData.id,
              storage_url: candidate.image_url,
              external_image_url: candidate.image_url,
              is_primary: true,
              sort_order: 0,
            });
          }
        }
      } else {
        for (const candidate of chunk) {
          if (candidate.existedBefore) updated += 1;
          else created += 1;
        }

        const idByCert = new Map<string, string>();
        for (const row of data ?? []) {
          if ((row as any).cert_number && (row as any).id) idByCert.set((row as any).cert_number, (row as any).id);
        }
        for (const candidate of chunk) {
          const id = idByCert.get(candidate.certNumber);
          if (!candidate.existedBefore && candidate.image_url && id) {
            createdImageRows.push({
              stone_id: id,
              storage_url: candidate.image_url,
              external_image_url: candidate.image_url,
              is_primary: true,
              sort_order: 0,
            });
          }
        }

        diagnostics.push(diagnostic("success", `Batch ${batchNumber} upserted ${chunk.length} rows successfully.`, {
          batch: batchNumber,
          field: "_upsert",
        }));
      }
    }

    if (createdImageRows.length) {
      const { error } = await supabaseAdmin.from("stone_images").insert(createdImageRows as never);
      if (error) {
        errors.push(postgresDiagnostic("Stone image insert failed after stone upsert. Stones were still synced, but some external images may not appear", error, {
          field: "_images",
        }));
      }
    }

    let markedInactive = 0;
    if (seenCerts.size && existing && existing.length) {
      const inactiveIds = (existing ?? []).filter((s) => s.cert_number && !seenCerts.has(s.cert_number)).map((s) => s.id);
      if (inactiveIds.length) {
        const { error } = await supabaseAdmin.from("stones").update({ feed_inactive: true }).in("id", inactiveIds).eq("dealer_id", dealerId);
        if (error) {
          errors.push(postgresDiagnostic("Could not mark missing feed rows inactive", error, {
            field: "_inactive",
          }));
        } else {
          markedInactive = inactiveIds.length;
        }
      }
    }

    const allDiagnostics = [...diagnostics, ...errors];
    await supabaseAdmin.from("sync_logs").update({
      status: errors.length ? "partial" : "success",
      finished_at: new Date().toISOString(),
      stones_added: created,
      stones_updated: updated,
      stones_marked_inactive: markedInactive,
      errors: allDiagnostics.slice(0, MAX_STORED_DIAGNOSTICS),
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
      diagnostics: allDiagnostics,
      preset: preset ? { id: preset.id, label: preset.label } : null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const failure = diagnostic("error", message, { field: "_fetch" });
    await supabaseAdmin.from("sync_logs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      errors: [failure],
    }).eq("id", logId);
    throw new Error(publicErrorText(failure));
  }
}
