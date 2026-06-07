import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CARAT_MAX, CARAT_MIN, PREMIUM_ORIGINS, PRICE_MAX, PRICE_MIN, type FilterState } from "@/lib/marketplace/filters";

export const PAGE_SIZE = 24; // was 48 — halving gives ~2× faster page loads

// ── Card-only columns (19 fields the StoneCard actually uses) ─────────────────
// The full row is fetched on the stone detail page. The marketplace card does
// not need cert_url, measurements, depth_pct, table_pct, lw_ratio, etc.
const STONE_SELECT =
  "id, dealer_id, stone_type, shape, carat_weight, origin, country_of_origin, " +
  "cert_lab, wholesale_price_usd, price_currency, colour_grade, clarity_grade, " +
  "treatment, status, listing_type, matching_pair, has_video, has_360, has_image, " +
  "created_at, updated_at, " +
  "stone_images(storage_url, external_image_url, is_primary, sort_order), " +
  "profiles:dealer_id(country, is_verified)";

// ── Cached market total ───────────────────────────────────────────────────────
// The total count of available stones changes slowly (dealer uploads, not
// every page load). Cache it for 60 seconds to avoid a COUNT(*) on every request.
let _cachedTotal: number | null = null;
let _cachedTotalAt = 0;
const TOTAL_TTL_MS = 60_000;

async function getMarketplaceTotal(): Promise<number> {
  const now = Date.now();
  if (_cachedTotal !== null && now - _cachedTotalAt < TOTAL_TTL_MS) {
    return _cachedTotal;
  }
  const { count, error } = await supabaseAdmin
    .from("stones")
    .select("id", { count: "planned", head: true })
    .eq("is_test", false)
    .eq("feed_inactive", false)
    .eq("status", "available");
  if (error) {
    console.error("[marketplace total]", error);
    return _cachedTotal ?? 0;
  }
  _cachedTotal = count ?? 0;
  _cachedTotalAt = now;
  return _cachedTotal;
}

export type SearchInput = {
  filters: Partial<FilterState>;
  page: number;
};

export type FilterDiagnosticsInput = {
  filters: Partial<FilterState>;
};

const DIAGNOSTIC_FIELDS = [
  "stone_type",
  "origin",
  "shape",
  "cert_lab",
  "colour_grade",
  "colour_hue",
  "colour_saturation",
  "cut_grade",
  "polish",
  "symmetry",
  "fluorescence",
  "treatment",
] as const;

type DiagnosticField = (typeof DIAGNOSTIC_FIELDS)[number];

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

function compactValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function gradeValueVariants(value: string): string[] {
  const compact = compactValue(value);
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
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return uniqueValues([value, compact, value.toUpperCase(), value.replace(/\s+/g, ""), value.replace(/-/g, "")]);
}

function normalizedFilterSet(values: string[]): string[] {
  return uniqueValues(values.flatMap((value) => {
    const variants = filterValueVariants(value);
    return [...variants, ...variants.map(compactValue)];
  }));
}

function escapeFilterText(value: string): string {
  return value.replace(/[%(),]/g, "").trim();
}

function ilikeAny(columns: string[], values: string[]): string {
  const terms = uniqueValues(values.map(escapeFilterText).filter(Boolean));
  return columns
    .flatMap((column) => terms.map((value) => `${column}.ilike.%${value}%`))
    .join(",");
}

function stoneTypeValuesForFilter(type: string): string[] {
  const map: Record<string, string[]> = {
    diamond: ["diamond", "Diamond", "DIAMOND"],
    ruby: ["ruby", "Ruby", "RUBY"],
    sapphire: ["sapphire", "Sapphire", "SAPPHIRE"],
    emerald: ["emerald", "Emerald", "EMERALD"],
  };
  return uniqueValues([type, titleCase(type), type.toUpperCase(), ...(map[type] ?? [])]);
}

