import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { inferCountryFromCity, normalizeCountryName, normalizeProfileLocation } from "@/lib/countries";

async function requireAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required.");
  return supabaseAdmin;
}

type ProfileQualityIssue = {
  id: string;
  accountType: string | null;
  companyName: string | null;
  fullName: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  severity: "error" | "warning";
  field: "country" | "city" | "company_name" | "dealer_profile" | "jeweller_profile";
  message: string;
  suggestedCountry: string | null;
  href: string | null;
};

type ProfileCompleteness = {
  id: string;
  accountType: string | null;
  name: string;
  email: string | null;
  city: string | null;
  country: string | null;
  score: number;
  level: "strong" | "good" | "needs_work" | "poor";
  missing: string[];
  recommended: string[];
  stoneCount: number;
  href: string | null;
};

function profileHref(id: string, accountType?: string | null) {
  return accountType === "dealer" ? `/admin/dealer/${id}` : null;
}

function profileLabel(p: { company_name: string | null; full_name: string | null; email: string | null; id: string }) {
  return p.company_name || p.full_name || p.email || p.id.slice(0, 8);
}

function hasText(value: unknown, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength;
}

function hasArray(value: unknown) {
  return Array.isArray(value) && value.filter((item) => hasText(item)).length > 0;
}

function completenessLevel(score: number): ProfileCompleteness["level"] {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  if (score >= 45) return "needs_work";
  return "poor";
}

function scoreProfileCompleteness({
  profile,
  dealer,
  jeweller,
  stoneCount,
}: {
  profile: any;
  dealer?: any;
  jeweller?: any;
  stoneCount: number;
}): ProfileCompleteness {
  const accountType = profile.account_type ?? null;
  const name = profileLabel(profile);
  const missing: string[] = [];
  const recommended: string[] = [];
  let score = 0;

  const add = (ok: boolean, points: number, label: string, bucket: "missing" | "recommended" = "missing") => {
    if (ok) {
      score += points;
      return;
    }
    if (bucket === "missing") missing.push(label);
    else recommended.push(label);
  };

  add(hasText(profile.company_name), 10, "Company name");
  add(hasText(profile.email), 5, "Contact email");
  add(hasText(profile.city), 5, "City");
  add(hasText(profile.country) && !["europe", "asia", "south asia", "middle east"].includes(String(profile.country).toLowerCase()), 10, "Specific country");
  add(hasText(profile.website) || hasText(profile.phone), 5, "Website or phone", "recommended");
  add(!!profile.is_verified, 5, "Admin verification", "recommended");

  if (accountType === "dealer") {
    add(hasText(dealer?.slug), 8, "Vendor profile slug");
    add(hasText(dealer?.logo_url), 8, "Logo image", "recommended");
    add(hasText(dealer?.tagline), 6, "Short public tagline", "recommended");
    add(hasText(dealer?.story, 80) || hasText(dealer?.bio, 80), 12, "Public story or detailed bio");
    add(hasArray(dealer?.specialities) || hasArray(dealer?.supplier_services), 8, "Specialities or supplier services");
    add(stoneCount > 0, 12, "Live inventory");
    add(hasText(dealer?.external_feed_url) || !!dealer?.whatsapp_first, 6, "Inventory workflow: API feed or WhatsApp-first supplier mode", "recommended");
    add(Number(dealer?.years_trading ?? 0) > 0, 4, "Years trading", "recommended");
    add(Number(dealer?.response_time_hours ?? 0) > 0, 2, "Expected response time", "recommended");
  } else if (accountType === "jeweller") {
    add(hasText(jeweller?.slug), 8, "Public jeweller slug", "recommended");
    add(hasText(jeweller?.logo_url), 8, "Logo image", "recommended");
    add(hasText(jeweller?.tagline), 6, "Short public tagline", "recommended");
    add(hasText(jeweller?.bio, 80), 12, "Public jeweller bio", "recommended");
    add(hasArray(jeweller?.specialities), 8, "Jewellery specialities", "recommended");
    add(!jeweller?.is_public || hasText(jeweller?.slug), 8, "Public profile route");
    add(!!jeweller?.is_public, 5, "Public jeweller profile", "recommended");
    add(hasText(profile.website), 8, "Website", "recommended");
  }

  const cappedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    id: profile.id,
    accountType,
    name,
    email: profile.email ?? null,
    city: profile.city ?? null,
    country: profile.country ?? null,
    score: cappedScore,
    level: completenessLevel(cappedScore),
    missing,
    recommended,
    stoneCount,
    href: profileHref(profile.id, accountType),
  };
}

