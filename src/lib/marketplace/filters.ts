// Shared marketplace filter state, presets, and helpers.
// Used by /marketplace, saved-searches dialog, and saved-search digest cron.

export type FilterState = {
  // Universal
  search: string;
  types: string[];
  shapes: string[];
  caratMin: number;
  caratMax: number;
  priceMin: number;
  priceMax: number;
  priceMode: "per_stone" | "per_carat";
  origin: "all" | "natural" | "lab-grown";
  labs: string[];
  certNumber: string;
  countries: string[];
  availability: ("available" | "reserved" | "sold")[];
  listingType: "all" | "single" | "parcel";
  bulkPricingOnly: boolean;
  dealerId: string;
  newWithin: 0 | 1 | 3 | 7 | 30;

  // Diamond
  colourGrades: string[];
  fancyColourMode: boolean;
  fancyHues: string[];
  fancyIntensities: string[];
  treatedColour: boolean;
  clarities: string[];
  cutGrades: string[];
  polish: string[];
  symmetry: string[];
  fluorescenceIntensity: string[];
  fluorescenceColour: string[];
  lengthMin: number | null;
  lengthMax: number | null;
  widthMin: number | null;
  widthMax: number | null;
  heightMin: number | null;
  heightMax: number | null;
  lwRatioMin: number | null;
  lwRatioMax: number | null;
  depthPctMin: number | null;
  depthPctMax: number | null;
  tablePctMin: number | null;
  tablePctMax: number | null;
  girdle: string[];
  culetSize: string[];
  culetCondition: string[];
  shade: string[];
  milky: string[];
  eyeClean: string[];
  blackInclusion: string[];
  enhancement: "any" | "include" | "only" | "exclude";
  hasImages: boolean;
  hasVideo: boolean;
  has360: boolean;
  hasCertScan: boolean;
  provenance: string[];

  // Coloured
  primaryColours: string[];
  tones: string[];
  saturations: string[];
  treatments: string[];
  clarityTypes: string[];
  phenomena: string[];
  premiumOriginsOnly: boolean;
  matchingPairOnly: boolean;
  parcelOnly: boolean;
  parcelMinQty: number | null;

  // Sort/view
  sort: "newest" | "price-asc" | "price-desc" | "carat" | "viewed" | "updated";
  view: "grid" | "list";
};

export const CARAT_MIN = 0.1;
export const CARAT_MAX = 50;
export const PRICE_MIN = 0;
export const PRICE_MAX = 100000;

export const defaultFilters: FilterState = {
  search: "",
  types: [],
  shapes: [],
  caratMin: CARAT_MIN,
  caratMax: CARAT_MAX,
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
  priceMode: "per_stone",
  origin: "all",
  labs: [],
  certNumber: "",
  countries: [],
  availability: ["available"],
  listingType: "all",
  bulkPricingOnly: false,
  dealerId: "all",
  newWithin: 0,

  colourGrades: [],
  fancyColourMode: false,
  fancyHues: [],
  fancyIntensities: [],
  treatedColour: false,
  clarities: [],
  cutGrades: [],
  polish: [],
  symmetry: [],
  fluorescenceIntensity: [],
  fluorescenceColour: [],
  lengthMin: null,
  lengthMax: null,
  widthMin: null,
  widthMax: null,
  heightMin: null,
  heightMax: null,
  lwRatioMin: null,
  lwRatioMax: null,
  depthPctMin: null,
  depthPctMax: null,
  tablePctMin: null,
  tablePctMax: null,
  girdle: [],
  culetSize: [],
  culetCondition: [],
  shade: [],
  milky: [],
  eyeClean: [],
  blackInclusion: [],
  enhancement: "any",
  hasImages: false,
  hasVideo: false,
  has360: false,
  hasCertScan: false,
  provenance: [],

  primaryColours: [],
  tones: [],
  saturations: [],
  treatments: [],
  clarityTypes: [],
  phenomena: [],
  premiumOriginsOnly: false,
  matchingPairOnly: false,
  parcelOnly: false,
  parcelMinQty: null,

  sort: "newest",
  view: "grid",
};

