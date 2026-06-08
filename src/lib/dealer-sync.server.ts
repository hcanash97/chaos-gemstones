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
  existingId?: string;
};

type ExistingStoneRef = {
  id: string;
  cert_number: string | null;
  external_sync_key?: string | null;
  source_stock_no?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
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
    cleanString(raw.stock_number) ??
    cleanString(raw.LotNo) ??
    cleanString(raw.lotNo) ??
    cleanString(raw.lot_number) ??
    cleanString(raw.LotNumber) ??
    cleanString(raw.lotNumber) ??
    cleanString(raw.RefNo) ??
    cleanString(raw.refNo) ??
    cleanString(raw.ref_number) ??
    cleanString(raw.StoneID) ??
    cleanString(raw.stoneId) ??
    cleanString(raw.stoneID) ??
    cleanString(raw.PacketNo) ??
    cleanString(raw.packetNo) ??
    cleanString(raw.SlipNo) ??
    cleanString(raw.slipNo) ??
    cleanString(raw["货号"]) ??
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
    cleanString(raw.report_number) ??
    cleanString(raw.ReportID) ??
    cleanString(raw.reportID) ??
    cleanString(raw.reportId) ??
    cleanString(raw.certNo) ??
    cleanString(raw.certNumber) ??
    cleanString(raw.cert_no) ??
    cleanString(raw.cert_number) ??
    cleanString(raw.CertiNo) ??
    cleanString(raw.certiNo) ??
    cleanString(raw.certi_no) ??
    cleanString(raw.LabNo) ??
    cleanString(raw.labNo) ??
    cleanString(raw.lab_no) ??
    cleanString(raw.certificateNo) ??
    cleanString(raw.certificateNumber) ??
    cleanString(raw.certificate_no) ??
    cleanString(raw.certificate_number) ??
    cleanString(raw["证书号"])
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

function boolDefault(value: unknown, fallback = false): boolean {
  if (value === true || value === false) return value;
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "y"].includes(String(value).trim().toLowerCase());
}

function numberDefault(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function withStoneDefaults(data: Record<string, unknown>): Record<string, unknown> {
  const videoUrl = cleanString(data.video_url);
  return {
    ...data,
    available_qty: numberDefault(data.available_qty, 1),
    minimum_order_qty: numberDefault(data.minimum_order_qty, 1),
    featured: boolDefault(data.featured),
    feed_inactive: boolDefault(data.feed_inactive),
    matching_pair: boolDefault(data.matching_pair),
    has_video: boolDefault(data.has_video, !!videoUrl),
    has_360: boolDefault(data.has_360),
    bulk_pricing_available: boolDefault(data.bulk_pricing_available),
    is_test: boolDefault(data.is_test),
    listing_type: cleanString(data.listing_type) ?? "single",
    price_currency: cleanString(data.price_currency) ?? "USD",
  };
}

function isMissingImportIdentityColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string } | null;
  const text = `${err?.message ?? ""} ${err?.details ?? ""} ${err?.hint ?? ""}`;
  return err?.code === "42703" || /external_sync_key|source_stock_no|schema cache/i.test(text);
}

