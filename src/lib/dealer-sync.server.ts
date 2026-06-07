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
const MAX_EXTERNAL_FEED_BYTES = 50 * 1024 * 1024;

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
  needsLegacyIdentityBackfill: boolean;
};

type ExistingSyncRow = {
  id: string;
  cert_number?: string | null;
  external_sync_key?: string | null;
  source_stock_no?: string | null;
};

function isMissingImportIdentityColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string } | null;
  const text = `${err?.message ?? ""} ${err?.details ?? ""} ${err?.hint ?? ""}`;
  return err?.code === "42703" || err?.code === "PGRST204" || /external_source|external_sync_key|source_stock_no|raw_import_row|last_imported_at|schema cache/i.test(text);
}

function summarizeDiagnostics(errors: SyncDiagnostic[]): SyncDiagnostic[] {
  if (!errors.length) return [];

  const byCode = new Map<string, number>();
  const byField = new Map<string, number>();
  for (const error of errors) {
    byCode.set(error.pgCode ?? "validation", (byCode.get(error.pgCode ?? "validation") ?? 0) + 1);
    byField.set(error.field ?? "_sync", (byField.get(error.field ?? "_sync") ?? 0) + 1);
  }

  const codeText = Array.from(byCode.entries())
    .map(([code, count]) => `${code}: ${count}`)
    .join(", ");
  const fieldText = Array.from(byField.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([field, count]) => `${field}: ${count}`)
    .join(", ");

  const suggestions = new Set<string>();
  if (byCode.has("42P10")) {
    suggestions.add("Database unique-index mismatch detected. Apply the API identity migrations and reload Supabase schema cache. Patch47 also avoids this by writing rows manually instead of relying on ON CONFLICT.");
  }
  if (byCode.has("23502")) {
    suggestions.add("A required database column received null. Check the listed field and add a safe default in the mapper.");
  }
  if (byCode.has("23505")) {
    suggestions.add("Duplicate key detected. Check private sync keys and existing duplicate rows for this dealer.");
  }
  if (byCode.has("22P02")) {
    suggestions.add("A value could not be cast to the database type. Check the listed raw value and mapping translation.");
  }

  return [
    diagnostic("error", `Sync finished with ${errors.length} failed event${errors.length === 1 ? "" : "s"}. Error codes: ${codeText || "none"}. Top fields: ${fieldText || "none"}.`, {
      field: "_summary",
    }),
    ...Array.from(suggestions).map((message) => diagnostic("warning", message, {
      field: "_suggestion",
    })),
  ];
}

function syncOutcomeDiagnostics({
  candidates,
  existing,
  created,
  updated,
  markedInactive,
  usedPrivateIdentity,
}: {
  candidates: number;
  existing: number;
  created: number;
  updated: number;
  markedInactive: number;
  usedPrivateIdentity: boolean;
}): SyncDiagnostic[] {
  const diagnostics: SyncDiagnostic[] = [
    diagnostic("success", `Sync write summary: ${created} new, ${updated} updated, ${markedInactive} marked inactive from ${candidates} feed rows.`, {
      field: "_summary",
    }),
  ];

  if (existing === 0 && created > 0) {
    diagnostics.push(diagnostic("info", "Chaos found no existing stones for this dealer before writing, so this run was treated as a fresh rebuild. That is expected immediately after using Clear Imported Inventory. On the next sync, these same rows should mostly show as updated rather than new.", {
      field: "_summary",
    }));
  } else if (existing > 0 && updated > created) {
    diagnostics.push(diagnostic("success", "Healthy repeat sync pattern: most feed rows matched existing stones and were updated instead of duplicated.", {
      field: "_summary",
    }));
  } else if (existing > 0 && created > updated && created > candidates * 0.25) {
    diagnostics.push(diagnostic("warning", "This sync created many new rows even though existing stones were loaded. If this was not expected new stock, check whether the dealer changed certificate/stock numbers or whether older rows were imported under a different dealer account.", {
      field: "_summary",
    }));
  }

  if (!usedPrivateIdentity) {
    diagnostics.push(diagnostic("info", "Private API identity columns are still not visible to the live Supabase schema cache, so Chaos used legacy certificate/stock-key matching. The run can still be safe, but applying the API identity SQL migrations will make future sync matching cleaner.", {
      field: "external_sync_key",
    }));
  }

  return diagnostics;
}

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