function originValuesForFilter(origin: "natural" | "lab-grown"): string[] {
  if (origin === "lab-grown") {
    return [
      "lab-grown",
      "Lab-grown",
      "Lab-Grown",
      "LAB-GROWN",
      "lab grown",
      "Lab Grown",
      "LAB GROWN",
      "lab",
      "Lab",
      "CVD",
      "HPHT",
    ];
  }
  return ["natural", "Natural", "NATURAL"];
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

export const searchMarketplace = createServerFn({ method: "POST" })
  .inputValidator((input: SearchInput) => input)
  .handler(async ({ data }) => {
    const f = data.filters ?? {};
    const page = Math.max(1, Number(data.page ?? 1));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const marketTotalPromise = getMarketplaceTotal();

    let q = supabaseAdmin
      .from("stones")
      .select(STONE_SELECT, { count: "planned" })
      .eq("is_test", false)
      .eq("feed_inactive", false);

    // Availability (defaults to ['available'])
    const availability = f.availability && f.availability.length ? f.availability : (["available"] as const);
    q = q.in("status", availability as readonly ("available" | "reserved" | "sold")[]);

    // Dealer
    if (f.dealerId && f.dealerId !== "all") q = q.eq("dealer_id", f.dealerId);

    // Stone types — use generated lowercase column for exact match (no case variants needed)
    if (f.types && f.types.length) {
      const wantsDiamondNat = f.types.includes("diamond-natural");
      const wantsDiamondLab = f.types.includes("diamond-lab");
      const others = f.types.filter((t) => t !== "diamond-natural" && t !== "diamond-lab");

      // Normalise to lowercase for the generated column
      const typeValues: string[] = others.map((t) => t.toLowerCase());
      if (wantsDiamondNat || wantsDiamondLab) typeValues.push("diamond");

      q = q.in("stone_type_lower", uniqueValues(typeValues));

      // Origin sub-filter for diamond natural/lab split
      if (wantsDiamondNat && !wantsDiamondLab) {
        q = q.or("origin_lower.is.null,origin_lower.in.(natural)");
      }
      if (wantsDiamondLab && !wantsDiamondNat) {
        q = q.in("origin_lower", ["lab-grown", "lab grown", "lab", "cvd", "hpht"]);
      }
    }

    if (f.shapes && f.shapes.length) q = q.in("shape", uniqueValues(f.shapes.flatMap(shapeValuesForFilter)));
    if (f.labs && f.labs.length) q = q.in("cert_lab", uniqueValues(f.labs.flatMap(filterValueVariants)));
    if (f.certNumber && f.certNumber.trim()) q = q.ilike("cert_number", `%${f.certNumber.trim()}%`);
    if (f.countries && f.countries.length) q = q.in("country_of_origin", f.countries);
    if (f.origin && f.origin !== "all") {
      if (f.origin === "lab-grown") {
        q = q.in("origin_lower", ["lab-grown", "lab grown", "lab", "cvd", "hpht"]);
      } else {
        q = q.in("origin_lower", ["natural"]);
      }
    }
    if (f.listingType && f.listingType !== "all") q = q.eq("listing_type", f.listingType);
    if (f.bulkPricingOnly) q = q.eq("bulk_pricing_available", true);

    if (f.newWithin && f.newWithin > 0) {
      const cutoff = new Date(Date.now() - f.newWithin * 86400000).toISOString();
      q = q.gte("created_at", cutoff);
    }

    // Carat: default slider values are display defaults, not restrictive filters.
    if (typeof f.caratMin === "number" && f.caratMin !== CARAT_MIN) q = q.gte("carat_weight", f.caratMin);
    if (typeof f.caratMax === "number" && f.caratMax !== CARAT_MAX) q = q.lte("carat_weight", f.caratMax);

    // Price: default slider values are display defaults, not restrictive filters.
    const priceMinActive = typeof f.priceMin === "number" && f.priceMin !== PRICE_MIN;
    const priceMaxActive = typeof f.priceMax === "number" && f.priceMax !== PRICE_MAX;
    if ((f.priceMode ?? "per_stone") === "per_stone") {
      if (priceMinActive) q = q.gte("wholesale_price_usd", f.priceMin);
      if (priceMaxActive) q = q.lte("wholesale_price_usd", f.priceMax);
    } else if (priceMinActive || priceMaxActive) {
      // PostgREST cannot easily filter calculated price-per-carat here without
      // an RPC, so fetch candidates server-side without pretending the current
      // page is the complete matching set.
      if (priceMinActive) q = q.gte("wholesale_price_usd", 0);
    }

    // Search (or across fields)
    if (f.search && f.search.trim()) {
      const s = f.search.trim().replace(/[%,()]/g, "");
      q = q.or(
        `stone_type.ilike.%${s}%,shape.ilike.%${s}%,country_of_origin.ilike.%${s}%,colour_grade.ilike.%${s}%,cert_lab.ilike.%${s}%`,
      );
    }

    // Diamond-specific
    if (f.colourGrades && f.colourGrades.length) q = q.in("colour_grade", uniqueValues(f.colourGrades.flatMap(filterValueVariants)));
    if (f.fancyHues && f.fancyHues.length) q = q.or(ilikeAny(["colour_hue", "colour_grade"], f.fancyHues));
    if (f.fancyIntensities && f.fancyIntensities.length) q = q.in("colour_saturation", uniqueValues(f.fancyIntensities.flatMap(gradeValueVariants)));
    if (f.clarities && f.clarities.length) q = q.in("clarity_grade", uniqueValues(f.clarities.flatMap(clarityValueVariants)));
    if (f.cutGrades && f.cutGrades.length) q = q.in("cut_grade", uniqueValues(f.cutGrades.flatMap(gradeValueVariants)));
    if (f.polish && f.polish.length) q = q.in("polish", uniqueValues(f.polish.flatMap(gradeValueVariants)));
    if (f.symmetry && f.symmetry.length) q = q.in("symmetry", uniqueValues(f.symmetry.flatMap(gradeValueVariants)));
    if (f.fluorescenceIntensity && f.fluorescenceIntensity.length)
      q = q.in("fluorescence", uniqueValues(f.fluorescenceIntensity.flatMap(gradeValueVariants)));
    if (f.fluorescenceColour && f.fluorescenceColour.length)
      q = q.in("fluorescence_colour", normalizedFilterSet(f.fluorescenceColour));
    if (f.girdle && f.girdle.length) q = q.or(ilikeAny(["girdle"], f.girdle));
    if (f.culetSize && f.culetSize.length) q = q.in("culet_size", normalizedFilterSet(f.culetSize));
    if (f.culetCondition && f.culetCondition.length) q = q.in("culet_condition", normalizedFilterSet(f.culetCondition));
    if (f.milky && f.milky.length) q = q.in("milky", normalizedFilterSet(f.milky));
    if (f.eyeClean && f.eyeClean.length) q = q.in("eye_clean", normalizedFilterSet(f.eyeClean));
    if (f.blackInclusion && f.blackInclusion.length) q = q.in("black_inclusion", normalizedFilterSet(f.blackInclusion));
    if (f.provenance && f.provenance.length) q = q.in("provenance_report", normalizedFilterSet(f.provenance));

    if (f.enhancement === "only") q = q.neq("enhancement", "none").not("enhancement", "is", null);
    if (f.enhancement === "exclude") q = q.or("enhancement.is.null,enhancement.eq.none");

    // Measurement ranges
    const ranges: [keyof FilterState, keyof FilterState, string][] = [
      ["lengthMin", "lengthMax", "measurements_length"],
      ["widthMin", "widthMax", "measurements_width"],
      ["heightMin", "heightMax", "measurements_height"],
      ["lwRatioMin", "lwRatioMax", "lw_ratio"],
      ["depthPctMin", "depthPctMax", "depth_pct"],
      ["tablePctMin", "tablePctMax", "table_pct"],
    ];
    for (const [mnK, mxK, col] of ranges) {
      const mn = f[mnK] as number | null | undefined;
      const mx = f[mxK] as number | null | undefined;
      if (typeof mn === "number") q = q.gte(col, mn);
      if (typeof mx === "number") q = q.lte(col, mx);
    }

    // Media
    if (f.hasVideo) q = q.eq("has_video", true);
    if (f.has360) q = q.eq("has_360", true);
    if (f.hasCertScan) q = q.not("cert_url", "is", null);

    // Coloured
    if (f.primaryColours && f.primaryColours.length) q = q.or(ilikeAny(["colour_hue", "colour_grade"], f.primaryColours));
    if (f.tones && f.tones.length) q = q.in("colour_tone", normalizedFilterSet(f.tones));
    if (f.saturations && f.saturations.length) q = q.in("colour_saturation", normalizedFilterSet(f.saturations));
    if (f.treatments && f.treatments.length) q = q.in("treatment", normalizedFilterSet(f.treatments));
    if (f.phenomena && f.phenomena.length) q = q.in("phenomenon", normalizedFilterSet(f.phenomena));
    if (f.premiumOriginsOnly) q = q.in("country_of_origin", uniqueValues(PREMIUM_ORIGINS.flatMap(filterValueVariants)));
    if (f.matchingPairOnly) q = q.eq("matching_pair", true);
    if (f.parcelOnly) q = q.eq("listing_type", "parcel");
    if (typeof f.parcelMinQty === "number") q = q.gte("parcel_quantity", f.parcelMinQty);

    // Sort
    switch (f.sort) {
      case "price-asc":
        q = q.order("wholesale_price_usd", { ascending: true, nullsFirst: false });
        break;
      case "price-desc":
        q = q.order("wholesale_price_usd", { ascending: false, nullsFirst: false });
        break;
      case "carat":
        q = q.order("carat_weight", { ascending: false, nullsFirst: false });
        break;
      case "viewed":
        q = q.order("view_count", { ascending: false });
        break;
      case "updated":
        q = q.order("updated_at", { ascending: false });
        break;
      default:
        // Image-first: stones with at least one image always precede imageless ones.
        // Within each tier, newest first. has_image is maintained by DB trigger.
        q = q
          .order("has_image", { ascending: false, nullsFirst: false })
          .order("has_360",   { ascending: false, nullsFirst: false })
          .order("has_video", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
    }

    q = q.range(from, to);

    const { data: rows, count, error } = await q;
    if (error) {
      console.error("[marketplace search]", error);
      return { stones: [], total: 0, marketTotal: await marketTotalPromise, page, pageSize: PAGE_SIZE, error: error.message };
    }

    const stones = (rows ?? []).map((s: any) => {
      const sortedImgs = [...(s.stone_images ?? [])].sort(
        (a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99),
      );
      const primaryImg = sortedImgs.find((i: any) => i.is_primary) ?? sortedImgs[0];
      return {
        ...s,
        image: (primaryImg?.storage_url || primaryImg?.external_image_url) ?? null,
        dealer_country: s.profiles?.country ?? null,
        dealer_verified: !!s.profiles?.is_verified,
      };
    });

    return { stones, total: count ?? 0, marketTotal: await marketTotalPromise, page, pageSize: PAGE_SIZE, error: null };
  });

export const getMarketplaceFilterDiagnostics = createServerFn({ method: "POST" })
  .inputValidator((input: FilterDiagnosticsInput) => input)
  .handler(async ({ data }) => {
    const f = data.filters ?? {};
    const { data: rows, error } = await supabaseAdmin
      .from("stones")
      .select(DIAGNOSTIC_FIELDS.join(", "))
      .eq("is_test", false)
      .eq("feed_inactive", false)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) return { error: error.message, sampleSize: 0, fields: {} };

    const fields: Record<DiagnosticField, Array<{ value: string; count: number }>> = {} as Record<
      DiagnosticField,
      Array<{ value: string; count: number }>
    >;

    for (const field of DIAGNOSTIC_FIELDS) {
      const counts = new Map<string, number>();
      for (const row of rows ?? []) {
        const value = String((row as Record<string, unknown>)[field] ?? "").trim();
        if (!value) continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      fields[field] = Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
        .slice(0, 20);
    }

    return {
      error: null,
      sampleSize: rows?.length ?? 0,
      activeFilters: {
        types: f.types ?? [],
        shapes: f.shapes ?? [],
        labs: f.labs ?? [],
        origin: f.origin ?? "all",
        colourGrades: f.colourGrades ?? [],
        fancyHues: f.fancyHues ?? [],
        fancyIntensities: f.fancyIntensities ?? [],
        cutGrades: f.cutGrades ?? [],
        polish: f.polish ?? [],
        symmetry: f.symmetry ?? [],
        treatments: f.treatments ?? [],
      },
      fields,
    };
  });
