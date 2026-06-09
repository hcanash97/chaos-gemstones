import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { StoneCard } from "@/components/site/StoneCard";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShieldCheck, Instagram, Wrench } from "lucide-react";
import { EnquireDialog } from "@/components/site/EnquireDialog";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "@/components/site/StarInput";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { isJeweller as checkJ } from "@/lib/auth.utils";
import { useServerFn } from "@tanstack/react-start";
import { getJewellerApiStatus, toggleFeedSelection } from "@/lib/jeweller-feed.functions";
import { Heart, HeartOff } from "lucide-react";

const VENDOR_CATALOGUE_PAGE_SIZE = 48;

export const Route = createFileRoute("/vendors/$slug")({
  component: VendorProfile,
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("dealer_profiles")
      .select("id, logo_url, bio, specialities, trade_memberships, cover_image_url, instagram_url, founded_year, tagline, story, certifications, profiles!inner(company_name, city, country, is_approved)")
      .eq("slug", params.slug)
      .maybeSingle();
    return { vendor: data as any };
  },
  head: ({ loaderData, params }) => {
    const v = loaderData?.vendor;
    const name = v?.profiles?.company_name || "Vendor";
    const city = v?.profiles?.city || "";
    const title = `${name}${city ? " — Certified Gemstone Dealer, " + city : ""} — Chaos`;
    const desc = `Browse the available stone catalogue from ${name}${city ? ", " + city : ""}${v?.profiles?.country ? ", " + v.profiles.country : ""} — verified on Chaos.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: `/vendors/${params.slug}` },
        ...(v?.logo_url
          ? [
              { property: "og:image", content: v.logo_url },
              { name: "twitter:image", content: v.logo_url },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/vendors/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name,
            description: desc,
            url: `https://chaosgemstones.com/vendors/${params.slug}`,
            ...(v?.logo_url ? { image: v.logo_url } : {}),
            ...(city || v?.profiles?.country
              ? {
                  address: {
                    "@type": "PostalAddress",
                    ...(city ? { addressLocality: city } : {}),
                    ...(v?.profiles?.country ? { addressCountry: v.profiles.country } : {}),
                  },
                }
              : {}),
            ...(v?.specialities?.length || v?.supplier_services?.length
              ? { knowsAbout: [...(v.specialities ?? []), ...(v.supplier_services ?? [])].join(", ") }
              : {}),
            ...(v?.trade_memberships?.length
              ? { memberOf: v.trade_memberships.map((m: string) => ({ "@type": "Organization", name: m })) }
              : {}),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Vendors", item: "https://chaosgemstones.com/vendors" },
              { "@type": "ListItem", position: 2, name, item: `https://chaosgemstones.com/vendors/${params.slug}` },
            ],
          }),
        },
      ],
    };
  },
});

