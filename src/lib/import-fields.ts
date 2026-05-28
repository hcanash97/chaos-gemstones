// Canonical list of stones fields that the importer can write to,
// plus aliases for friendly column matching.
export type StoneField = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "enum";
  required?: boolean;
  aliases: string[];
  enumValues?: string[];
};

export const CLARITY_VALUES = [
  "FL",
  "IF",
  "VVS1",
  "VVS2",
  "VS1",
  "VS2",
  "SI1",
  "SI2",
  "I1",
  "I2",
  "I3",
  "Eye Clean",
  "Lightly Included",
  "Moderately Included",
  "Heavily Included",
];

export const CERT_LABS = [
  "GIA",
  "IGI",
  "HRD",
  "AGS",
  "GCAL",
  "EGL",
  "GRS",
  "SSEF",
  "Gübelin",
  "AGL",
  "Lotus",
  "GIT",
  "GIA-coloured",
];

export const STONE_FIELDS: StoneField[] = [
  {
    key: "stone_type",
    label: "Stone type",
    type: "string",
    required: true,
    aliases: ["type", "gem", "gemstone", "stone"],
  },
  { key: "shape", label: "Shape", type: "string", required: true, aliases: ["cut shape", "outline"] },
  {
    key: "carat_weight",
    label: "Carat weight",
    type: "number",
    required: true,
    aliases: ["weight", "carats", "ct", "carat", "carat_wt"],
  },
  {
    key: "wholesale_price_usd",
    label: "Wholesale price (USD)",
    type: "number",
    required: true,
    aliases: ["price", "price_usd", "wholesale", "total", "amount"],
  },
  {
    key: "price_currency",
    label: "Price currency",
    type: "enum",
    enumValues: ["USD", "GBP", "EUR", "AUD", "CAD", "INR", "THB", "LKR", "HKD", "SGD", "JPY", "AED", "CHF", "ZAR"],
    aliases: ["currency", "price_ccy", "ccy", "currency_code", "priceCurrency"],
  },
  {
    key: "colour_grade",
    label: "Colour grade",
    type: "string",
    aliases: ["color", "colour", "color_grade", "color grade"],
  },
  { key: "clarity_grade", label: "Clarity grade", type: "enum", enumValues: CLARITY_VALUES, aliases: ["clarity"] },
  { key: "cut_grade", label: "Cut grade", type: "string", aliases: ["cut", "make"] },
  { key: "polish", label: "Polish", type: "string", aliases: ["pol"] },
  { key: "symmetry", label: "Symmetry", type: "string", aliases: ["sym"] },
  { key: "fluorescence", label: "Fluorescence", type: "string", aliases: ["fluo", "fluor", "fluorescence_intensity"] },
  { key: "fluorescence_colour", label: "Fluorescence colour", type: "string", aliases: ["fluo_color", "fluo_colour"] },
  {
    key: "cert_lab",
    label: "Cert lab",
    type: "enum",
    enumValues: CERT_LABS,
    aliases: [
      "lab",
      "certificate_lab",
      "cert",
      "grading_lab",
      "gradingLab",
      "laboratory",
      "certLab",
      "certificateLab",
      "certifying_lab",
      "grading_laboratory",
    ],
  },
  {
    key: "cert_number",
    label: "Cert number",
    type: "string",
    aliases: [
      "cert_no",
      "certificate",
      "certificate_number",
      "report_no",
      "report_number",
      "reportNo",
      "reportNumber",
      "certificateNumber",
      "certificate_no",
      "certNo",
      "certNumber",
      "cert_num",
      "grading_report",
      "gradingReport",
      "lab_report",
      "labReport",
      "igi_report",
      "gia_report",
      "grs_report",
      "hrd_cert",
      "stone_cert",
      "stone_report",
    ],
  },
  { key: "origin", label: "Origin (region)", type: "string", aliases: ["region", "mine", "source"] },
  { key: "country_of_origin", label: "Country of origin", type: "string", aliases: ["country", "country_origin"] },
  { key: "treatment", label: "Treatment", type: "string", aliases: ["treatments", "enhancement_type"] },
  { key: "colour_hue", label: "Colour hue", type: "string", aliases: ["hue", "primary_hue"] },
  { key: "colour_tone", label: "Colour tone", type: "string", aliases: ["tone"] },
  { key: "colour_saturation", label: "Colour saturation", type: "string", aliases: ["saturation"] },
  { key: "phenomenon", label: "Phenomenon", type: "string", aliases: ["optical_phenomenon"] },
  { key: "measurements_length", label: "Length (mm)", type: "number", aliases: ["length", "length_mm"] },
  { key: "measurements_width", label: "Width (mm)", type: "number", aliases: ["width", "width_mm"] },
  { key: "measurements_height", label: "Height (mm)", type: "number", aliases: ["height", "depth_mm", "height_mm"] },
  { key: "lw_ratio", label: "L/W ratio", type: "number", aliases: ["ratio", "lw"] },
  { key: "depth_pct", label: "Depth %", type: "number", aliases: ["depth", "depth_percent"] },
  { key: "table_pct", label: "Table %", type: "number", aliases: ["table", "table_percent"] },
  { key: "girdle", label: "Girdle", type: "string", aliases: [] },
  { key: "culet_size", label: "Culet size", type: "string", aliases: ["culet"] },
  { key: "culet_condition", label: "Culet condition", type: "string", aliases: [] },
  { key: "shade", label: "Shade", type: "string", aliases: ["tinge"] },
  { key: "milky", label: "Milky", type: "string", aliases: [] },
  { key: "eye_clean", label: "Eye clean", type: "string", aliases: ["eyeclean"] },
  { key: "black_inclusion", label: "Black inclusion", type: "string", aliases: ["bgm"] },
  { key: "enhancement", label: "Enhancement", type: "string", aliases: [] },
  { key: "listing_type", label: "Listing type", type: "string", aliases: [] },
  { key: "parcel_quantity", label: "Parcel quantity", type: "number", aliases: ["parcel_qty"] },
  { key: "matching_pair", label: "Matching pair", type: "boolean", aliases: ["pair"] },
  { key: "has_video", label: "Has video", type: "boolean", aliases: ["video"] },
  { key: "has_360", label: "Has 360°", type: "boolean", aliases: ["360", "three_sixty"] },
  { key: "provenance_report", label: "Provenance report", type: "string", aliases: ["provenance", "traceability"] },
  { key: "video_url", label: "Video URL", type: "string", aliases: ["video_link"] },
  { key: "available_qty", label: "Available qty", type: "number", aliases: ["qty", "quantity", "stock"] },
  { key: "minimum_order_qty", label: "Minimum order qty", type: "number", aliases: ["moq", "min_qty"] },
  { key: "lead_time_days", label: "Lead time (days)", type: "number", aliases: ["lead_time"] },
  { key: "notes_for_buyers", label: "Notes for buyers", type: "string", aliases: ["notes", "description", "comments"] },
  { key: "crown_angle", label: "Crown angle (°)", type: "number", aliases: ["crown"] },
  { key: "pavilion_angle", label: "Pavilion angle (°)", type: "number", aliases: ["pavilion"] },
];

