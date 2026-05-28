import { CLARITY_VALUES, CERT_LABS, STONE_FIELDS } from "./import-fields";

export type FieldError = { field: string; message: string };

const NUMERIC_FIELDS = new Set(
  STONE_FIELDS.filter((f) => f.type === "number").map((f) => f.key),
);
const BOOLEAN_FIELDS = new Set(
  STONE_FIELDS.filter((f) => f.type === "boolean").map((f) => f.key),
);
const KNOWN_FIELDS = new Set(STONE_FIELDS.map((f) => f.key));

/**
 * Validate a stone payload for create/update.
 * - For create: requires stone_type, shape, carat_weight, wholesale_price_usd.
 * - For update: all fields are optional (only provided fields validated).
 */
export function validateStonePayload(
  payload: Record<string, unknown>,
  mode: "create" | "update",
): { ok: true; data: Record<string, unknown> } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const data: Record<string, unknown> = {};

  if (mode === "create") {
    for (const f of STONE_FIELDS) {
      if (!f.required) continue;
      const v = payload[f.key];
      if (v === undefined || v === null || String(v).trim() === "") {
        errors.push({ field: f.key, message: `${f.label} is required` });
      }
    }
  }

  for (const [key, raw] of Object.entries(payload)) {
    if (!KNOWN_FIELDS.has(key)) continue; // ignore unknown fields
    if (raw === undefined || raw === null || raw === "") continue;

    if (NUMERIC_FIELDS.has(key)) {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        errors.push({ field: key, message: "Must be a number" });
        continue;
      }
      if (key === "carat_weight" && (n < 0.01 || n > 100)) {
        errors.push({ field: key, message: "Must be between 0.01 and 100" });
        continue;
      }
      if (key === "wholesale_price_usd" && (n < 1 || n > 500_000)) {
        errors.push({ field: key, message: "Must be between 1 and 500,000" });
        continue;
      }
      data[key] = n;
    } else if (BOOLEAN_FIELDS.has(key)) {
      data[key] = raw === true || ["1", "true", "yes", "y"].includes(String(raw).toLowerCase());
    } else {
      data[key] = String(raw).trim();
    }
  }

  if (data.clarity_grade && !CLARITY_VALUES.includes(String(data.clarity_grade))) {
    errors.push({ field: "clarity_grade", message: `Must be one of ${CLARITY_VALUES.join(", ")}` });
  }
  if (data.cert_lab && !CERT_LABS.includes(String(data.cert_lab))) {
    errors.push({ field: "cert_lab", message: `Must be one of ${CERT_LABS.join(", ")}` });
  }
  if (data.listing_type && !["single", "parcel"].includes(String(data.listing_type))) {
    errors.push({ field: "listing_type", message: "Must be 'single' or 'parcel'" });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, data };
}