function locationIssuesForProfile(p: {
  id: string;
  account_type: string | null;
  company_name: string | null;
  full_name: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
}): ProfileQualityIssue[] {
  const issues: ProfileQualityIssue[] = [];
  const normalizedCountry = normalizeCountryName(p.country);
  const inferredCountry = inferCountryFromCity(p.city);
  const rawCountry = (p.country ?? "").trim();
  const rawCountryLower = rawCountry.toLowerCase();
  const href = profileHref(p.id, p.account_type);

  if (!p.company_name?.trim()) {
    issues.push({
      id: p.id,
      accountType: p.account_type,
      companyName: p.company_name,
      fullName: p.full_name,
      email: p.email,
      city: p.city,
      country: p.country,
      severity: "warning",
      field: "company_name",
      message: `${profileLabel(p)} is missing a company name.`,
      suggestedCountry: null,
      href,
    });
  }

  if (!rawCountry) {
    issues.push({
      id: p.id,
      accountType: p.account_type,
      companyName: p.company_name,
      fullName: p.full_name,
      email: p.email,
      city: p.city,
      country: p.country,
      severity: inferredCountry ? "error" : "warning",
      field: "country",
      message: inferredCountry
        ? `${profileLabel(p)} has city ${p.city} but no country. Suggested country: ${inferredCountry}.`
        : `${profileLabel(p)} is missing a country.`,
      suggestedCountry: inferredCountry,
      href,
    });
  }

  if (rawCountryLower === "europe" || rawCountryLower === "asia" || rawCountryLower === "south asia" || rawCountryLower === "middle east") {
    issues.push({
      id: p.id,
      accountType: p.account_type,
      companyName: p.company_name,
      fullName: p.full_name,
      email: p.email,
      city: p.city,
      country: p.country,
      severity: "error",
      field: "country",
      message: `${profileLabel(p)} has "${rawCountry}" saved as country, but that is a region.`,
      suggestedCountry: inferredCountry,
      href,
    });
  }

  if (inferredCountry && normalizedCountry && inferredCountry !== normalizedCountry) {
    issues.push({
      id: p.id,
      accountType: p.account_type,
      companyName: p.company_name,
      fullName: p.full_name,
      email: p.email,
      city: p.city,
      country: p.country,
      severity: "error",
      field: "country",
      message: `${profileLabel(p)} says city ${p.city}, but country is ${normalizedCountry}. Suggested country: ${inferredCountry}.`,
      suggestedCountry: inferredCountry,
      href,
    });
  }

  return issues;
}

/**
 * Full diagnostic snapshot of a dealer for the admin dealer detail page.
 */