export const STONE_TYPES = [
  "diamond-natural", "diamond-lab", "ruby", "sapphire", "emerald", "alexandrite",
  "spinel", "tourmaline", "tanzanite", "opal", "garnet", "aquamarine", "morganite",
  "paraiba-tourmaline", "tsavorite", "demantoid", "chrysoberyl", "cats-eye",
  "moonstone", "pearl", "jade", "amethyst", "citrine", "peridot", "iolite",
  "zircon", "rough", "mineral-specimen", "other",
];

export const STONE_TYPE_LABELS: Record<string, string> = {
  "diamond-natural": "Diamond (Natural)",
  "diamond-lab": "Diamond (Lab-grown)",
  "cats-eye": "Cat's Eye",
  "paraiba-tourmaline": "Paraiba Tourmaline",
  rough: "Rough / Uncut",
  "mineral-specimen": "Mineral Specimen",
};

export const SHAPES = [
  "round", "oval", "cushion", "princess", "emerald", "pear", "radiant",
  "asscher", "marquise", "heart", "rose-cut", "old-mine", "old-european",
  "briolette", "cabochon", "trillion", "hexagonal", "portrait", "freeform",
  "baguette", "kite", "shield", "bullet", "lozenge", "halfmoon", "trapezoid",
  "calf", "oval-portuguese", "other",
];

export const SHAPE_LABELS: Record<string, string> = {
  round: "Round Brilliant",
  emerald: "Emerald Cut",
  "rose-cut": "Rose Cut",
  "old-mine": "Old Mine Cut",
  "old-european": "Old European Cut",
  portrait: "Portrait / Slice",
  baguette: "Baguette",
  kite: "Kite",
  halfmoon: "Half Moon",
  trapezoid: "Trapezoid",
  calf: "Calf Head",
  "oval-portuguese": "Oval Portuguese",
};

export const CARAT_BANDS: { label: string; min: number; max: number }[] = [
  { label: "Under 0.5ct", min: 0.1, max: 0.5 },
  { label: "0.5–1ct", min: 0.5, max: 1 },
  { label: "1–2ct", min: 1, max: 2 },
  { label: "2–3ct", min: 2, max: 3 },
  { label: "3–5ct", min: 3, max: 5 },
  { label: "5ct+", min: 5, max: CARAT_MAX },
];

export const PRICE_BANDS: { label: string; min: number; max: number }[] = [
  { label: "Under $500", min: 0, max: 500 },
  { label: "$500–$2,000", min: 500, max: 2000 },
  { label: "$2,000–$5,000", min: 2000, max: 5000 },
  { label: "$5,000–$20,000", min: 5000, max: 20000 },
  { label: "$20,000+", min: 20000, max: PRICE_MAX },
];

export const CERT_LABS = [
  "GIA",
  "IGI",
  "HRD",
  "AGS",
  "GCAL",
  "EGL",
  "GRS",
  "AGL",
  "Gübelin",
  "SSEF",
  "Lotus",
  "GIT",
  "GIA-coloured",
];

export const COUNTRIES = [
  "Myanmar", "Sri Lanka", "Colombia", "Zambia", "India", "Thailand", "Brazil",
  "Madagascar", "Tanzania", "Russia", "Afghanistan", "Australia", "Canada",
  "South Africa", "Mozambique", "Kenya", "Pakistan", "USA",
];

export const PREMIUM_ORIGINS = ["Myanmar", "Sri Lanka", "Colombia", "Brazil"];

