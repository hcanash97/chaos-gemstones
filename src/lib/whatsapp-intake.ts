export type WhatsappConfidenceTier = "high" | "medium" | "low";

export type WhatsappParsedDraft = {
  stone_type: string | null;
  shape: string | null;
  carat: number | null;
  color: string | null;
  clarity: string | null;
  cert_lab: string | null;
  cert_number: string | null;
  stock_number: string | null;
  price: number | null;
  currency: string;
  treatment: string | null;
  origin: string | null;
  dimensions: string | null;
  confidence_score: WhatsappConfidenceTier;
  missing_fields: string[];
  parsing_diagnostics: Record<string, unknown>;
};

const SHAPE_ALIASES: Array<[string, RegExp]> = [
  ["Round", /\b(round|rd|brilliant|rbc)\b/i],
  ["Oval", /\b(oval|ov)\b/i],
  ["Emerald", /\b(emerald|em|octagon)\b/i],
  ["Cushion", /\b(cushion|cush|cu)\b/i],
  ["Pear", /\b(pear|teardrop|ps)\b/i],
  ["Radiant", /\b(radiant|rad)\b/i],
  ["Princess", /\b(princess|prn)\b/i],
  ["Marquise", /\b(marquise|mq)\b/i],
  ["Asscher", /\b(asscher|as)\b/i],
  ["Heart", /\b(heart|hrt)\b/i],
  ["Baguette", /\b(baguette|bag)\b/i],
  ["Trillion", /\b(trillion|trilliant|tri)\b/i],
];

const CERT_LABS = [
  "GIA",
  "IGI",
  "HRD",
  "AGS",
  "GCAL",
  "EGL",
  "GRS",
  "SSEF",
  "Gubelin",
  "Gübelin",
  "AGL",
  "Lotus",
  "GIT",
];

const CLARITY_GRADES = [
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
];

const COLOR_GRADES = ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];

export function parseWhatsappStoneMessage(rawMessage: string): WhatsappParsedDraft {
  const text = rawMessage.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const carat = firstNumberMatch(text, [
    /\b(?:ct|cts|carat|carats|weight|wt)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    /\b([0-9]+(?:\.[0-9]+)?)\s*(?:ct|cts|carat|carats)\b/i,
  ]);
  const priceMatch =
    text.match(/\b(?:price|ask|asking|rate|usd|gbp|aud|eur)\s*[:\-]?\s*([$£€]?\s*[0-9][0-9,]*(?:\.[0-9]+)?)/i) ??
    text.match(/([$£€])\s*([0-9][0-9,]*(?:\.[0-9]+)?)/) ??
    text.match(/\b([0-9][0-9,]*(?:\.[0-9]+)?)\s*(usd|gbp|aud|eur)\b/i);
  const price = priceMatch ? firstNumericCapture(priceMatch) : null;
  const currency = inferCurrency(text);
  const shape = SHAPE_ALIASES.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
  const certLab = CERT_LABS.find((lab) => new RegExp(`\\b${escapeRegExp(lab)}\\b`, "i").test(text)) ?? null;
  const clarity = CLARITY_GRADES.find((grade) => new RegExp(`\\b${grade}\\b`, "i").test(text)) ?? null;
  const color = extractColor(text);
  const stoneType = inferStoneType(lower);
  const certNumber = extractCertNumber(text, certLab);
  const stockNumber = extractLabelValue(text, ["stock", "stock no", "stock#", "packet", "lot", "ref", "sku"]);
  const dimensions =
    text.match(/\b([0-9]+(?:\.[0-9]+)?\s*[x×]\s*[0-9]+(?:\.[0-9]+)?(?:\s*[x×]\s*[0-9]+(?:\.[0-9]+)?)?\s*mm?)\b/i)?.[1] ?? null;
  const treatment = inferTreatment(lower);
  const origin = inferOrigin(lower);
  const missingFields = ["stone_type", "carat", "price", "shape"].filter((field) => {
    if (field === "stone_type") return !stoneType;
    if (field === "carat") return !carat;
    if (field === "price") return !price;
    if (field === "shape") return !shape;
    return false;
  });
  for (const secondary of ["cert_lab", "cert_number", "color", "clarity"]) {
    if (secondary === "cert_lab" && !certLab) missingFields.push(secondary);
    if (secondary === "cert_number" && !certNumber) missingFields.push(secondary);
    if (secondary === "color" && !color) missingFields.push(secondary);
    if (secondary === "clarity" && !clarity) missingFields.push(secondary);
  }
  const criticalPresent = [stoneType, carat, price, shape].filter(Boolean).length;
  const confidence_score: WhatsappConfidenceTier =
    criticalPresent >= 4 && missingFields.length <= 2 ? "high" : criticalPresent >= 3 ? "medium" : "low";

  return {
    stone_type: stoneType,
    shape,
    carat,
    color,
    clarity,
    cert_lab: certLab ? normalizeCertLab(certLab) : null,
    cert_number: certNumber,
    stock_number: stockNumber,
    price,
    currency,
    treatment,
    origin,
    dimensions,
    confidence_score,
    missing_fields: missingFields,
    parsing_diagnostics: {
      parser: "phase_1_regex_scaffold",
      critical_fields_found: criticalPresent,
      note: "This local parser is designed for safe drafts. A later Meta/OpenAI webhook can reuse the same draft schema.",
    },
  };
}