export const adminGetDealerDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dealerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    const { dealerId } = data;

    const [
      profile,
      dealerProfile,
      stones,
      stoneStatusCounts,
      syncLogs,
      apiKey,
      enquiries,
      orders,
      enquiryStatusCounts,
      mostViewed,
    ] = await Promise.all([
      sb.from("profiles").select("*").eq("id", dealerId).maybeSingle(),
      (sb as any).from("dealer_profiles").select("*").eq("id", dealerId).maybeSingle(),
      sb
        .from("stones")
        .select("id, stone_type, shape, carat_weight, cert_lab, cert_number, status, created_at, view_count, share_count, feed_inactive")
        .eq("dealer_id", dealerId)
        .order("created_at", { ascending: false })
        .limit(200),
      sb.from("stones").select("status, feed_inactive").eq("dealer_id", dealerId),
      sb.from("sync_logs").select("*").eq("dealer_id", dealerId).order("started_at", { ascending: false }).limit(10),
      sb
        .from("api_keys")
        .select("id, label, is_active, key_prefix, key_type, created_at, last_used_at")
        .eq("jeweller_id", dealerId)
        .eq("key_type", "write")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("enquiries")
        .select("id, subject, status, created_at, stone_id, from_jeweller_id")
        .eq("to_dealer_id", dealerId)
        .order("created_at", { ascending: false })
        .limit(5),
      sb
        .from("orders")
        .select("id, wholesale_price_usd, sale_date, shipping_status, jeweller_id, stone_id")
        .eq("dealer_id", dealerId)
        .order("sale_date", { ascending: false })
        .limit(5),
      sb.from("enquiries").select("status").eq("to_dealer_id", dealerId),
      sb
        .from("stones")
        .select("id, stone_type, shape, carat_weight, view_count")
        .eq("dealer_id", dealerId)
        .order("view_count", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Hydrate enquiry sender names (jeweller company)
    const jewellerIds = Array.from(
      new Set([
        ...(enquiries.data ?? []).map((e) => e.from_jeweller_id),
        ...(orders.data ?? []).map((o) => o.jeweller_id),
      ]),
    ).filter(Boolean) as string[];

    const jewellerMap = new Map<string, { company_name: string | null; full_name: string | null; email: string | null }>();
    if (jewellerIds.length) {
      const { data: js } = await sb.from("profiles").select("id, company_name, full_name, email").in("id", jewellerIds);
      for (const j of js ?? []) jewellerMap.set(j.id, j);
    }

    // Hydrate stone summaries for enquiries/orders
    const stoneIds = Array.from(
      new Set([
        ...(enquiries.data ?? []).map((e) => e.stone_id),
        ...(orders.data ?? []).map((o) => o.stone_id),
        mostViewed.data?.id,
      ]),
    ).filter(Boolean) as string[];
    const stoneMap = new Map<string, { stone_type: string; shape: string | null; carat_weight: number | null }>();
    if (stoneIds.length) {
      const { data: ss } = await sb.from("stones").select("id, stone_type, shape, carat_weight").in("id", stoneIds);
      for (const s of ss ?? []) stoneMap.set(s.id, s);
    }

    // Stone thumbnail for most-viewed
    let mostViewedImage: string | null = null;
    if (mostViewed.data?.id) {
      const { data: img } = await sb
        .from("stone_images")
        .select("storage_url")
        .eq("stone_id", mostViewed.data.id)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();
      mostViewedImage = img?.storage_url ?? null;
    }

    // Stones with image flag (one query checking any stone_images row per stone)
    const stoneIdList = (stones.data ?? []).map((s) => s.id);
    const hasImageSet = new Set<string>();
    if (stoneIdList.length) {
      const { data: imgs } = await sb.from("stone_images").select("stone_id").in("stone_id", stoneIdList);
      for (const i of imgs ?? []) hasImageSet.add(i.stone_id);
    }

    const counts = { available: 0, reserved: 0, sold: 0, feed_inactive: 0, total: 0 };
    for (const s of stoneStatusCounts.data ?? []) {
      counts.total += 1;
      if (s.feed_inactive) counts.feed_inactive += 1;
      if (s.status === "available") counts.available += 1;
      else if (s.status === "reserved") counts.reserved += 1;
      else if (s.status === "sold") counts.sold += 1;
    }

    const enquiryCounts = { total: 0, open: 0, replied: 0, closed: 0 };
    for (const e of enquiryStatusCounts.data ?? []) {
      enquiryCounts.total += 1;
      if (e.status === "open") enquiryCounts.open += 1;
      else if (e.status === "replied") enquiryCounts.replied += 1;
      else if (e.status === "closed") enquiryCounts.closed += 1;
    }

    const totalViews = (stones.data ?? []).reduce((t, s) => t + (s.view_count ?? 0), 0);
    const totalShares = (stones.data ?? []).reduce((t, s) => t + (s.share_count ?? 0), 0);

    return {
      profile: profile.data,
      dealerProfile: dealerProfile,
      stones: (stones.data ?? []).map((s) => ({ ...s, hasImage: hasImageSet.has(s.id) })),
      counts,
      syncLogs: syncLogs.data ?? [],
      apiKey: apiKey.data,
      enquiries: (enquiries.data ?? []).map((e) => ({
        ...e,
        jeweller: jewellerMap.get(e.from_jeweller_id) ?? null,
        stone: e.stone_id ? stoneMap.get(e.stone_id) ?? null : null,
      })),
      orders: (orders.data ?? []).map((o) => ({
        ...o,
        jeweller: jewellerMap.get(o.jeweller_id) ?? null,
        stone: o.stone_id ? stoneMap.get(o.stone_id) ?? null : null,
      })),
      enquiryCounts,
      analytics: {
        totalViews,
        totalShares,
        mostViewed: mostViewed.data ? { ...mostViewed.data, imageUrl: mostViewedImage } : null,
      },
    };
  });

export const adminGetProfileDataQuality = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await requireAdmin(context.userId);

    const [
      { data: profiles, error: profilesError },
      { data: dealerProfiles },
      { data: jewellerProfiles },
      { data: stoneRows },
    ] = await Promise.all([
      sb
        .from("profiles")
        .select("id, account_type, full_name, company_name, email, city, country, phone, website, is_approved, is_verified, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      (sb as any)
        .from("dealer_profiles")
        .select("id, slug, bio, logo_url, tagline, story, specialities, external_feed_url, whatsapp_first, supplier_services, years_trading, response_time_hours"),
      (sb as any)
        .from("jeweller_profiles")
        .select("id, slug, bio, logo_url, tagline, is_public, specialities"),
      sb
        .from("stones")
        .select("dealer_id")
        .eq("status", "available")
        .eq("feed_inactive", false)
        .limit(20000),
    ]);

    if (profilesError) throw new Error(profilesError.message);

    const dealerMap = new Map((dealerProfiles ?? []).map((d: any) => [d.id, d]));
    const jewellerMap = new Map((jewellerProfiles ?? []).map((j: any) => [j.id, j]));
    const stoneCountMap = new Map<string, number>();
    for (const row of stoneRows ?? []) {
      if (!row.dealer_id) continue;
      stoneCountMap.set(row.dealer_id, (stoneCountMap.get(row.dealer_id) ?? 0) + 1);
    }
    const issues: ProfileQualityIssue[] = [];
    const completeness: ProfileCompleteness[] = [];

    for (const p of profiles ?? []) {
      issues.push(...locationIssuesForProfile(p));
      const dealer = dealerMap.get(p.id);
      const jeweller = jewellerMap.get(p.id);
      completeness.push(scoreProfileCompleteness({
        profile: p,
        dealer,
        jeweller,
        stoneCount: stoneCountMap.get(p.id) ?? 0,
      }));

      if (p.account_type === "dealer") {
        if (!dealer?.slug) {
          issues.push({
            id: p.id,
            accountType: p.account_type,
            companyName: p.company_name,
            fullName: p.full_name,
            email: p.email,
            city: p.city,
            country: p.country,
            severity: "warning",
            field: "dealer_profile",
            message: `${profileLabel(p)} is missing a vendor slug.`,
            suggestedCountry: null,
            href: profileHref(p.id, p.account_type),
          });
        }
        if (!dealer?.tagline && !dealer?.story) {
          issues.push({
            id: p.id,
            accountType: p.account_type,
            companyName: p.company_name,
            fullName: p.full_name,
            email: p.email,
            city: p.city,
            country: p.country,
            severity: "warning",
            field: "dealer_profile",
            message: `${profileLabel(p)} has a thin public vendor profile: no tagline or story.`,
            suggestedCountry: null,
            href: profileHref(p.id, p.account_type),
          });
        }
      }

      if (p.account_type === "jeweller") {
        if (jeweller?.is_public && !jeweller?.slug) {
          issues.push({
            id: p.id,
            accountType: p.account_type,
            companyName: p.company_name,
            fullName: p.full_name,
            email: p.email,
            city: p.city,
            country: p.country,
            severity: "warning",
            field: "jeweller_profile",
            message: `${profileLabel(p)} has a public jeweller profile without a slug.`,
            suggestedCountry: null,
            href: null,
          });
        }
      }
    }

    const byField: Record<string, number> = {};
    const bySeverity = { error: 0, warning: 0 };
    for (const issue of issues) {
      byField[issue.field] = (byField[issue.field] ?? 0) + 1;
      bySeverity[issue.severity] += 1;
    }

    return {
      scanned: profiles?.length ?? 0,
      issues,
      completeness: completeness.sort((a, b) => a.score - b.score),
      byField,
      bySeverity,
      repairable: issues.filter((i) => i.field === "country" && i.suggestedCountry).length,
    };
  });