export const FIELD_MAP = Object.fromEntries(STONE_FIELDS.map((f) => [f.key, f]));

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function suggestMapping(headers: string[]): Record<string, string | "__skip__"> {
  const out: Record<string, string | "__skip__"> = {};
  for (const h of headers) {
    const n = normalise(h);
    const direct = STONE_FIELDS.find((f) => f.key === n);
    if (direct) {
      out[h] = direct.key;
      continue;
    }
    const aliased = STONE_FIELDS.find((f) => f.aliases.some((a) => normalise(a) === n));
    if (aliased) {
      out[h] = aliased.key;
      continue;
    }
    // contains-based fuzzy match
    const fuzzy = STONE_FIELDS.find((f) => n.includes(f.key) || f.key.includes(n));
    out[h] = fuzzy ? fuzzy.key : "__skip__";
  }
  return out;
}

export type RowError = { field: string; message: string };

export function validateMappedRow(mapped: Record<string, unknown>, existingCertNumbers: Set<string>): RowError[] {
  const errors: RowError[] = [];
  for (const f of STONE_FIELDS) {
    if (f.required) {
      const v = mapped[f.key];
      if (v === undefined || v === null || String(v).trim() === "") {
        errors.push({ field: f.key, message: `${f.label} is required` });
      }
    }
  }
  const carat = Number(mapped.carat_weight);
  if (
    mapped.carat_weight !== undefined &&
    mapped.carat_weight !== "" &&
    (isNaN(carat) || carat < 0.01 || carat > 100)
  ) {
    errors.push({ field: "carat_weight", message: "Must be 0.01–100" });
  }
  if (mapped.wholesale_price_usd !== undefined && mapped.wholesale_price_usd !== "") {
    const raw = String(mapped.wholesale_price_usd);
    if (/[^0-9.\-]/.test(raw)) {
      errors.push({ field: "wholesale_price_usd", message: "No currency symbols — numbers only" });
    } else {
      const p = Number(raw);
      if (isNaN(p) || p < 1 || p > 500_000) errors.push({ field: "wholesale_price_usd", message: "Must be 1–500,000" });
    }
  }
  if (mapped.clarity_grade && !CLARITY_VALUES.includes(String(mapped.clarity_grade).trim())) {
    errors.push({ field: "clarity_grade", message: `Must be one of ${CLARITY_VALUES.join(", ")}` });
  }
  if (mapped.cert_lab && !CERT_LABS.includes(String(mapped.cert_lab).trim())) {
    errors.push({ field: "cert_lab", message: `Unsupported lab; leave blank if unknown` });
  }
  const certNum = mapped.cert_number ? String(mapped.cert_number).trim() : "";
  if (certNum) {
    const lab = String(mapped.cert_lab ?? "").trim();
    if (lab === "GIA" && !/^\d{10}$/.test(certNum)) {
      errors.push({ field: "cert_number", message: "GIA cert numbers must be exactly 10 digits" });
    }
    if (lab === "IGI" && !/^\d{9,12}$/.test(certNum)) {
      errors.push({ field: "cert_number", message: "IGI cert numbers must be 9–12 digits" });
    }
    if (existingCertNumbers.has(certNum)) {
      errors.push({ field: "cert_number", message: "Duplicate — you already have a stone with this cert number" });
    }
  }
  return errors;
}