// Diamond grades
export const DIAMOND_COLOURS = ["D","E","F","G","H","I","J","K","L","M","N-Z"];
export const FANCY_HUES = ["Yellow","Orange","Pink","Blue","Green","Red","Brown","Grey","Black","Champagne","Cognac","Chameleon","Violet"];
export const FANCY_INTENSITIES = ["Faint","Very Light","Light","Fancy Light","Fancy","Fancy Dark","Fancy Intense","Fancy Vivid","Fancy Deep"];
export const CLARITIES = ["FL","IF","VVS1","VVS2","VS1","VS2","SI1","SI2","I1","I2","I3"];
export const CUT_GRADES = ["Ideal","Excellent","Very Good","Good","Fair","Poor"];
export const FLUOR_INTENSITY = ["None","Faint","Slight","Medium","Strong","Very Strong"];
export const FLUOR_COLOUR = ["Blue","Yellow","Green","Orange","White"];
export const GIRDLE = ["Extremely Thin","Very Thin","Thin","Medium","Slightly Thick","Thick","Very Thick","Extremely Thick"];
export const CULET_SIZE = ["None","Very Small","Small","Medium","Large","Very Large"];
export const CULET_CONDITION = ["Pointed","Polished","Chipped","Abraded"];
export const SHADE_OPTIONS = ["No BGM","No Brown","No Green","No Milky","No Black Inclusion","No Mixed Tinge","No Fancy Tinge"];
export const MILKY = ["None","Very Light","Light","Medium","Heavy"];
export const EYE_CLEAN = ["Yes","Borderline","No"];
export const BLACK_INCLUSION = ["None","Light","Medium","Heavy"];
export const PROVENANCE = ["GIA DOR","Everledger","Tracr","Sarine Journey"];

// Coloured stone
export const TONES = ["Very Light","Light","Medium Light","Medium","Medium Dark","Dark","Very Dark"];
export const SATURATIONS = ["Greyish","Slightly Greyish","Moderately Strong","Strong","Vivid"];
export const TREATMENTS = ["None (unheated)","Heat treated","Fracture filled","Beryllium diffused","Irradiated","Oiled (emeralds)","Resin filled","Coated","Composite","Unknown"];
export const CLARITY_TYPES = ["Eye clean","Lightly included","Moderately included","Heavily included"];
export const PHENOMENA = ["Asterism (star)","Chatoyancy (cat's eye)","Colour change","Adularescence","Labradorescence","Play of colour"];

// Per-stone-type primary colour swatches.
export const PRIMARY_COLOURS: Record<string, { label: string; hex: string }[]> = {
  sapphire: [
    { label: "Royal Blue", hex: "#1a3a8c" },
    { label: "Cornflower Blue", hex: "#6495ed" },
    { label: "Teal", hex: "#0d6b76" },
    { label: "Padparadscha", hex: "#f08e63" },
    { label: "Pink", hex: "#e26a93" },
    { label: "Purple", hex: "#7a4dbf" },
    { label: "Yellow", hex: "#e6c94f" },
    { label: "White", hex: "#f0eee8" },
    { label: "Black", hex: "#1a1a1a" },
  ],
  ruby: [
    { label: "Pigeon Blood", hex: "#a01a1f" },
    { label: "Vivid Red", hex: "#cc1a2b" },
    { label: "Pinkish Red", hex: "#d44062" },
    { label: "Purplish Red", hex: "#8a1a4a" },
  ],
  emerald: [
    { label: "Vivid Green", hex: "#0c8a4a" },
    { label: "Medium Green", hex: "#3aa56e" },
    { label: "Bluish Green", hex: "#1b9c8a" },
    { label: "Yellowish Green", hex: "#5fb33a" },
  ],
  spinel: [
    { label: "Red", hex: "#cc2030" },
    { label: "Pink", hex: "#e26a93" },
    { label: "Hot Pink", hex: "#e63a8a" },
    { label: "Cobalt Blue", hex: "#0047ab" },
    { label: "Lavender", hex: "#b78bd1" },
    { label: "Grey", hex: "#7a7a7a" },
    { label: "Black", hex: "#1a1a1a" },
  ],
  tourmaline: [
    { label: "Paraiba", hex: "#0fb5a5" },
    { label: "Pink", hex: "#e26a93" },
    { label: "Rubellite", hex: "#c92858" },
    { label: "Green", hex: "#3aa56e" },
    { label: "Watermelon", hex: "#d05a82" },
    { label: "Chrome", hex: "#1b9c8a" },
    { label: "Yellow", hex: "#e6c94f" },
    { label: "Bi-colour", hex: "#c47ab8" },
  ],
  "paraiba-tourmaline": [
    { label: "Neon Blue", hex: "#0db3d6" },
    { label: "Blue-Green", hex: "#0fb5a5" },
    { label: "Green", hex: "#15b88c" },
  ],
};