export function confidenceLabelClass(tier: WhatsappConfidenceTier | string | null | undefined) {
  if (tier === "high") return "bg-green-100 text-green-800";
  if (tier === "medium") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function firstNumberMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return toNumber(match[1]);
  }
  return null;
}

function toNumber(value: string | undefined | null) {
  if (!value) return null;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function firstNumericCapture(match: RegExpMatchArray) {
  for (const part of match.slice(1)) {
    const value = toNumber(part);
    if (value !== null) return value;
  }
  return null;
}

function inferCurrency(text: string) {
  if (/£|\bgbp\b/i.test(text)) return "GBP";
  if (/€|\beur\b/i.test(text)) return "EUR";
  if (/\baud\b/i.test(text)) return "AUD";
  return "USD";
}

function inferStoneType(lower: string) {
  if (lower.includes("sapphire")) return "Sapphire";
  if (lower.includes("ruby")) return "Ruby";
  if (lower.includes("emerald") && !/\bemerald\s+cut\b/i.test(lower)) return "Emerald";
  if (lower.includes("diamond") || lower.includes("lab grown") || lower.includes("lgd")) return "Diamond";
  if (lower.includes("tourmaline")) return "Tourmaline";
  if (lower.includes("spinel")) return "Spinel";
  if (lower.includes("aquamarine")) return "Aquamarine";
  if (lower.includes("garnet")) return "Garnet";
  return null;
}

function extractColor(text: string) {
  const colourLabel = extractLabelValue(text, ["color", "colour", "col"]);
  if (colourLabel) return colourLabel.toUpperCase();
  return COLOR_GRADES.find((grade) => new RegExp(`\\b${grade}\\s*(?:color|colour|col)?\\b`, "i").test(text)) ?? null;
}

function extractCertNumber(text: string, certLab: string | null) {
  const labelled = extractLabelValue(text, ["cert", "certificate", "report", "report no", "lab no"]);
  if (labelled) return labelled;
  const igi = text.match(/\bLG[0-9]{6,}\b/i)?.[0];
  if (igi) return igi.toUpperCase();
  if (certLab) {
    const nearLab = text.match(new RegExp(`\\b${escapeRegExp(certLab)}\\b\\s*[:#-]?\\s*([A-Z0-9-]{6,})`, "i"))?.[1];
    if (nearLab) return nearLab.toUpperCase();
  }
  return text.match(/\b[A-Z]{0,3}[0-9]{7,12}\b/i)?.[0]?.toUpperCase() ?? null;
}

function extractLabelValue(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(new RegExp(`\\b${escapeRegExp(label)}\\b\\s*[:#-]?\\s*([A-Z0-9./_-]{2,})`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function inferTreatment(lower: string) {
  if (/\b(no heat|unheated)\b/i.test(lower)) return "Unheated";
  if (/\bheated|heat\b/i.test(lower)) return "Heated";
  if (/\boil|oiled\b/i.test(lower)) return "Oiled";
  if (/\btreated|treatment\b/i.test(lower)) return "Treated";
  return null;
}

function inferOrigin(lower: string) {
  if (/\blab\b|\blab grown\b|\blgd\b|\bcvd\b|\bhpht\b/i.test(lower)) return "Lab-grown";
  if (/\bnatural\b|\bnat\b/i.test(lower)) return "Natural";
  return null;
}

function normalizeCertLab(lab: string) {
  return lab.toLowerCase() === "gubelin" ? "Gübelin" : lab.toUpperCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