export const adminRepairProfileLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await requireAdmin(context.userId);
    const { data: profiles, error } = await sb
      .from("profiles")
      .select("id, account_type, full_name, company_name, email, city, country")
      .limit(500);

    if (error) throw new Error(error.message);

    const repaired: Array<{ id: string; name: string; from: string | null; to: string }> = [];
    for (const p of profiles ?? []) {
      const normalized = normalizeProfileLocation({ city: p.city, country: p.country });
      if (!normalized.country || normalized.country === p.country) continue;
      if (!normalized.corrected) continue;
      const { error: updateError } = await sb
        .from("profiles")
        .update({ country: normalized.country, city: normalized.city })
        .eq("id", p.id);
      if (updateError) throw new Error(updateError.message);
      repaired.push({
        id: p.id,
        name: profileLabel(p),
        from: p.country,
        to: normalized.country,
      });
    }

    return { repaired };
  });

/**
 * Admin-triggered feed sync for a given dealer. Reuses the same sync helper
 * as the dealer-self trigger, but marks the source as "admin".
 */
export const adminRunDealerSyncFor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dealerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const { runDealerSyncForUser } = await import("@/lib/dealer-sync.server");
    return runDealerSyncForUser(data.dealerId, "admin");
  });

const adminDealerProfileSchema = z.object({
  dealerId: z.string().uuid(),
  profile: z.object({
    full_name: z.string().max(120).nullable(),
    company_name: z.string().max(160).nullable(),
    email: z.string().email().max(320).nullable(),
    website: z.string().max(300).nullable(),
    country: z.string().max(100).nullable(),
    city: z.string().max(100).nullable(),
    phone: z.string().max(80).nullable(),
  }),
  dealerProfile: z.object({
    slug: z.string().max(100).nullable(),
    tagline: z.string().max(140).nullable(),
    instagram_url: z.string().max(300).nullable(),
    story: z.string().max(4000).nullable(),
    founded_year: z.number().int().min(1700).max(2100).nullable(),
  }),
});