function certRef(raw: Record<string, unknown>, payload: Record<string, unknown>): string | null {
  return (
    cleanString(payload.cert_number) ??
    cleanString(raw.reportNo) ??
    cleanString(raw.report_no) ??
    cleanString(raw.reportNumber) ??
    cleanString(raw.certNo) ??
    cleanString(raw.certNumber) ??
    cleanString(raw.certificateNo) ??
    cleanString(raw.certificateNumber)
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

async function fetchExistingSyncRows(
  dealerId: string,
  diagnostics: SyncDiagnostic[],
): Promise<{ rows: ExistingSyncRow[]; useImportIdentityColumns: boolean }> {
  const rows: ExistingSyncRow[] = [];
  const pageSize = 1000;
  let useImportIdentityColumns = true;

  for (let from = 0; ; from += pageSize) {
    const page = await supabaseAdmin
      .from("stones")
      .select("id, cert_number, external_source, external_sync_key, source_stock_no, last_imported_at, raw_import_row")
      .eq("dealer_id", dealerId)
      .range(from, from + pageSize - 1);

    if (page.error && isMissingImportIdentityColumn(page.error)) {
      useImportIdentityColumns = false;
      diagnostics.push(diagnostic("info", "Live Supabase schema cache is missing one or more private API sync columns. Chaos will use legacy certificate/stock-key matching for this run. Apply the latest API identity SQL migration when convenient so future syncs can use the cleaner private-key path.", {
        field: "external_sync_key",
      }));
      break;
    }
    if (page.error) throw new Error(page.error.message);

    const data = (page.data ?? []) as ExistingSyncRow[];
    rows.push(...data);
    if (data.length < pageSize) {
      return { rows, useImportIdentityColumns };
    }
  }

  rows.length = 0;
  for (let from = 0; ; from += pageSize) {
    const page = await supabaseAdmin
      .from("stones")
      .select("id, cert_number")
      .eq("dealer_id", dealerId)
      .range(from, from + pageSize - 1);

    if (page.error) throw new Error(page.error.message);
    const data = (page.data ?? []) as ExistingSyncRow[];
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return { rows, useImportIdentityColumns };
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
    if (rawText.length > MAX_EXTERNAL_FEED_BYTES) {
      throw new Error("Feed too large for one-shot sync (>50 MB). Ask the dealer for a paginated feed or a smaller filtered endpoint.");
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
    // This is deliberately paginated: Supabase/PostgREST commonly returns only
    // the first 1,000 rows unless ranges are requested, which would otherwise
    // make the second Nancy sync create duplicates after the first page.
    const existingResult = await fetchExistingSyncRows(dealerId, diagnostics);
    const useImportIdentityColumns = existingResult.useImportIdentityColumns;
    const existing = existingResult.rows;
    diagnostics.push(diagnostic("info", `Loaded ${existing.length} existing dealer stones for sync matching before writing.`, {
      field: "_prepare",
    }));
    const syncKeyToId = new Map<string, string>();
    const externalKeyById = new Map<string, string>();
    for (const s of existing ?? []) {
      if (useImportIdentityColumns && s.external_sync_key) {
        syncKeyToId.set(s.external_sync_key, s.id);
        externalKeyById.set(s.id, s.external_sync_key);
      }
      if (s.cert_number && !syncKeyToId.has(s.cert_number)) syncKeyToId.set(s.cert_number, s.id);
      if (s.source_stock_no) {
        const stockKey = `stock:${s.source_stock_no}`;
        if (!syncKeyToId.has(stockKey)) syncKeyToId.set(stockKey, s.id);
      }
    }

    // Numeric fields that often arrive as strings from JSON feeds.
    const NUMERIC_FIELDS = new Set([
      "carat_weight", "wholesale_price_usd", "depth_pct", "table_pct",
      "crown_angle", "pavilion_angle", "measurements_length", "measurements_width",
      "measurements_height", "lw_ratio",
    ]);

    const errors: SyncDiagnostic[] = [];
    const candidatesBySyncKey = new Map<string, SyncCandidate>();
    const seenSyncKeys = new Set<string>();
    let cityFromFeed: string | undefined;
    let missingCertFallbackCount = 0;

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
        let coerced = fieldDef ? normaliseValue(fieldDef, v) : v;
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

      const originalCert = certRef(sourceRow, payload);
      const syncKey = originalCert ?? (stockNo ? `stock:${stockNo}` : `feed-row:${rowNumber}`);
      if (!originalCert) {
        const fallback = stockNo ? `stock:${stockNo}` : `feed-row:${rowNumber}`;
        missingCertFallbackCount += 1;
        if (missingCertFallbackCount <= 20) {
          diagnostics.push(diagnostic("info", `Nancy/Kodllin did not provide a report number for this stone. Chaos used "${fallback}" as the sync key, so the stone can still update safely on future syncs.`, {
            row: rowNumber,
            stockNo,
            certNumber: fallback,
            field: "cert_number",
          }));
        }
      }

      payload.cert_number = useImportIdentityColumns ? (originalCert ?? null) : syncKey;

      if (syncKey) seenSyncKeys.add(syncKey);

      const existingId = syncKey ? syncKeyToId.get(syncKey) : undefined;
      const mode = existingId ? "update" : "create";
      const result = validateStonePayload(payload, mode);
      if (!result.ok) {
        result.errors.forEach((e) => errors.push(diagnostic("error", e.message, {
          row: rowNumber,
          stockNo,
          certNumber: syncKey,
          field: e.field,
        })));
        return;
      }

      const previous = candidatesBySyncKey.get(syncKey);
      if (previous) {
        diagnostics.push(diagnostic("warning", `Duplicate sync key also appeared at row ${previous.sourceIndex + 1}. Using the later row and skipping the earlier duplicate to avoid an ON CONFLICT failure.`, {
          row: rowNumber,
          stockNo,
          certNumber: syncKey,
          field: useImportIdentityColumns ? "external_sync_key" : "cert_number",
        }));
      }

      candidatesBySyncKey.set(syncKey, {
        sourceIndex: idx,
        stockNo,
        certNumber: syncKey,
        data: {
          ...result.data,
          dealer_id: dealerId,
          status: result.data.status ?? "available",
          is_test: false,
          feed_inactive: false,
          has_video: result.data.has_video ?? false,
          has_360: result.data.has_360 ?? false,
          matching_pair: result.data.matching_pair ?? false,
          bulk_pricing_available: result.data.bulk_pricing_available ?? false,
          available_qty: result.data.available_qty ?? 1,
          minimum_order_qty: result.data.minimum_order_qty ?? 1,
          listing_type: result.data.listing_type ?? "single",
          price_currency: result.data.price_currency ?? "USD",
          ...(useImportIdentityColumns
            ? {
                cert_number: originalCert ?? null,
                external_source: preset?.id ?? "external_feed",
                external_sync_key: syncKey,
                source_stock_no: stockNo,
                last_imported_at: new Date().toISOString(),
                raw_import_row: sourceRow,
              }
            : { cert_number: syncKey }),
        },
        image_url: mapped.image_url,
        existedBefore: !!existingId,
        needsLegacyIdentityBackfill: useImportIdentityColumns && !!existingId && externalKeyById.get(existingId) !== syncKey,
      });
    });

    const candidates = Array.from(candidatesBySyncKey.values());
    if (missingCertFallbackCount > 20) {
      diagnostics.push(diagnostic("info", `${missingCertFallbackCount} stones had no Nancy/Kodllin report number, so Chaos used stock numbers as safe sync keys. This is expected for this feed and is not an import error. Showing the first 20 examples only to keep the log readable.`, {
        field: "cert_number",
      }));
    }
    let created = 0;
    let updated = 0;
    const createdImageRows: Array<{ stone_id: string; storage_url: string; external_image_url: string; is_primary: boolean; sort_order: number }> = [];

    diagnostics.unshift(diagnostic("info", `Prepared ${candidates.length} valid unique rows from ${rows.length} feed rows. Saving database changes in batches of ${SYNC_BATCH_SIZE}.`, {
      field: "_prepare",
    }));

    if (useImportIdentityColumns) {
      const legacyBackfills = candidates.filter((candidate) => candidate.needsLegacyIdentityBackfill);
      if (legacyBackfills.length) {
        diagnostics.push(diagnostic("info", `Linking ${legacyBackfills.length} existing legacy API rows to their private sync keys before upsert. This prevents duplicate stones after older patches that synced by public cert_number only.`, {
          field: "external_sync_key",
        }));
      }
      for (const candidate of legacyBackfills) {
        const existingId = syncKeyToId.get(candidate.certNumber);
        if (!existingId) continue;
        const { error } = await supabaseAdmin
          .from("stones")
          .update({
            external_source: preset?.id ?? "external_feed",
            external_sync_key: candidate.certNumber,
            source_stock_no: candidate.stockNo,
            last_imported_at: new Date().toISOString(),
          } as never)
          .eq("dealer_id", dealerId)
          .eq("id", existingId);
        if (error) {
          errors.push(postgresDiagnostic("Could not link an existing legacy API row to its private sync key", error, {
            row: candidate.sourceIndex + 1,
            stockNo: candidate.stockNo,
            certNumber: candidate.certNumber,
            field: "external_sync_key",
          }));
        }
      }
    }

    diagnostics.push(diagnostic("info", "Patch47 sync engine is using manual identity matching: update by existing database id when possible, otherwise insert a new stone. This avoids Postgres ON CONFLICT/index errors such as 42P10 while the Supabase schema catches up.", {
      field: "_write",
    }));

    for (let i = 0; i < candidates.length; i += SYNC_BATCH_SIZE) {
      const chunk = candidates.slice(i, i + SYNC_BATCH_SIZE);
      const batchNumber = Math.floor(i / SYNC_BATCH_SIZE) + 1;

      let batchCreated = 0;
      let batchUpdated = 0;

      for (const candidate of chunk) {
        const existingId = syncKeyToId.get(candidate.certNumber);
        if (existingId) {
          const { error } = await supabaseAdmin
            .from("stones")
            .update(candidate.data as never)
            .eq("dealer_id", dealerId)
            .eq("id", existingId);

          if (error) {
            errors.push(postgresDiagnostic("Row failed while updating the existing matched stone", error, {
              row: candidate.sourceIndex + 1,
              batch: batchNumber,
              stockNo: candidate.stockNo,
              certNumber: candidate.certNumber,
              field: "_write",
            }));
            continue;
          }
          updated += 1;
          batchUpdated += 1;
          continue;
        }

        const { data: inserted, error } = await supabaseAdmin
          .from("stones")
          .insert(candidate.data as never)
          .select("id")
          .single();

        if (error) {
          errors.push(postgresDiagnostic("Row failed while inserting a new matched stone", error, {
            row: candidate.sourceIndex + 1,
            batch: batchNumber,
            stockNo: candidate.stockNo,
            certNumber: candidate.certNumber,
            field: "_write",
          }));
          continue;
        }

        created += 1;
        batchCreated += 1;
        if (inserted?.id) syncKeyToId.set(candidate.certNumber, inserted.id);
        if (candidate.image_url && inserted?.id) {
          createdImageRows.push({
            stone_id: inserted.id,
            storage_url: candidate.image_url,
            external_image_url: candidate.image_url,
            is_primary: true,
            sort_order: 0,
          });
        }
      }

      diagnostics.push(diagnostic("success", `Batch ${batchNumber} saved ${batchCreated + batchUpdated}/${chunk.length} rows: ${batchCreated} new, ${batchUpdated} updated.`, {
        batch: batchNumber,
        field: "_write",
      }));
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
    if (seenSyncKeys.size && existing && existing.length) {
      const inactiveIds = (existing ?? []).filter((s) => {
        const key = useImportIdentityColumns ? (s.external_sync_key ?? (s.source_stock_no ? `stock:${s.source_stock_no}` : s.cert_number)) : s.cert_number;
        return key && !seenSyncKeys.has(key);
      }).map((s) => s.id);
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

    const allDiagnostics = [
      ...diagnostics,
      ...syncOutcomeDiagnostics({
        candidates: candidates.length,
        existing: existing.length,
        created,
        updated,
        markedInactive,
        usedPrivateIdentity: useImportIdentityColumns,
      }),
      ...summarizeDiagnostics(errors),
      ...errors,
    ];
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