function VendorProfile() {
  const { slug } = Route.useParams();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [cataloguePage, setCataloguePage] = useState(1);
  const fetchStatus = useServerFn(getJewellerApiStatus);
  const saveSelection = useServerFn(toggleFeedSelection);
  const { data, isLoading } = useQuery({
    queryKey: ["vendor", slug, cataloguePage],
    queryFn: async () => {
      const from = (cataloguePage - 1) * VENDOR_CATALOGUE_PAGE_SIZE;
      const to = from + VENDOR_CATALOGUE_PAGE_SIZE - 1;
      const { data: vendorRaw } = await supabase
        .from("dealer_profiles")
        .select("id, bio, specialities, languages, years_trading, response_time_hours, gia_member, igi_member, directory_url, trade_memberships, cover_image_url, instagram_url, founded_year, tagline, story, certifications, logo_url, profiles!inner(company_name, city, country, website, is_verified, created_at)")
        .eq("slug", slug)
        .maybeSingle();
      const vendor = vendorRaw as any;
      if (!vendor) return { vendor: null, stones: [], totalStones: 0 };
      const { data: stones, count: totalStones } = await supabase
        .from("stones")
        .select("id, stone_type, shape, carat_weight, origin, country_of_origin, cert_lab, wholesale_price_usd, colour_grade, clarity_grade, has_video, has_360, matching_pair, dealer_id, stone_images(storage_url, external_image_url, is_primary, sort_order)", { count: "planned" })
        .eq("dealer_id", vendor.id)
        .eq("status", "available")
        .eq("feed_inactive", false)
        .order("created_at", { ascending: false })
        .range(from, to);
      const { count: soldCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("dealer_id", vendor.id);
      // Response rate: % of enquiries with at least one dealer reply within 48h.
      const { data: enquiries } = await supabase
        .from("enquiries")
        .select("id, created_at, enquiry_messages(sender_id, created_at)")
        .eq("to_dealer_id", vendor.id);
      let total = 0;
      let responded = 0;
      for (const e of enquiries ?? []) {
        total += 1;
        const replies = (e as any).enquiry_messages?.filter(
          (m: any) => m.sender_id === vendor.id,
        ) ?? [];
        const enqAt = new Date((e as any).created_at).getTime();
        const within = replies.some(
          (m: any) => new Date(m.created_at).getTime() - enqAt < 48 * 3600 * 1000,
        );
        if (within) responded += 1;
      }
      const responseRate = total === 0 ? null : Math.round((responded / total) * 100);
      const { data: reviewsData } = await (supabase as any)
        .from("reviews")
        .select("id, rating, comment, created_at, jeweller:jeweller_id(full_name, company_name)")
        .eq("dealer_id", vendor.id)
        .order("created_at", { ascending: false });
      const reviews = reviewsData ?? [];
      const reviewCount = reviews.length;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((a: number, r: any) => a + Number(r.rating || 0), 0) / reviewCount
          : null;
      return {
        vendor,
        stones: (stones ?? []).map((s: any) => {
          const sorted = [...(s.stone_images ?? [])].sort(
            (a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99),
          );
          const primary = sorted.find((i: any) => i.is_primary) ?? sorted[0];
          return {
            ...s,
            image: primary?.storage_url || primary?.external_image_url || null,
            dealer_verified: !!vendor.profiles?.is_verified,
          };
        }).sort((a: any, b: any) => Number(!!b.image) - Number(!!a.image)),
        totalStones: totalStones ?? 0,
        responseRate,
        enquiryCount: total,
        soldCount: soldCount ?? 0,
        reviews,
        reviewCount,
        avgRating,
      };
    },
  });

  const isApprovedJeweller = checkJ(profile) && !!profile?.is_approved;
  const { data: feedStatus, refetch: refetchFeedStatus } = useQuery({
    queryKey: ["jeweller-feed-status", user?.id],
    enabled: !!user?.id && isApprovedJeweller,
    queryFn: () => fetchStatus(),
  });
  const followedDealerIds = new Set(
    (feedStatus?.selections ?? [])
      .filter((s: any) => s.selection_type === "dealer_follow")
      .map((s: any) => s.dealer_id),
  );
  const isFollowing = data?.vendor ? followedDealerIds.has(data.vendor.id) : false;
  const [followBusy, setFollowBusy] = useState(false);

  async function onToggleFollow() {
    if (!data?.vendor) return;
    setFollowBusy(true);
    try {
      await saveSelection({
        data: {
          selectionType: "dealer_follow",
          dealerId: data.vendor.id,
          enabled: !isFollowing,
        },
      });
      await refetchFeedStatus();
      qc.invalidateQueries({ queryKey: ["jeweller-overview"] });
      qc.invalidateQueries({ queryKey: ["jeweller-intelligence"] });
      toast.success(
        !isFollowing
          ? `Following ${data.vendor.profiles?.company_name} — their stones now flow into your feed.`
          : `Unfollowed ${data.vendor.profiles?.company_name}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update follow.");
    } finally {
      setFollowBusy(false);
    }
  }

  const { data: wishlistIds } = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    enabled: !!user && isApprovedJeweller,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("stone_id")
        .eq("jeweller_id", user!.id);
      return new Set((data ?? []).map((w: any) => w.stone_id as string));
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <Skeleton className="h-3 w-24 bg-white/20" />
            <Skeleton className="mt-4 h-12 w-2/3 bg-white/20" />
            <Skeleton className="mt-2 h-4 w-1/3 bg-white/15" />
            <Skeleton className="mt-6 h-20 w-full max-w-2xl bg-white/15" />
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-6 py-16">
          <Skeleton className="h-8 w-40" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-md border border-border bg-card">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  if (!data?.vendor) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="font-serif text-3xl">Vendor not found</h1>
          <Link to="/vendors" className="mt-4 inline-block text-sm text-[var(--color-gold)]">
            ← Back to vendors
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const v: any = data.vendor;
  const memberSince = v.profiles?.created_at
    ? new Date(v.profiles.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;
  const totalStones = data.totalStones ?? data.stones.length;
  const totalCataloguePages = Math.max(1, Math.ceil(totalStones / VENDOR_CATALOGUE_PAGE_SIZE));
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section
        className="relative overflow-hidden text-primary-foreground"
        style={
          v.cover_image_url
            ? { backgroundImage: `linear-gradient(135deg, rgba(13,36,24,0.78), rgba(15,27,61,0.72)), url(${v.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: "linear-gradient(135deg, #1B3A2D 0%, #0D2418 100%)" }
        }
      >
        {!v.cover_image_url && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-end overflow-hidden pr-10 font-serif text-[8rem] uppercase leading-none opacity-[0.04]"
          >
            {(v.specialities ?? []).slice(0, 1).join(" · ") || v.profiles?.country}
          </div>
        )}
        <div className="relative mx-auto max-w-7xl px-6 py-16">
          <Link to="/vendors" className="text-xs opacity-70 hover:opacity-100">← All vendors</Link>
          <div className="mt-4 flex items-center gap-4">
            {v.logo_url ? (
              <img src={v.logo_url} alt={`${v.profiles.company_name} logo`} className="h-16 w-16 shrink-0 rounded-full border-2 border-[var(--color-gold)] object-cover shadow-lg" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-gold)] bg-[var(--color-gold)]/10 font-serif text-2xl text-[var(--color-gold)]">
                {(v.profiles.company_name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-5xl">{v.profiles.company_name}</h1>
              {v.profiles.is_verified && <ShieldCheck className="verified-cycle h-6 w-6" />}
            </div>
          </div>
          {v.tagline && <p className="mt-3 max-w-2xl text-base italic opacity-90">{v.tagline}</p>}
          <div className="mt-2 text-sm opacity-70">
            {v.profiles.city}, {v.profiles.country}
            {v.founded_year ? ` · Est. ${v.founded_year}` : ""}
            {v.years_trading ? ` · ${v.years_trading} years trading` : ""}
            {v.response_time_hours ? ` · ~${v.response_time_hours}h response` : ""}
            <span className="ml-3 inline-flex items-center rounded-full bg-[var(--color-gold)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-gold-foreground)]">
              {totalStones} stones
            </span>
          </div>
          {v.instagram_url && (
            <a href={v.instagram_url} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-gold)] hover:opacity-90">
              <Instagram className="h-4 w-4" /> Instagram
            </a>
          )}
          <p className="mt-6 max-w-2xl opacity-90">{v.bio}</p>
          <div className="mt-6 flex flex-wrap gap-1.5">
            {v.whatsapp_first && (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                <MessageCircle className="mr-1 h-3 w-3" />
                WhatsApp-first supplier
              </Badge>
            )}
            {(v.specialities ?? []).map((s: string) => (
              <Badge key={s} className="bg-white/10 text-primary-foreground">{s}</Badge>
            ))}
            {(v.supplier_services ?? []).map((s: string) => (
              <Badge key={s} className="bg-white/10 text-primary-foreground">
                <Wrench className="mr-1 h-3 w-3" />
                {s}
              </Badge>
            ))}
            {v.gia_member && <Badge className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">GIA Member</Badge>}
            {v.igi_member && <Badge className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">IGI Member</Badge>}
            {(v.trade_memberships ?? []).map((m: string) => (
              <Badge key={m} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">{m}</Badge>
            ))}
          </div>
          <div className="mt-6 max-w-xs">
            <EnquireDialog
              dealerId={v.id}
              context={`Enquiry for ${v.profiles.company_name}`}
              trigger={
                <Button className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                  <Mail className="mr-2 h-4 w-4" /> Enquire with this vendor
                </Button>
              }
            />
          </div>
        </div>
      </section>
      {v.story && (
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-gold)]">Our story</div>
            <div className="mt-4 border-l-2 border-[var(--color-gold)] pl-5">
              <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">{v.story}</p>
            </div>
          </div>
        </section>
      )}
      {v.whatsapp_first && (
        <section className="border-b border-emerald-200 bg-emerald-50">
          <div className="mx-auto max-w-4xl px-6 py-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-800">
              <MessageCircle className="h-4 w-4" />
              WhatsApp-first sourcing
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-950">
              This supplier can work from WhatsApp-first stock, rough parcels, cutting/polishing updates,
              or one-off availability. Chaos should confirm price, media, treatment, and availability before a
              jeweller quotes a client.
            </p>
            {v.supplier_note && (
              <p className="mt-3 rounded-md border border-emerald-200 bg-white/70 p-3 text-sm leading-6 text-emerald-950">
                {v.supplier_note}
              </p>
            )}
            {(v.supplier_services ?? []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(v.supplier_services ?? []).map((s: string) => (
                  <span key={s} className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-900">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
      {(v.certifications ?? []).length > 0 && (
        <section className="border-b border-border bg-secondary/20">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Certifications & memberships</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(v.certifications ?? []).map((c: string) => (
                <span key={c} className="rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--color-gold)]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* Verification */}
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-gold)]" /> Verification
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {v.profiles?.is_verified && (
              <VerifyItem
                label="Chaos verified"
                value="Reviewed & approved"
                tooltip="This dealer has been reviewed and approved by the Chaos team"
              />
            )}
            {memberSince && <VerifyItem label="Trading on Chaos since" value={memberSince} />}
            {v.years_trading ? (
              <VerifyItem
                label="Industry experience"
                value={`${v.years_trading} years in the gemstone trade`}
              />
            ) : null}
            {data.responseRate !== null && data.responseRate !== undefined && (
              <VerifyItem
                label="Response rate (48h)"
                value={`${data.responseRate}% of ${data.enquiryCount} enquiries`}
                tone={
                  (v.response_time_hours ?? 99) <= 24
                    ? "green"
                    : (v.response_time_hours ?? 99) <= 48
                      ? "amber"
                      : "muted"
                }
              />
            )}
            <VerifyItem label="Stones listed" value={`${totalStones}`} />
            {(data.soldCount ?? 0) > 0 && (
              <VerifyItem label="Stones sold" value={`${data.soldCount}`} />
            )}
            {v.profiles?.website && (
              <VerifyLink label="Website" href={v.profiles.website} text={prettyUrl(v.profiles.website)} />
            )}
            {v.directory_url && (
              <VerifyLink label="Directory profile" href={v.directory_url} text={prettyUrl(v.directory_url)} />
            )}
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            All dealers on Chaos are manually reviewed before approval. We recommend starting with a small
            order to establish trust before committing to larger transactions.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="font-serif text-3xl">Catalogue</h2>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {totalStones} stones available · Showing page {cataloguePage} of {totalCataloguePages}
          </p>
          {totalCataloguePages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={cataloguePage <= 1}
                onClick={() => setCataloguePage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={cataloguePage >= totalCataloguePages}
                onClick={() => setCataloguePage((p) => Math.min(totalCataloguePages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.stones.map((s: any) => (
            <StoneCard key={s.id} stone={{ ...s, isWishlisted: wishlistIds?.has(s.id) ?? false }} />
          ))}
        </div>
      </section>
      {(data.reviewCount ?? 0) > 0 && (
        <section className="border-t border-border bg-secondary/20">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <h2 className="font-serif text-2xl">Buyer reviews</h2>
            <div className="mt-3 flex items-center gap-3">
              <StarRating value={data.avgRating ?? 0} />
              <span className="text-sm text-muted-foreground">
                {(data.avgRating ?? 0).toFixed(1)} · {data.reviewCount} review{data.reviewCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {(data.reviews ?? []).slice(0, 3).map((r: any) => {
                const name = r.jeweller?.company_name || r.jeweller?.full_name || "Buyer";
                const initials = name
                  .split(/\s+/)
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div key={r.id} className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {initials}
                      </div>
                      <StarRating value={Number(r.rating)} small />
                    </div>
                    {r.comment && (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{r.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
      <ReviewSubmit
        dealerId={(data.vendor as any).id}
        userId={user?.id}
        accountType={profile?.account_type}
        onSubmitted={() => qc.invalidateQueries({ queryKey: ["vendor", slug] })}
      />
      <SiteFooter />
    </div>
  );
}

function ReviewSubmit({
  dealerId,
  userId,
  accountType,
  onSubmitted,
}: {
  dealerId: string;
  userId?: string;
  accountType?: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  // Only authenticated jewellers can attempt to leave a review.
  // RLS additionally requires they have an order with this dealer.
  const { data: canReview } = useQuery({
    queryKey: ["can-review", dealerId, userId],
    enabled: !!userId && accountType === "jeweller",
    queryFn: async () => {
      const { count: orderCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("jeweller_id", userId!)
        .eq("dealer_id", dealerId);
      if (!orderCount) return false;
      const { count: existing } = await (supabase as any)
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("jeweller_id", userId!)
        .eq("dealer_id", dealerId);
      return (existing ?? 0) === 0;
    },
  });

  if (!canReview) return null;

  async function submit() {
    if (rating < 1) {
      toast.error("Please choose a star rating");
      return;
    }
    setBusy(true);
    const { error } = await (supabase as any).from("reviews").insert({
      dealer_id: dealerId,
      jeweller_id: userId,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Review posted — thank you");
    setComment("");
    setRating(0);
    onSubmitted();
  }

  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="font-serif text-2xl">Leave a review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You bought from this dealer — your honest feedback helps other jewellers.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Rating</div>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <Textarea
            placeholder="How was the stone, communication, packaging…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
          <Button
            onClick={submit}
            disabled={busy || rating < 1}
            className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
          >
            {busy ? "Posting…" : "Post review"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function StarRating({ value, small = false }: { value: number; small?: boolean }) {
  const size = small ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center" aria-label={`Rating ${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`${size} ${i <= Math.round(value) ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "fill-none text-muted-foreground"}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function VerifyItem({
  label,
  value,
  tooltip,
  tone,
}: {
  label: string;
  value: string;
  tooltip?: string;
  tone?: "green" | "amber" | "muted";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/50 bg-emerald-500/10"
      : tone === "amber"
        ? "border-amber-400/50 bg-amber-500/10"
        : "border-border bg-card";
  return (
    <div
      className={`rounded-md border p-4 ${toneClass}`}
      title={tooltip}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function VerifyLink({ label, href, text }: { label: string; href: string; text: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md border border-border bg-card p-4 transition-colors hover:border-[var(--color-gold)]"
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-[var(--color-gold)]">{text} ↗</div>
    </a>
  );
}

function prettyUrl(u: string) {
  try {
    const url = new URL(u.startsWith("http") ? u : `https://${u}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}