export function normaliseValue(field: StoneField, value: unknown): unknown {
  if (value === undefined || value === null || value === "") return value;
  const v = String(value).trim();

  if (field.key === "cert_lab") {
    const up = v.toUpperCase().replace(/[\.\-\s]/g, "");
    if (up === "GIA" || up === "GIACOLOURED") return up === "GIACOLOURED" ? "GIA-coloured" : "GIA";
    if (up === "IGI" || up === "IGIUSA" || up === "IGIINDIA") return "IGI";
    if (up === "HRD") return "HRD";
    if (up === "AGS") return "AGS";
    if (up === "GRS") return "GRS";
    if (up === "AGL") return "AGL";
    if (up === "GCAL") return "GCAL";
    if (up === "EGL") return "EGL";
    if (up === "SSEF") return "SSEF";
    if (up === "LOTUS" || up === "LOTUSGEMS") return "Lotus";
    if (up === "GIT") return "GIT";
    if (up === "GUBELIN" || up === "GÜBELIN") return "Gübelin";
    return v;
  }

  if (field.key === "shape") {
    const up = v.toUpperCase().replace(/[\s\-]/g, "");
    const shapeMap: Record<string, string> = {
      RD: "Round",
      ROUND: "Round",
      ROUNDBRILLIANT: "Round",
      BR: "Round",
      OV: "Oval",
      OVAL: "Oval",
      OVALBRILLIANT: "Oval",
      CU: "Cushion",
      CUSH: "Cushion",
      CUSHION: "Cushion",
      CUSHIONBRILLIANT: "Cushion",
      PR: "Pear",
      PEAR: "Pear",
      PEARSHAPE: "Pear",
      EM: "Emerald Cut",
      EMERALD: "Emerald Cut",
      EMERALDCUT: "Emerald Cut",
      STEPCUT: "Emerald Cut",
      RAD: "Radiant",
      RADIANT: "Radiant",
      MQ: "Marquise",
      MARQUISE: "Marquise",
      MARQUISEBRILL: "Marquise",
      MARQUISEBRILLIANT: "Marquise",
      AS: "Asscher",
      ASSCHER: "Asscher",
      HT: "Heart",
      HEART: "Heart",
      HEARTSHAPE: "Heart",
      PS: "Princess",
      PRINCESS: "Princess",
      RC: "Rose Cut",
      ROSECUT: "Rose Cut",
      OM: "Old Mine Cut",
      OLDMINE: "Old Mine Cut",
      OLDMINECUT: "Old Mine Cut",
      OEC: "Old European Cut",
      OLDEUROPEAN: "Old European Cut",
      OLDEUROPEANCUT: "Old European Cut",
    };
    return shapeMap[up] ?? v;
  }

  if (field.key === "treatment") {
    const lo = v.toLowerCase().replace(/[\s\-]/g, "");
    if (["", "none", "no", "untreated", "notreatment"].includes(lo)) return "None";
    if (["h", "heat", "heated", "heattreated"].includes(lo)) return "Heat treated";
    if (["be", "beryllium", "bediffusion"].includes(lo)) return "Beryllium diffused";
    if (["fr", "fracturefill", "fracturefilled", "ff"].includes(lo)) return "Fracture filled";
    if (["oil", "oiled", "oiling", "cedaroil"].includes(lo)) return "Oiled";
    if (["ir", "irradiated", "irradiation"].includes(lo)) return "Irradiated";
    return v;
  }

  if (field.key === "eye_clean") {
    const up = v.toUpperCase().replace(/[\s\-]/g, "");
    if (["EC", "Y", "YES", "EYECLEAN", "1"].includes(up)) return "Yes";
    if (["BL", "BORDERLINE", "BORDERLINE"].includes(up)) return "Borderline";
    if (["N", "NO", "NOTEYECLEAN", "0"].includes(up)) return "No";
    return v;
  }

  if (field.key === "origin") {
    const lo = v.toLowerCase().replace(/[\s\-]/g, "");
    if (["cvd", "hpht", "labgrown", "laggrown", "synthetic", "manmade", "labbrown"].includes(lo)) return "Lab-grown";
    if (["natural", "mined", "earthmined"].includes(lo)) return "Natural";
    return v;
  }

  if (field.key === "stone_type") {
    const up = v.toUpperCase().replace(/[\s\-]/g, "");
    const typeMap: Record<string, string> = {
      DIAM: "Diamond",
      DIA: "Diamond",
      D: "Diamond",
      DIAMOND: "Diamond",
      SAP: "Sapphire",
      SAPP: "Sapphire",
      SAPPHIRE: "Sapphire",
      RUB: "Ruby",
      RUBY: "Ruby",
      EME: "Emerald",
      EMER: "Emerald",
      EMERALD: "Emerald",
      ALEX: "Alexandrite",
      ALEXANDRITE: "Alexandrite",
      SPIN: "Spinel",
      SPINEL: "Spinel",
      TOUR: "Tourmaline",
      TOURMALINE: "Tourmaline",
      TANZ: "Tanzanite",
      TANZANITE: "Tanzanite",
    };
    return typeMap[up] ?? v;
  }

  return v;
}