export function isDiamondType(t: string) {
  return t === "diamond-natural" || t === "diamond-lab";
}

export function hasDiamondSelection(types: string[]) {
  return types.length === 0 || types.some(isDiamondType);
}

export function hasColouredSelection(types: string[]) {
  return types.length === 0 || types.some((t) => !isDiamondType(t));
}

export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.search) n++;
  if (f.types.length) n++;
  if (f.shapes.length) n++;
  if (f.caratMin !== CARAT_MIN || f.caratMax !== CARAT_MAX) n++;
  if (f.priceMin !== PRICE_MIN || f.priceMax !== PRICE_MAX) n++;
  if (f.origin !== "all") n++;
  if (f.labs.length) n++;
  if (f.certNumber) n++;
  if (f.countries.length) n++;
  if (f.availability.length !== 1 || f.availability[0] !== "available") n++;
  if (f.listingType !== "all") n++;
  if (f.bulkPricingOnly) n++;
  if (f.dealerId !== "all") n++;
  if (f.newWithin !== 0) n++;
  if (f.colourGrades.length) n++;
  if (f.fancyColourMode) n++;
  if (f.clarities.length) n++;
  if (f.cutGrades.length) n++;
  if (f.polish.length) n++;
  if (f.symmetry.length) n++;
  if (f.fluorescenceIntensity.length) n++;
  if (f.fluorescenceColour.length) n++;
  if (f.girdle.length) n++;
  if (f.culetSize.length) n++;
  if (f.shade.length) n++;
  if (f.milky.length) n++;
  if (f.eyeClean.length) n++;
  if (f.blackInclusion.length) n++;
  if (f.enhancement !== "any") n++;
  if (f.hasImages || f.hasVideo || f.has360 || f.hasCertScan) n++;
  if (f.provenance.length) n++;
  if (f.primaryColours.length) n++;
  if (f.tones.length) n++;
  if (f.saturations.length) n++;
  if (f.treatments.length) n++;
  if (f.clarityTypes.length) n++;
  if (f.phenomena.length) n++;
  if (f.premiumOriginsOnly) n++;
  if (f.matchingPairOnly) n++;
  if (f.parcelOnly) n++;
  return n;
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v && v.trim().length > 0)));
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");
}

function filterValueVariants(value: string): string[] {
  const spaced = value.replace(/-/g, " ");
  const dashed = value.replace(/\s+/g, "-");
  return uniqueValues([
    value,
    spaced,
    dashed,
    titleCase(value),
    titleCase(spaced),
    value.toUpperCase(),
    value.toLowerCase(),
  ]);
}