export const adminUpdateDealerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminDealerProfileSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    const location = normalizeProfileLocation({
      city: data.profile.city,
      country: data.profile.country,
    });
    const { error: profileError } = await sb
      .from("profiles")
      .update({
        full_name: data.profile.full_name?.trim() || null,
        company_name: data.profile.company_name?.trim() || null,
        email: data.profile.email?.trim() || null,
        website: data.profile.website?.trim() || null,
        country: location.country,
        city: location.city,
        phone: data.profile.phone?.trim() || null,
      })
      .eq("id", data.dealerId);

    if (profileError) throw new Error(profileError.message);

    const { error: dealerError } = await (sb as any)
      .from("dealer_profiles")
      .update({
        slug: data.dealerProfile.slug?.trim() || null,
        tagline: data.dealerProfile.tagline?.trim() || null,
        instagram_url: data.dealerProfile.instagram_url?.trim() || null,
        story: data.dealerProfile.story?.trim() || null,
        founded_year: data.dealerProfile.founded_year,
      })
      .eq("id", data.dealerId);

    if (dealerError) throw new Error(dealerError.message);
    return { ok: true, locationWarning: location.warning };
  });

export const adminCreateDealerCorrectionMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    dealerId: z.string().uuid(),
    issues: z.array(z.string().min(1).max(240)).min(1).max(10),
    note: z.string().max(1000).optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    const { data: profile, error } = await sb
      .from("profiles")
      .select("email, full_name, company_name")
      .eq("id", data.dealerId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const name = profile?.company_name || profile?.full_name || "there";
    const body = [
      `Hi ${name},`,
      "",
      "Could you please review and correct the following Chaos profile details?",
      "",
      ...data.issues.map((issue, index) => `${index + 1}. ${issue}`),
      data.note ? ["", data.note] : null,
      "",
      "Once updated, this helps jewellers trust your listings and keeps your inventory searchable.",
      "",
      "Thanks,",
      "Chaos Gemstones",
    ].flat().filter(Boolean).join("\n");

    return {
      email: profile?.email ?? "",
      subject: "Please update your Chaos dealer profile",
      body,
      mailto: `mailto:${encodeURIComponent(profile?.email ?? "")}?subject=${encodeURIComponent("Please update your Chaos dealer profile")}&body=${encodeURIComponent(body)}`,
    };
  });

/**
 * Dealer-health summary for a batch of dealer ids. Returns most-recent stone
 * timestamp and total stone count per dealer; the UI derives 🟢/🟡/🔴/⚫.
 */
export const adminGetDealerHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ dealerIds: z.array(z.string().uuid()).min(1).max(200) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    const { data: rows } = await sb
      .from("stones")
      .select("dealer_id, created_at")
      .in("dealer_id", data.dealerIds)
      .order("created_at", { ascending: false });
    const map = new Map<string, { stoneCount: number; lastStoneAt: string | null }>();
    for (const id of data.dealerIds) map.set(id, { stoneCount: 0, lastStoneAt: null });
    for (const r of rows ?? []) {
      const e = map.get(r.dealer_id)!;
      e.stoneCount += 1;
      if (!e.lastStoneAt || r.created_at > e.lastStoneAt) e.lastStoneAt = r.created_at;
    }
    return { health: Object.fromEntries(map) };
  });