export function coerceForInsert(mapped: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of STONE_FIELDS) {
    const v = mapped[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "number") {
      const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
      if (!isNaN(n)) out[f.key] = n;
    } else if (f.type === "boolean") {
      const s = String(v).toLowerCase().trim();
      out[f.key] = ["1", "true", "yes", "y"].includes(s);
    } else {
      out[f.key] = normaliseValue(f, String(v).trim());
    }
  }
  return out;
}

// Build a CSV template with all fields + one realistic example row.
export function buildTemplateCsv(): string {
  const headers = STONE_FIELDS.map((f) => f.key);
  const example: Record<string, string> = {
    stone_type: "diamond",
    shape: "round",
    carat_weight: "1.05",
    wholesale_price_usd: "4200",
    colour_grade: "F",
    clarity_grade: "VS1",
    cut_grade: "Excellent",
    polish: "Excellent",
    symmetry: "Excellent",
    fluorescence: "None",
    cert_lab: "GIA",
    cert_number: "2191234567",
    origin: "natural",
    country_of_origin: "Botswana",
    treatment: "none",
    measurements_length: "6.52",
    measurements_width: "6.55",
    measurements_height: "4.03",
    depth_pct: "61.6",
    table_pct: "57",
    available_qty: "1",
    listing_type: "single",
    notes_for_buyers: "Premium make, eye-clean to 10x.",
  };
  const row = headers.map((h) => {
    const v = example[h] ?? "";
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  });
  return headers.join(",") + "\n" + row.join(",") + "\n";
}