function normaliseComparable(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function compactComparable(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function textMatchesAny(stored: unknown, selected: string[]): boolean {
  const storedNormal = normaliseComparable(stored);
  const storedCompact = compactComparable(stored);
  return selected.flatMap(filterValueVariants).some((option) => {
    return normaliseComparable(option) === storedNormal || compactComparable(option) === storedCompact;
  });
}

function textContainsAny(stored: unknown, selected: string[]): boolean {
  const storedCompact = compactComparable(stored);
  return selected.flatMap(filterValueVariants).some((option) => {
    const needle = compactComparable(option);
    return needle.length > 0 && storedCompact.includes(needle);
  });
}

function gradeValueVariants(value: string): string[] {
  const compact = compactComparable(value);
  const aliases: Record<string, string[]> = {
    excellent: ["Excellent", "EX", "Exc", "Ex"],
    verygood: ["Very Good", "VG", "V Good", "VeryGood"],
    good: ["Good", "G", "GD"],
    fair: ["Fair", "F"],
    poor: ["Poor", "P"],
    ideal: ["Ideal", "ID"],
    none: ["None", "N", "NO", "Non", "Nil"],
    faint: ["Faint", "FNT", "FA"],
    slight: ["Slight", "SL"],
    medium: ["Medium", "M", "MED"],
    strong: ["Strong", "S", "STG"],
    verystrong: ["Very Strong", "VS", "VST"],
  };
  return uniqueValues([...filterValueVariants(value), ...(aliases[compact] ?? [])]);
}

function clarityValueVariants(value: string): string[] {
  const compact = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return uniqueValues([value, compact, value.toUpperCase(), value.replace(/\s+/g, ""), value.replace(/-/g, "")]);
}

function stoneTypeMatches(stored: unknown, selected: string): boolean {
  return normaliseComparable(stored) === normaliseComparable(selected);
}

function originMatches(stored: unknown, selected: "natural" | "lab-grown"): boolean {
  const value = normaliseComparable(stored);
  if (selected === "lab-grown") {
    return ["lab-grown", "lab", "cvd", "hpht"].includes(value);
  }
  return value === "natural";
}

function shapeValuesForFilter(shape: string): string[] {
  const map: Record<string, string[]> = {
    round: ["Round", "Round Brilliant", "Brilliant Round", "RD"],
    oval: ["Oval", "Oval Brilliant", "Oval Portuguese"],
    cushion: ["Cushion", "Cushion Brilliant", "Cushion Modified", "Cushion Modified Brilliant"],
    princess: ["Princess", "Princess Cut"],
    emerald: ["Emerald", "Emerald Cut"],
    pear: ["Pear", "Pear Shape", "Pear Brilliant"],
    radiant: ["Radiant", "Radiant Cut"],
    asscher: ["Asscher", "Asscher Cut"],
    marquise: ["Marquise", "Marquise Brilliant"],
    heart: ["Heart", "Heart Shape"],
    "rose-cut": ["Rose Cut", "Rosecut"],
    "old-mine": ["Old Mine", "Old Mine Cut"],
    "old-european": ["Old European", "Old European Cut"],
    briolette: ["Briolette"],
    cabochon: ["Cabochon", "Cab"],
    trillion: ["Trillion", "Trilliant", "Triangular"],
    hexagonal: ["Hexagonal", "Hexagon"],
    portrait: ["Portrait", "Portrait Cut", "Slice"],
    freeform: ["Freeform", "Free Form", "Fancy Shape"],
    baguette: ["Baguette", "Tapered Baguette", "Straight Baguette"],
    kite: ["Kite"],
    shield: ["Shield"],
    bullet: ["Bullet"],
    lozenge: ["Lozenge"],
    halfmoon: ["Half Moon", "Halfmoon"],
    trapezoid: ["Trapezoid", "Trapeze"],
    calf: ["Calf", "Calf Head"],
    "oval-portuguese": ["Oval Portuguese"],
  };
  return uniqueValues([shape, titleCase(shape), ...(map[shape] ?? [])].flatMap(filterValueVariants));
}

// Apply filter state to a raw stone row (client-side filtering).
export function applyFilters(stones: any[], f: FilterState): any[] {
  let list = stones;

  if (f.dealerId !== "all") list = list.filter((s) => s.dealer_id === f.dealerId);
  if (f.types.length) {
    list = list.filter((s) => {
      const isDiamond = stoneTypeMatches(s.stone_type, "diamond");
      if (f.types.includes("diamond-natural") && isDiamond && !originMatches(s.origin, "lab-grown")) return true;
      if (f.types.includes("diamond-lab") && isDiamond && originMatches(s.origin, "lab-grown")) return true;
      return f.types.some((type) => stoneTypeMatches(s.stone_type, type));
    });
  }
  if (f.shapes.length) {
    const shapes = new Set(f.shapes.flatMap(shapeValuesForFilter).map(normaliseComparable));
    list = list.filter((s) => s.shape && shapes.has(normaliseComparable(s.shape)));
  }
  if (f.labs.length) {
    list = list.filter((s) => s.cert_lab && textMatchesAny(s.cert_lab, f.labs));
  }
  if (f.certNumber.trim()) {
    const q = f.certNumber.trim().toLowerCase();
    list = list.filter((s) => s.cert_number?.toLowerCase().includes(q));
  }
  if (f.countries.length) list = list.filter((s) => s.country_of_origin && f.countries.includes(s.country_of_origin));
  if (f.origin !== "all") {
    const originSel = f.origin;
    list = list.filter((s) => originMatches(s.origin, originSel));
  }
  if (f.availability.length) list = list.filter((s) => f.availability.includes(s.status));
  if (f.listingType !== "all") list = list.filter((s) => (s.listing_type ?? "single") === f.listingType);
  if (f.bulkPricingOnly) list = list.filter((s) => s.bulk_pricing_available);

  if (f.newWithin > 0) {
    const cutoff = Date.now() - f.newWithin * 24 * 60 * 60 * 1000;
    list = list.filter((s) => new Date(s.created_at).getTime() >= cutoff);
  }

  list = list.filter((s) => {
    const c = Number(s.carat_weight ?? 0);
    if (f.caratMin !== CARAT_MIN && c < f.caratMin) return false;
    if (f.caratMax !== CARAT_MAX && c > f.caratMax) return false;
    return true;
  });
  list = list.filter((s) => {
    const price = Number(s.wholesale_price_usd ?? 0);
    const c = Number(s.carat_weight ?? 1) || 1;
    const value = f.priceMode === "per_carat" ? price / c : price;
    if (f.priceMin !== PRICE_MIN && value < f.priceMin) return false;
    if (f.priceMax !== PRICE_MAX && value > f.priceMax) return false;
    return true;
  });

  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    list = list.filter(
      (s) =>
        s.stone_type?.toLowerCase().includes(q) ||
        s.shape?.toLowerCase().includes(q) ||
        s.country_of_origin?.toLowerCase().includes(q) ||
        s.colour_grade?.toLowerCase().includes(q) ||
        s.cert_lab?.toLowerCase().includes(q),
    );
  }

  // Diamond-only
  if (f.colourGrades.length) {
    list = list.filter((s) => s.colour_grade && textMatchesAny(s.colour_grade, f.colourGrades));
  }
  if (f.fancyHues.length) {
    list = list.filter((s) => textContainsAny(s.colour_hue, f.fancyHues) || textContainsAny(s.colour_grade, f.fancyHues));
  }
  if (f.fancyIntensities.length) {
    list = list.filter((s) => s.colour_saturation && textMatchesAny(s.colour_saturation, f.fancyIntensities.flatMap(gradeValueVariants)));
  }
  if (f.clarities.length) list = list.filter((s) => s.clarity_grade && textMatchesAny(s.clarity_grade, f.clarities.flatMap(clarityValueVariants)));
  if (f.cutGrades.length) list = list.filter((s) => s.cut_grade && textMatchesAny(s.cut_grade, f.cutGrades.flatMap(gradeValueVariants)));
  if (f.polish.length) list = list.filter((s) => s.polish && textMatchesAny(s.polish, f.polish.flatMap(gradeValueVariants)));
  if (f.symmetry.length) list = list.filter((s) => s.symmetry && textMatchesAny(s.symmetry, f.symmetry.flatMap(gradeValueVariants)));
  if (f.fluorescenceIntensity.length) list = list.filter((s) => s.fluorescence && textMatchesAny(s.fluorescence, f.fluorescenceIntensity.flatMap(gradeValueVariants)));
  if (f.fluorescenceColour.length) list = list.filter((s) => s.fluorescence_colour && textMatchesAny(s.fluorescence_colour, f.fluorescenceColour));
  if (f.girdle.length) list = list.filter((s) => s.girdle && textContainsAny(s.girdle, f.girdle));
  if (f.culetSize.length) list = list.filter((s) => s.culet_size && textMatchesAny(s.culet_size, f.culetSize));
  if (f.milky.length) list = list.filter((s) => s.milky && textMatchesAny(s.milky, f.milky));
  if (f.eyeClean.length) list = list.filter((s) => s.eye_clean && textMatchesAny(s.eye_clean, f.eyeClean));
  if (f.blackInclusion.length) list = list.filter((s) => s.black_inclusion && textMatchesAny(s.black_inclusion, f.blackInclusion));

  const ranges: [number | null, number | null, string][] = [
    [f.lengthMin, f.lengthMax, "measurements_length"],
    [f.widthMin, f.widthMax, "measurements_width"],
    [f.heightMin, f.heightMax, "measurements_height"],
    [f.lwRatioMin, f.lwRatioMax, "lw_ratio"],
    [f.depthPctMin, f.depthPctMax, "depth_pct"],
    [f.tablePctMin, f.tablePctMax, "table_pct"],
  ];
  for (const [mn, mx, col] of ranges) {
    if (mn != null) list = list.filter((s) => Number(s[col] ?? 0) >= mn);
    if (mx != null) list = list.filter((s) => Number(s[col] ?? Number.POSITIVE_INFINITY) <= mx);
  }

  if (f.enhancement === "only") list = list.filter((s) => s.enhancement && s.enhancement !== "none");
  if (f.enhancement === "exclude") list = list.filter((s) => !s.enhancement || s.enhancement === "none");

  if (f.hasImages) list = list.filter((s) => (s.stone_images?.length ?? 0) > 0);
  if (f.hasVideo) list = list.filter((s) => s.has_video);
  if (f.has360) list = list.filter((s) => s.has_360);
  if (f.hasCertScan) list = list.filter((s) => !!s.cert_url);
  if (f.provenance.length) list = list.filter((s) => s.provenance_report && f.provenance.includes(s.provenance_report));

  // Coloured
  if (f.primaryColours.length) {
    list = list.filter((s) => textContainsAny(s.colour_hue, f.primaryColours) || textContainsAny(s.colour_grade, f.primaryColours));
  }
  if (f.tones.length) list = list.filter((s) => s.colour_tone && textMatchesAny(s.colour_tone, f.tones));
  if (f.saturations.length) list = list.filter((s) => s.colour_saturation && textMatchesAny(s.colour_saturation, f.saturations));
  if (f.treatments.length) list = list.filter((s) => s.treatment && textMatchesAny(s.treatment, f.treatments));
  if (f.phenomena.length) list = list.filter((s) => s.phenomenon && textMatchesAny(s.phenomenon, f.phenomena));
  if (f.premiumOriginsOnly) list = list.filter((s) => s.country_of_origin && textMatchesAny(s.country_of_origin, PREMIUM_ORIGINS));
  if (f.matchingPairOnly) list = list.filter((s) => s.matching_pair);
  if (f.parcelOnly) list = list.filter((s) => (s.listing_type ?? "single") === "parcel");
  if (f.parcelMinQty != null) list = list.filter((s) => (s.parcel_quantity ?? 0) >= (f.parcelMinQty ?? 0));

  switch (f.sort) {
    case "price-asc":
      list = [...list].sort((a, b) => Number(a.wholesale_price_usd) - Number(b.wholesale_price_usd));
      break;
    case "price-desc":
      list = [...list].sort((a, b) => Number(b.wholesale_price_usd) - Number(a.wholesale_price_usd));
      break;
    case "carat":
      list = [...list].sort((a, b) => Number(b.carat_weight) - Number(a.carat_weight));
      break;
    case "viewed":
      list = [...list].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
      break;
    case "updated":
      list = [...list].sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime());
      break;
    default:
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return list;
}