/**
 * Platform activity feed: unified recent events across signups, stone listings,
 * enquiries, orders, and sync logs. Returns up to 20 most-recent items.
 */
export const adminGetActivityFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await requireAdmin(context.userId);

    const [signups, listings, enquiries, orders, syncs] = await Promise.all([
      sb
        .from("profiles")
        .select("id, full_name, company_name, account_type, account_types, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("stones")
        .select("id, dealer_id, stone_type, carat_weight, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("enquiries")
        .select("id, from_jeweller_id, to_dealer_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("orders")
        .select("id, jeweller_id, dealer_id, stone_id, jeweller_confirmed_receipt, received_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("sync_logs")
        .select("id, dealer_id, status, stones_added, stones_updated, finished_at, started_at")
        .eq("status", "success")
        .order("finished_at", { ascending: false })
        .limit(20),
    ]);

    // Collect all referenced user ids and resolve names in one shot
    const userIds = new Set<string>();
    for (const s of signups.data ?? []) userIds.add(s.id);
    for (const l of listings.data ?? []) userIds.add(l.dealer_id);
    for (const e of enquiries.data ?? []) { userIds.add(e.from_jeweller_id); userIds.add(e.to_dealer_id); }
    for (const o of orders.data ?? []) { userIds.add(o.jeweller_id); userIds.add(o.dealer_id); }
    for (const s of syncs.data ?? []) userIds.add(s.dealer_id);

    const userMap = new Map<string, string>();
    if (userIds.size) {
      const { data: ps } = await sb
        .from("profiles")
        .select("id, company_name, full_name, email")
        .in("id", Array.from(userIds));
      for (const p of ps ?? []) {
        userMap.set(p.id, p.company_name || p.full_name || p.email || p.id.slice(0, 8));
      }
    }

    type Event = { id: string; ts: string; type: string; text: string; href?: string };
    const events: Event[] = [];

    for (const s of signups.data ?? []) {
      const name = userMap.get(s.id) ?? s.full_name ?? s.company_name ?? "Someone";
      const role = s.account_type === "dealer" ? "dealer" : s.account_type === "jeweller" ? "jeweller" : "user";
      events.push({
        id: `signup-${s.id}`,
        ts: s.created_at,
        type: "signup",
        text: `${name} signed up as a ${role}`,
        href: s.account_type === "dealer" ? `/admin/dealer/${s.id}` : undefined,
      });
    }
    for (const l of listings.data ?? []) {
      const name = userMap.get(l.dealer_id) ?? "A dealer";
      const carat = l.carat_weight ? `${l.carat_weight}ct ` : "";
      events.push({
        id: `listing-${l.id}`,
        ts: l.created_at,
        type: "listing",
        text: `${name} listed a ${carat}${l.stone_type}`,
        href: `/stone/${l.id}`,
      });
    }
    for (const e of enquiries.data ?? []) {
      const j = userMap.get(e.from_jeweller_id) ?? "A jeweller";
      const d = userMap.get(e.to_dealer_id) ?? "a dealer";
      events.push({
        id: `enquiry-${e.id}`,
        ts: e.created_at,
        type: "enquiry",
        text: `${j} sent an enquiry to ${d}`,
      });
    }
    for (const o of orders.data ?? []) {
      const j = userMap.get(o.jeweller_id) ?? "A jeweller";
      const d = userMap.get(o.dealer_id) ?? "a dealer";
      if (o.jeweller_confirmed_receipt && o.received_at) {
        events.push({
          id: `order-recv-${o.id}`,
          ts: o.received_at,
          type: "order",
          text: `${j} confirmed receipt from ${d}`,
        });
      } else {
        events.push({
          id: `order-${o.id}`,
          ts: o.created_at,
          type: "order",
          text: `${j} placed an order with ${d}`,
        });
      }
    }
    for (const s of syncs.data ?? []) {
      const name = userMap.get(s.dealer_id) ?? "A dealer";
      const total = (s.stones_added ?? 0) + (s.stones_updated ?? 0);
      events.push({
        id: `sync-${s.id}`,
        ts: s.finished_at ?? s.started_at,
        type: "sync",
        text: `${name} synced ${total} stones from their feed`,
        href: `/admin/dealer/${s.dealer_id}`,
      });
    }

    events.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return { events: events.slice(0, 20) };
  });
