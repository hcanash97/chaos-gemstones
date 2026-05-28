// Preset detectors + mappers for known dealer-inventory feed formats.
//
// A mapping module turns an arbitrary feed row into:
//   { stone: Partial<stones>, image_url?: string, video_url?: string, city?: string }
// plus a preset name we can show in the UI ("Kodllin / Nancy Diamond format",
// "Custom mapping", etc.).

export type MappedRow = {
  stone: Record<string, unknown>;
  image_url?: string;
  video_url?: string;
  city?: string;
};

export type FeedPreset = {
  id: string;
  label: string;
  detect: (row: Record<string, unknown>) => boolean;
  map: (row: Record<string, unknown>) => MappedRow;
};

function s(v: unknown): string {
  return v === undefined || v === null ? "" : String(v).trim();
}
function n(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const num = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(num) ? num : undefined;
}
function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function parseMeasurements(value: unknown): {
  measurements_length?: number;
  measurements_width?: number;
  measurements_height?: number;
} {
  const raw = s(value);
  if (!raw) return {};
  const parts = raw.split(/[x×*]/i).map((p) => Number(p.trim()));
  if (parts.length < 2 || parts.some((p) => !Number.isFinite(p))) return {};
  return {
    measurements_length: parts[0],
    measurements_width: parts[1],
    measurements_height: parts[2],
  };
}

const KODLLIN: FeedPreset = {
  id: "kodllin",
  label: "Kodllin / Nancy Diamond format",
  detect: (row) => "stockNo" in row && "growthType" in row,
  map: (row) => {
    const stone: Record<string, unknown> = {};

    // Nancy Diamond / Kodllin only returns lab-grown diamonds.
    stone.stone_type = "Diamond";

    const stockNote = s(row.stockNo) ? `Stock ref: ${s(row.stockNo)}` : "";
    const certComment = s(row.certiComment);
    const inscription = s(row.inscription);
    const laserInscription = s(row.laserInscription);
    const notes = [stockNote, certComment, inscription, laserInscription].filter(Boolean).join(" — ");
    if (notes) stone.notes_for_buyers = notes;

    const status = s(row.status).toLowerCase();
    if (status === "available") stone.status = "available";
    else if (status === "sold") stone.status = "sold";

    const shape = s(row.shape);
    if (shape) stone.shape = titleCase(shape);

    const w = n(row.weight);
    if (w !== undefined) stone.carat_weight = w;

    const map: Array<[string, string]> = [
      ["color", "colour_grade"],
      ["clarity", "clarity_grade"],
      ["cut", "cut_grade"],
      ["polish", "polish"],
      ["symmetry", "symmetry"],
      ["fluorescenceIntensity", "fluorescence"],
      ["fluorescenceColor", "fluorescence_colour"],
      ["shade", "shade"],
      ["milky", "milky"],
      ["lab", "cert_lab"],
      ["reportNo", "cert_number"],
      ["treatment", "treatment"],
      ["culetSize", "culet_size"],
      ["culetCondition", "culet_condition"],
      ["blackInclusion", "black_inclusion"],
      ["fancyColor", "colour_hue"],
      ["fancyColorIntensity", "colour_saturation"],
      ["fancyColorOvertone", "colour_tone"],
      ["country", "country_of_origin"],
    ];
    for (const [src, dst] of map) {
      const v = s(row[src]);
      if (v) stone[dst] = v;
    }

    const eye = s(row.eyeClean);
    if (eye) stone.eye_clean = eye.toUpperCase() === "EC" ? "Yes" : eye;

    const reportDate = s(row.reportDate);
    if (reportDate) stone.report_date = reportDate;

    const ratio = n(row.ratio);
    if (ratio !== undefined) stone.lw_ratio = ratio;

    const growth = s(row.growthType).toUpperCase();
    if (growth === "CVD" || growth === "HPHT") stone.origin = "Lab-grown";
    else if ("growthType" in row) stone.origin = "Natural";

    const depth = n(row.depth);
    if (depth !== undefined) stone.depth_pct = depth;
    const tbl = n(row.table);
    if (tbl !== undefined) stone.table_pct = tbl;

    const girdle = s(row.girdleThin) || s(row.girdleThick);
    if (s(row.girdleThin) && s(row.girdleThick)) {
      stone.girdle = `${s(row.girdleThin)} to ${s(row.girdleThick)}`;
    } else if (girdle) {
      stone.girdle = girdle;
    }

    const ca = n(row.crownAngle);
    if (ca !== undefined) stone.crown_angle = ca;
    // crownHeight is sent as a percentage by Kodllin, not degrees — stored as-is
    const ch = n(row.crownHeight);
    if (ch !== undefined && ca === undefined) stone.crown_angle = ch;
    const pa = n(row.pavilionAngle);
    if (pa !== undefined) stone.pavilion_angle = pa;
    // pavilionDepth is sent as a percentage by Kodllin, not degrees — stored as-is
    const pd = n(row.pavilionDepth);
    if (pd !== undefined && pa === undefined) stone.pavilion_angle = pd;

    const openInclusion = s(row.openInclusion);
    if (openInclusion) stone.enhancement = openInclusion;

    // vdbVideo as fallback when videoLink is absent
    if (!s(row.videoLink)) {
      const vdb = s(row.vdbVideo);
      if (vdb) {
        stone.video_url = vdb;
        stone.has_video = true;
      }
    }

    // keyToSymbole and starLength are internal Kodllin fields — ignored.

    Object.assign(stone, parseMeasurements(row.measurements));

    // Pricing: prefer totalPrice if present and > 0, else pricePerCt * weight.
    const total = n(row.totalPrice);
    const ppc = n(row.pricePerCt);
    if (total && total > 0) stone.wholesale_price_usd = total;
    else if (ppc && w) stone.wholesale_price_usd = Math.round(ppc * w * 100) / 100;

    const video = s(row.videoLink);
    if (video) {
      stone.video_url = video;
      stone.has_video = true;
      if (/gem360|v360|diamond360/i.test(video)) stone.has_360 = true;
    }

    const image = s(row.imageLink);

    return {
      stone,
      image_url: image || undefined,
      video_url: video || undefined,
      city: s(row.location) || undefined,
    };
  },
};

export const PRESETS: FeedPreset[] = [KODLLIN];

export function detectPreset(rows: Array<Record<string, unknown>>): FeedPreset | null {
  if (!rows.length) return null;
  const sample = rows[0];
  return PRESETS.find((p) => p.detect(sample)) ?? null;
}

/**
 * Map a row using the matching preset, or fall through to identity (assume
 * the row already uses Chaos field names).
 */
export function mapRow(row: Record<string, unknown>, preset: FeedPreset | null): MappedRow {
  if (preset) return preset.map(row);
  // Identity passthrough — assume already-Chaos shape.
  return { stone: row };
}