async function fetchAllExistingDealerStones(dealerId: string): Promise<ExistingStoneRef[]> {
  const rows: ExistingStoneRef[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let { data, error } = await supabaseAdmin
      .from("stones")
      .select("id, cert_number, external_sync_key, source_stock_no, updated_at, created_at")
      .eq("dealer_id", dealerId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .range(from, from + pageSize - 1);

    if (error && isMissingImportIdentityColumn(error)) {
      const fallback = await supabaseAdmin
        .from("stones")
        .select("id, cert_number, updated_at, created_at")
        .eq("dealer_id", dealerId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1);
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (error) throw new Error(`Could not load existing inventory for duplicate detection: ${error.message}`);
    const page = (data ?? []) as ExistingStoneRef[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
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
    const res = await fetch(dealerRow.external_feed_url, {
      ...init,
      signal: AbortSignal.timeout(90_000), // 90s — large feeds on slow CDNs can take a while
    });
    if (!res.ok) {
      throw new Error(
        `Source returned HTTP ${res.status} when Chaos tried ${method} ${dealerRow.external_feed_url}. HTTP 405 usually means the feed only accepts a different request method, for example POST instead of GET. Save the sync settings, then try again.`,
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    const rawText = await res.text();
    if (rawText.length > 100 * 1024 * 1024) {
      throw new Error("Feed too large (>100 MB). Contact support if your inventory genuinely exceeds this.");
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

    const existing = await fetchAllExistingDealerStones(dealerId);
    const certToId = new Map<string, string>();
    const externalKeyToId = new Map<string, string>();
    const duplicateExistingIds: string[] = [];
    for (const s of existing) {
      const externalKey = cleanString(s.external_sync_key);
      if (externalKey && !externalKeyToId.has(externalKey)) {
        externalKeyToId.set(externalKey, s.id);
      }
      const cert = cleanString(s.cert_number);
      if (!cert) continue;
      if (certToId.has(cert)) {
        duplicateExistingIds.push(s.id);
      } else {
        certToId.set(cert, s.id);
      }
    }

    if (duplicateExistingIds.length) {
      for (let i = 0; i < duplicateExistingIds.length; i += SYNC_BATCH_SIZE) {
        const ids = duplicateExistingIds.slice(i, i + SYNC_BATCH_SIZE);
        const { error } = await supabaseAdmin
          .from("stones")
          .delete()
          .eq("dealer_id", dealerId)
          .in("id", ids);
        if (error) {
          diagnostics.push(postgresDiagnostic("Could not remove older duplicate rows before sync. Chaos will continue using the newest row for each sync key", error, {
            field: "_dedupe",
          }));
          break;
        }
      }
      diagnostics.push(diagnostic("warning", `Removed ${duplicateExistingIds.length} older duplicate row${duplicateExistingIds.length === 1 ? "" : "s"} before syncing.`, {
        field: "_dedupe",
      }));
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

      const originalCert = certRef(sourceRow, payload);
      if (!originalCert) {
        const fallback = stockNo ? `stock:${stockNo}` : `feed-row:${rowNumber}`;
        payload.cert_number = fallback;
        missingCertFallbackCount += 1;
        if (missingCertFallbackCount <= 20) {
          diagnostics.push(diagnostic("warning", `Nancy/Kodllin did not provide a value in its report number fields for this stone. Chaos used "${fallback}" as the private sync key. The stone can still import, but the public certificate/report number will be blank unless Nancy provides one.`, {
            row: rowNumber,
            stockNo,
            certNumber: fallback,
            field: "cert_number",
          }));
        }
      } else {
        payload.cert_number = originalCert;
      }

      const cert = String(payload.cert_number).trim();
      const externalSyncKey = originalCert ? `cert:${cert}` : cert;
      if (cert) seenCerts.add(cert);

      const existingId = externalKeyToId.get(externalSyncKey) ?? (cert ? certToId.get(cert) : undefined);
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
        data: withStoneDefaults({
          ...result.data,
          dealer_id: dealerId,
          cert_number: cert,
          external_source: preset?.id ?? "custom_feed",
          source_stock_no: stockNo,
          external_sync_key: externalSyncKey,
          last_imported_at: new Date().toISOString(),
          raw_import_row: sourceRow,
          feed_inactive: false,
        }),
        image_url: mapped.image_url,
        existedBefore: !!existingId,
        existingId,
      });
    });

    const candidates = Array.from(candidatesByCert.values());
    if (missingCertFallbackCount > 20) {
      diagnostics.push(diagnostic("warning", `${missingCertFallbackCount} stones had no Nancy/Kodllin report number, so Chaos used stock numbers as private sync keys. Showing the first 20 examples only to keep this log readable.`, {
        field: "cert_number",
      }));
    }
    let created = 0;
    let updated = 0;
    // Collects image rows for both new AND updated stones.
    // Written after all stone upserts complete.
    const imageRowsToUpsert: Array<{
      stone_id: string;
      storage_url: string;
      external_image_url: string;
      is_primary: boolean;
      sort_order: number;
    }> = [];

    diagnostics.unshift(diagnostic("info", `Prepared ${candidates.length} valid unique rows from ${rows.length} feed rows. Saving database changes in batches of ${SYNC_BATCH_SIZE}.`, {
      field: "_prepare",
    }));

    for (let i = 0; i < candidates.length; i += SYNC_BATCH_SIZE) {
      const chunk = candidates.slice(i, i + SYNC_BATCH_SIZE);
      const batchNumber = Math.floor(i / SYNC_BATCH_SIZE) + 1;
      // ── Batch upsert (insert new + update existing in one operation) ─────────
      // Using onConflict: "dealer_id,cert_number" against the unique index
      // stones_dealer_cert_number_unique_idx — this replaces the previous
      // approach of individual .update() calls per stone (7178 roundtrips → 36).
      // Stones without a cert_number are INSERT-only (they can't conflict on cert).
      const toCreate = chunk.filter((c) => !c.existedBefore);
      const toUpdate = chunk.filter((c) => c.existedBefore);

      // Upsert all stones that have a cert_number (can use the unique index)
      const certRows = [
        ...toCreate.filter((c) => !!c.data.cert_number),
        ...toUpdate.filter((c) => !!c.data.cert_number && c.existingId),
      ].map((c) => ({ ...c.data, dealer_id: dealerId }));

      if (certRows.length) {
        const { error: upsertErr } = await supabaseAdmin
          .from("stones")
          .upsert(certRows as never, {
            onConflict: "dealer_id,cert_number",
            ignoreDuplicates: false,
          });
        if (upsertErr) {
          errors.push(postgresDiagnostic(
            `Batch upsert failed for ${certRows.length} stones with cert numbers`,
            upsertErr, { batch: batchNumber, field: "_upsert" },
          ));
        } else {
          // We can't distinguish created vs updated from a batch upsert.
          // Approximate: existedBefore flag from our pre-sync fetch.
          const upsertCreated = certRows.filter((r) =>
            !toUpdate.find((c) => c.data.cert_number === (r as any).cert_number),
          ).length;
          created += upsertCreated;
          updated += certRows.length - upsertCreated;
        }
      }

      // Insert-only stones without cert numbers (no conflict key available)
      const noCertCreates = toCreate.filter((c) => !c.data.cert_number);
      if (noCertCreates.length) {
        const { error: insertErr } = await supabaseAdmin
          .from("stones")
          .insert(noCertCreates.map((c) => ({ ...c.data, dealer_id: dealerId })) as never);
        if (insertErr) {
          errors.push(postgresDiagnostic(
            `Insert failed for ${noCertCreates.length} stones without cert numbers`,
            insertErr, { batch: batchNumber, field: "_insert_nocert" },
          ));
        } else {
          created += noCertCreates.length;
        }
      }

      // Update-only stones without cert numbers (fall back to individual updates —
      // these are rare, typically only on the very first sync of uncertified stones)
      const noCertUpdates = toUpdate.filter((c) => !c.data.cert_number && c.existingId);
      for (const candidate of noCertUpdates) {
        const { error } = await supabaseAdmin
          .from("stones")
          .update(candidate.data as never)
          .eq("id", candidate.existingId!)
          .eq("dealer_id", dealerId);
        if (error) {
          errors.push(postgresDiagnostic("Row failed while updating uncertified stone", error, {
            row: candidate.sourceIndex + 1, batch: batchNumber,
            stockNo: candidate.stockNo, field: "_update_nocert",
          }));
        } else {
          updated += 1;
        }
      }

      // ── Collect image rows for all stones in this chunk ───────────────────
      // After upsert we need the stone IDs. For cert-number stones, look them up
      // from the pre-built certToId map (updated stones) or fetch new IDs in batch.
      // For now, queue images for existing stones (existingId is known) and new
      // cert stones (fetch their IDs after upsert in a single query below).
      for (const candidate of [...toCreate, ...toUpdate]) {
        const id = candidate.existingId ?? null;
        if (candidate.image_url && id) {
          imageRowsToUpsert.push({
            stone_id: id,
            storage_url: candidate.image_url,
            external_image_url: candidate.image_url,
            is_primary: true,
            sort_order: 0,
          });
        }
      }

      // Fetch IDs for newly created cert stones so we can write their images
      const newCertStones = toCreate.filter((c) => !!c.data.cert_number && c.image_url);
      if (newCertStones.length) {
        const certs = newCertStones.map((c) => c.data.cert_number as string);
        const { data: newRows } = await supabaseAdmin
          .from("stones")
          .select("id, cert_number")
          .eq("dealer_id", dealerId)
          .in("cert_number", certs);
        for (const row of (newRows ?? []) as any[]) {
          const candidate = newCertStones.find((c) => c.data.cert_number === row.cert_number);
          if (candidate?.image_url) {
            imageRowsToUpsert.push({
              stone_id: row.id,
              storage_url: candidate.image_url,
              external_image_url: candidate.image_url,
              is_primary: true,
              sort_order: 0,
            });
          }
        }
      }

      // Log batch result
      if (!errors.some((e) => e.batch === batchNumber)) {
        diagnostics.push(diagnostic("success",
          `Batch ${batchNumber}: ${certRows.length + noCertCreates.length + noCertUpdates.length} rows processed.`,
          { batch: batchNumber, field: "_write" },
        ));
      }
    }

    if (imageRowsToUpsert.length) {
      // Upsert: insert new image rows, ignore conflicts on (stone_id) for
      // stones that already have a primary image row from a previous sync.
      // This means re-syncing never fails due to duplicate image rows.
      const { error } = await supabaseAdmin
        .from("stone_images")
        .upsert(imageRowsToUpsert as never, {
          onConflict: "stone_id",
          ignoreDuplicates: true,
        });
      if (error) {
        // Upsert failed — fall back to insert, skipping existing rows one by one
        let imageWriteErrors = 0;
        for (const row of imageRowsToUpsert) {
          const { error: singleErr } = await supabaseAdmin
            .from("stone_images")
            .insert(row as never);
          if (singleErr && singleErr.code !== "23505") {
            // 23505 = unique violation — already exists, safe to skip
            imageWriteErrors += 1;
          }
        }
        if (imageWriteErrors > 0) {
          errors.push(postgresDiagnostic(
            `Stone image upsert failed (${imageWriteErrors} rows). Stones were synced but some images may not appear`,
            error,
            { field: "_images" },
          ));
        }
      } else {
        diagnostics.push(diagnostic("success",
          `Wrote ${imageRowsToUpsert.length} image row${imageRowsToUpsert.length === 1 ? "" : "s"} (new + updated stones).`,
          { field: "_images" },
        ));
      }
    }

    let markedInactive = 0;
    if (seenCerts.size && existing && existing.length) {
      const inactiveIds = (existing ?? []).filter((s) => {
        const key = cleanString(s.external_sync_key);
        const cert = cleanString(s.cert_number);
        return (key && !seenCerts.has(key.replace(/^cert:/, ""))) || (!key && cert && !seenCerts.has(cert));
      }).map((s) => s.id);
      if (inactiveIds.length) {
        for (let i = 0; i < inactiveIds.length; i += SYNC_BATCH_SIZE) {
          const ids = inactiveIds.slice(i, i + SYNC_BATCH_SIZE);
          const { error } = await supabaseAdmin
            .from("stones")
            .update({ feed_inactive: true })
            .in("id", ids)
            .eq("dealer_id", dealerId);
          if (error) {
            errors.push(postgresDiagnostic("Could not mark missing feed rows inactive", error, {
              batch: Math.floor(i / SYNC_BATCH_SIZE) + 1,
              field: "_inactive",
            }));
            break;
          }
          markedInactive += ids.length;
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
