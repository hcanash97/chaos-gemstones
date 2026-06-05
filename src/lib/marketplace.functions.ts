import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PREMIUM_ORIGINS, type FilterState } from "@/lib/marketplace/filters";

export const PAGE_SIZE = 48;

const STONE_SELECT =
  "id, dealer_id, stone_type, shape, carat_weight, origin, country_of_origin, cert_lab, cert_number, cert_url, wholesale_price_usd, colour_grade, clarity_grade, cut_grade, polish, symmetry, fluorescence, fluorescence_colour, colour_hue, colour_tone, colour_saturation, treatment, phenomenon, status, listing_type, parcel_quantity, matching_pair, has_video, has_360, view_count, bulk_pricing_available, enhancement, girdle, culet_size, milky, eye_clean, black_inclusion, provenance_report, measurements_length, measurements_width, measurements_height, lw_ratio, depth_pct, table_pct, created_at, updated_at, stone_images(storage_url, external_image_url, is_primary, sort_order), profiles:dealer_id(country, is_verified)";

export type SearchInput = {
  filters: Partial<FilterState>;
  page: number;
};

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
  return uniqueValues([value, titleCase(value), value.toUpperCase(), value.toLowerCase()]);
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
  return uniqueValues([shape, titleCase(shape), ...(map[shape] ?? [])]);
}

export const searchMarketplace = createServerFn({ method: "POST" })
  .inputValidator((input: SearchInput) => input)
  .handler(async ({ data }) => {
    const f = data.filters ?? {};
    const page = Math.max(1, Number(data.page ?? 1));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

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

    // Stone types (with diamond natural/lab special handling)
    if (f.types && f.types.length) {
      const wantsDiamondNat = f.types.includes("diamond-natural");
      const wantsDiamondLab = f.types.includes("diamond-lab");
      const others = f.types.filter((t) => t !== "diamond-natural" && t !== "diamond-lab");
      const expanded: string[] = [...others];
      if (wantsDiamondNat || wantsDiamondLab) expanded.push("diamond");
      q = q.in("stone_type", expanded);
      if (wantsDiamondNat && !wantsDiamondLab) q = q.neq("origin", "lab-grown");
      if (wantsDiamondLab && !wantsDiamondNat) q = q.eq("origin", "lab-grown");
    }

    if (f.shapes && f.shapes.length) q = q.in("shape", uniqueValues(f.shapes.flatMap(shapeValuesForFilter)));
    if (f.labs && f.labs.length) q = q.in("cert_lab", f.labs);
    if (f.certNumber && f.certNumber.trim()) q = q.ilike("cert_number", `%${f.certNumber.trim()}%`);
    if (f.countries && f.countries.length) q = q.in("country_of_origin", f.countries);
    if (f.origin && f.origin !== "all") q = q.eq("origin", f.origin);
    if (f.listingType && f.listingType !== "all") q = q.eq("listing_type", f.listingType);
    if (f.bulkPricingOnly) q = q.eq("bulk_pricing_available", true);

    if (f.newWithin && f.newWithin > 0) {
      const cutoff = new Date(Date.now() - f.newWithin * 86400000).toISOString();
      q = q.gte("created_at", cutoff);
    }

    // Carat
    if (typeof f.caratMin === "number") q = q.gte("carat_weight", f.caratMin);
    if (typeof f.caratMax === "number") q = q.lte("carat_weight", f.caratMax);

    // Price (per_stone only server-side; per_carat applied client-side)
    if ((f.priceMode ?? "per_stone") === "per_stone") {
      if (typeof f.priceMin === "number") q = q.gte("wholesale_price_usd", f.priceMin);
      if (typeof f.priceMax === "number") q = q.lte("wholesale_price_usd", f.priceMax);
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
    if (f.fancyHues && f.fancyHues.length) q = q.in("colour_hue", uniqueValues(f.fancyHues.flatMap(filterValueVariants)));
    if (f.fancyIntensities && f.fancyIntensities.length) q = q.in("colour_saturation", uniqueValues(f.fancyIntensities.flatMap(filterValueVariants)));
    if (f.clarities && f.clarities.length) q = q.in("clarity_grade", f.clarities);
    if (f.cutGrades && f.cutGrades.length) q = q.in("cut_grade", f.cutGrades);
    if (f.polish && f.polish.length) q = q.in("polish", f.polish);
    if (f.symmetry && f.symmetry.length) q = q.in("symmetry", f.symmetry);
    if (f.fluorescenceIntensity && f.fluorescenceIntensity.length)
      q = q.in("fluorescence", f.fluorescenceIntensity);
    if (f.fluorescenceColour && f.fluorescenceColour.length)
      q = q.in("fluorescence_colour", f.fluorescenceColour);
    if (f.girdle && f.girdle.length) q = q.in("girdle", f.girdle);
    if (f.culetSize && f.culetSize.length) q = q.in("culet_size", f.culetSize);
    if (f.culetCondition && f.culetCondition.length) q = q.in("culet_condition", f.culetCondition);
    if (f.milky && f.milky.length) q = q.in("milky", f.milky);
    if (f.eyeClean && f.eyeClean.length) q = q.in("eye_clean", f.eyeClean);
    if (f.blackInclusion && f.blackInclusion.length) q = q.in("black_inclusion", f.blackInclusion);
    if (f.provenance && f.provenance.length) q = q.in("provenance_report", f.provenance);

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
    if (f.primaryColours && f.primaryColours.length) q = q.in("colour_hue", uniqueValues(f.primaryColours.flatMap(filterValueVariants)));
    if (f.tones && f.tones.length) q = q.in("colour_tone", f.tones);
    if (f.saturations && f.saturations.length) q = q.in("colour_saturation", f.saturations);
    if (f.treatments && f.treatments.length) q = q.in("treatment", f.treatments);
    if (f.phenomena && f.phenomena.length) q = q.in("phenomenon", f.phenomena);
    if (f.premiumOriginsOnly) q = q.in("country_of_origin", PREMIUM_ORIGINS);
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
        q = q.order("created_at", { ascending: false });
    }

    q = q.range(from, to);

    const { data: rows, count, error } = await q;
    if (error) {
      console.error("[marketplace search]", error);
      return { stones: [], total: 0, page, pageSize: PAGE_SIZE, error: error.message };
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

    return { stones, total: count ?? 0, page, pageSize: PAGE_SIZE, error: null };
  });
