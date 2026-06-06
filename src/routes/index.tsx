import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { StoneCard } from "@/components/site/StoneCard";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller as checkJ } from "@/lib/auth.utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Globe2, Boxes } from "lucide-react";
import { CountUp, FadeUp, StaggerGroup, WordReveal } from "@/components/anim/Motion";
import { LaunchBanner } from "@/components/site/LaunchBanner";
import { GemParticles } from "@/components/site/GemParticles";
import { CertLabBar } from "@/components/site/CertLabBar";
import { FounderQuote } from "@/components/site/FounderQuote";
import { TrustStrip } from "@/components/site/TrustStrip";
import { BetaTopBanner } from "@/components/site/BetaTopBanner";
import { DEFAULT_SITE_THEME, type HomepageBlockType } from "@/lib/site-theme";
import { useSiteTheme } from "@/hooks/useSiteTheme";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "B2B Gemstone & Diamond Marketplace — Chaos" },
      { name: "description", content: "Connect with verified independent gemstone and diamond dealers in Jaipur, Surat, Bangkok and Colombo. Certified stones, live inventory feeds." },
      { property: "og:title", content: "B2B Gemstone & Diamond Marketplace — Chaos" },
      { property: "og:description", content: "Connect with verified independent gemstone and diamond dealers worldwide." },
      { property: "og:url", content: "/" },
      { name: "keywords", content: "gemstone marketplace, diamond marketplace, wholesale gemstones, B2B gemstone platform, loose stones API, gemstone dealer UK, wholesale sapphire, wholesale ruby, Jaipur gemstone dealer, Surat diamond dealer" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Chaos",
              url: "https://chaosgemstones.com",
              logo: "https://chaosgemstones.com/icons/icon-192.png",
              description: "B2B marketplace connecting independent gemstone and diamond dealers with jewellers worldwide.",
            },
            {
              "@type": "WebSite",
              name: "Chaos",
              url: "https://chaosgemstones.com",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://chaosgemstones.com/marketplace?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How do I list my gemstones on Chaos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sign up as a dealer at chaosgemstones.com/sign-up/dealer, complete your profile, and upload your stones manually, via CSV bulk upload, or by connecting your existing inventory feed via API. Your account is reviewed and approved within 24 hours.",
              },
            },
            {
              "@type": "Question",
              name: "How does the API feed work for jewellers?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Jewellers generate an API key from their dashboard and paste two lines of code into their website. Their selected stones appear live with their own retail pricing applied automatically. Works on Shopify, Wix, Squarespace, Webflow, WordPress, and any custom site.",
              },
            },
            {
              "@type": "Question",
              name: "How much does Chaos cost?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Chaos is completely free during the launch period. There are no listing fees, no subscription fees, and no commission. We will introduce a small performance-based fee in the future with at least 30 days notice.",
              },
            },
            {
              "@type": "Question",
              name: "Which certification labs are supported?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Chaos supports all major gemological laboratories including GIA, IGI, HRD, GRS, AGL, Gübelin, SSEF, GCAL, Lotus, and GIT. Uncertified stones can also be listed with full disclosure.",
              },
            },
            {
              "@type": "Question",
              name: "Which countries can dealers sell to through Chaos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Chaos connects dealers primarily with jewellers in the United Kingdom, United States, Canada, Australia, and Europe. Dealers based in India, Sri Lanka, Thailand, Myanmar, Colombia, and other major sourcing hubs are welcome to list their inventory.",
              },
            },
          ],
        }),
      },
    ],
  }),
});

function Home() {
  const { user, profile } = useAuth();
  const isApprovedJeweller = checkJ(profile) && !!profile?.is_approved;
  const { theme: siteTheme } = useSiteTheme();
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [dealers, stones, countries] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .or("account_type.eq.dealer,account_types.cs.{dealer}")
          .eq("is_approved", true),
        supabase.from("stones").select("id", { count: "exact", head: true }).eq("status", "available"),
        supabase
          .from("profiles")
          .select("country")
          .or("account_type.eq.dealer,account_types.cs.{dealer}")
          .eq("is_approved", true),
      ]);
      const distinctCountries = new Set((countries.data ?? []).map((r: any) => r.country).filter(Boolean));
      return {
        dealers: dealers.count ?? 0,
        stones: stones.count ?? 0,
        countries: distinctCountries.size,
      };
    },
  });

  const { data: featuredStones } = useQuery({
    queryKey: ["featured-stones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stones")
        .select("id, stone_type, shape, carat_weight, origin, country_of_origin, cert_lab, wholesale_price_usd, price_currency, colour_grade, clarity_grade, has_video, has_360, matching_pair, dealer_id, stone_images(storage_url, external_image_url, is_primary, sort_order)")
        .eq("featured", true)
        .eq("status", "available")
        .limit(8);
      return (data ?? []).map((s: any) => {
        const sorted = [...(s.stone_images ?? [])].sort(
          (a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99),
        );
        const primary = sorted.find((i: any) => i.is_primary) ?? sorted[0];
        return {
          ...s,
          image: primary?.storage_url || primary?.external_image_url || null,
        };
      });
    },
  });

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

  const { data: featuredVendors } = useQuery({
    queryKey: ["featured-vendors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dealer_profiles")
        .select("id, slug, specialities, years_trading, bio, profiles!inner(company_name, city, country, is_verified)")
        .eq("featured", true)
        .limit(3);
      return data ?? [];
    },
  });

  const homepageBlocks = siteTheme.homepage_layout.filter((block) => block.enabled);
  const renderHomepageBlock = (type: HomepageBlockType) => {
    switch (type) {
      case "hero":
        return <HomeHeroSection siteTheme={siteTheme} />;
      case "cert_labs":
        return <CertLabBar />;
      case "trust_strip":
        return <TrustStrip />;
      case "audience_cards":
        return <AudienceCardsSection />;
      case "whatsapp_cta":
        return <WhatsAppCtaSection siteTheme={siteTheme} />;
      case "featured_stones":
        return <FeaturedStonesSection featuredStones={featuredStones ?? []} wishlistIds={wishlistIds} siteTheme={siteTheme} />;
      case "matched_pairs":
        return <MatchedPairsSection siteTheme={siteTheme} />;
      case "featured_vendors":
        return <FeaturedVendorsSection featuredVendors={featuredVendors ?? []} siteTheme={siteTheme} />;
      case "founder_quote":
        return <FounderQuote />;
      case "stats":
        return <StatsTrustSection stats={stats} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <BetaTopBanner />
      <SiteHeader />

      {homepageBlocks.map((block) => (
        <Fragment key={block.id}>{renderHomepageBlock(block.type)}</Fragment>
      ))}

      <SiteFooter />
    </div>
  );
}

function HomeHeroSection({ siteTheme }: { siteTheme: typeof DEFAULT_SITE_THEME }) {
  return (
    <section className="relative overflow-hidden text-primary-foreground hero-aurora">
      {siteTheme.hero_background_image_url && (
        <img
          src={siteTheme.hero_background_image_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
      )}
      {siteTheme.hero_background_image_url && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(8, 18, 54, ${siteTheme.hero_overlay_opacity})` }}
          aria-hidden="true"
        />
      )}
      <div className="hero-light" aria-hidden />
      <GemParticles count={14} />
      <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {siteTheme.logo_url && (
            <img
              src={siteTheme.logo_url}
              alt="Chaos logo"
              className="mb-5 h-14 w-14 rounded-md object-cover shadow-lg ring-1 ring-white/20"
              loading="eager"
            />
          )}
          <Badge
            className="border-0"
            style={{ backgroundColor: siteTheme.accent_color, color: "var(--color-gold-foreground)" }}
          >
            {siteTheme.hero_badge_label}
          </Badge>
        </motion.div>
        <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] md:text-7xl">
          <WordReveal text={siteTheme.hero_title} />
        </h1>
        <motion.p
          className="mt-6 max-w-xl text-lg opacity-80"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 0.55, delay: 0.6 }}
        >
          {siteTheme.hero_subtitle}
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.9 }}
        >
          <a href={siteTheme.hero_primary_cta_url}>
            <Button
              size="lg"
              className="group relative overflow-hidden border-0 gold-glow transition-shadow hover:opacity-95"
              style={{ backgroundColor: siteTheme.accent_color, color: "var(--color-gold-foreground)" }}
            >
              {siteTheme.hero_primary_cta_label} <ArrowRight className="ml-2 h-4 w-4" />
              <span className="shimmer-overlay" aria-hidden />
            </Button>
          </a>
          <a href={siteTheme.hero_secondary_cta_url}>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent transition-colors hover:bg-white/10"
              style={{ borderColor: siteTheme.accent_color, color: siteTheme.accent_color }}
            >
              {siteTheme.hero_secondary_cta_label}
            </Button>
          </a>
          {siteTheme.contact_whatsapp && (
            <a
              href={`https://wa.me/${siteTheme.contact_whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10">
                WhatsApp
              </Button>
            </a>
          )}
        </motion.div>
        <motion.p
          className="mt-4 text-sm opacity-70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.55, delay: 1.05 }}
        >
          Not sure what this is?{" "}
          <Link to="/about" className="font-medium text-[var(--color-gold)] underline-offset-4 hover:underline">
            Read how it works →
          </Link>
        </motion.p>
      </div>
      <span className="gold-line-draw absolute bottom-0 left-0 right-0" aria-hidden />
    </section>
  );
}

function AudienceCardsSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <FadeUp className="mb-10">
        <LaunchBanner />
      </FadeUp>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="group relative overflow-hidden rounded-md border border-[var(--gold-border)] p-8 text-primary-foreground" style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #162347 100%)" }}>
          <GemMarkWatermark />
          <div className="relative text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Jewellers</div>
          <h2 className="relative mt-3 font-serif text-3xl">Source verified stones. Sell as your own.</h2>
          <p className="relative mt-4 opacity-80">
            Browse thousands of certified stones from trusted dealers. Follow vendors you trust, set your markup, embed a live API feed into your own website. Sold stones drop out of your inventory automatically.
          </p>
          <Link to="/sign-up/jeweller" className="relative mt-6 inline-flex items-center text-sm font-medium text-[var(--color-gold)] hover:opacity-90">
            Create a jeweller account <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="group relative overflow-hidden rounded-md border border-[var(--gold-border)] p-8 text-primary-foreground" style={{ background: "linear-gradient(135deg, #1B3A2D 0%, #0D2418 100%)" }}>
          <GemMarkWatermark />
          <div className="relative text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Dealers</div>
          <h2 className="relative mt-3 font-serif text-3xl">List once. Reach jewellers worldwide.</h2>
          <p className="relative mt-4 opacity-80">
            Upload your inventory manually or via CSV. Get discovered by jewellers across the UK, US, Europe and Australia. Your stones appear in their stores automatically; mark sold and they disappear instantly.
          </p>
          <Link to="/sign-up/dealer" className="relative mt-6 inline-flex items-center text-sm font-medium text-[var(--color-gold)] hover:opacity-90">
            Become a verified dealer <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturedStonesSection({
  featuredStones,
  wishlistIds,
  siteTheme,
}: {
  featuredStones: any[];
  wishlistIds: Set<string> | undefined;
  siteTheme: typeof DEFAULT_SITE_THEME;
}) {
  return (
    <section className="bg-secondary/30 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <FadeUp className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{siteTheme.homepage_copy.featured_stones_eyebrow}</div>
            <h2 className="mt-2 font-serif text-4xl">{siteTheme.homepage_copy.featured_stones_title}</h2>
          </div>
          <Link to="/marketplace" className="text-sm text-foreground hover:text-[var(--color-gold)]">
            {siteTheme.homepage_copy.featured_stones_link_label} →
          </Link>
        </FadeUp>
        <StaggerGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" delay={0.08}>
          {featuredStones.map((s) => (
            <StoneCard key={s.id} stone={{ ...s, isWishlisted: wishlistIds?.has(s.id) ?? false }} />
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

function WhatsAppCtaSection({ siteTheme }: { siteTheme: typeof DEFAULT_SITE_THEME }) {
  const href = siteTheme.contact_whatsapp
    ? `https://wa.me/${siteTheme.contact_whatsapp.replace(/[^0-9]/g, "")}`
    : "/requests";
  return (
    <section className="border-y border-border bg-card/40 py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 rounded-md border border-[var(--gold-border)] bg-background p-7 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">Concierge sourcing</div>
            <h2 className="mt-2 font-serif text-3xl">{siteTheme.homepage_copy.whatsapp_cta_title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {siteTheme.homepage_copy.whatsapp_cta_body}
            </p>
          </div>
          <a href={href} target={siteTheme.contact_whatsapp ? "_blank" : undefined} rel={siteTheme.contact_whatsapp ? "noreferrer noopener" : undefined}>
            <Button
              size="lg"
              className="w-full border-0 md:w-auto"
              style={{ backgroundColor: siteTheme.accent_color, color: "var(--color-gold-foreground)" }}
            >
              {siteTheme.homepage_copy.whatsapp_cta_button_label}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

function MatchedPairsSection({ siteTheme }: { siteTheme: typeof DEFAULT_SITE_THEME }) {
  return (
    <section className="border-t border-border bg-background py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-8 rounded-lg border border-[var(--gold-border)] bg-card p-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
              {siteTheme.homepage_copy.matched_pairs_eyebrow}
            </div>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl">
              {siteTheme.homepage_copy.matched_pairs_title}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {siteTheme.homepage_copy.matched_pairs_body}
            </p>
            <Link
              to="/marketplace"
              className="mt-5 inline-flex items-center text-sm font-medium text-[var(--color-gold)] hover:opacity-90"
            >
              {siteTheme.homepage_copy.matched_pairs_link_label} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div
            aria-hidden
            className="relative hidden h-40 overflow-hidden rounded-md md:block"
            style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1B3A2D 100%)" }}
          >
            <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-90">
              <span className="h-20 w-20 rotate-12 rounded-full bg-[var(--color-gold)]/30 ring-2 ring-[var(--color-gold)]/60" />
              <span className="h-20 w-20 -rotate-12 rounded-full bg-[var(--color-gold)]/30 ring-2 ring-[var(--color-gold)]/60" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedVendorsSection({ featuredVendors, siteTheme }: { featuredVendors: any[]; siteTheme: typeof DEFAULT_SITE_THEME }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <FadeUp className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{siteTheme.homepage_copy.featured_vendors_eyebrow}</div>
          <h2 className="mt-2 font-serif text-4xl">{siteTheme.homepage_copy.featured_vendors_title}</h2>
        </div>
        <Link to="/vendors" className="text-sm text-foreground hover:text-[var(--color-gold)]">
          {siteTheme.homepage_copy.featured_vendors_link_label} →
        </Link>
      </FadeUp>
      <StaggerGroup className="mt-8 grid gap-5 md:grid-cols-3">
        {featuredVendors.map((v: any) => (
          <motion.div
            key={v.id}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            whileHover={{ y: -4 }}
            className="group"
          >
            <Link
              to="/vendors/$slug"
              params={{ slug: v.slug }}
              className="block rounded-md border border-border bg-card p-6 transition-all hover:border-[var(--color-gold)] hover:shadow-[0_18px_40px_-22px_rgba(15,27,61,0.45)]"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl">{v.profiles?.company_name}</h3>
                {v.profiles?.is_verified && (
                  <ShieldCheck className="h-4 w-4 text-[var(--color-gold)] gold-pulse" />
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {v.profiles?.city}, {v.profiles?.country} · {v.years_trading} yrs trading
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{v.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(v.specialities ?? []).slice(0, 3).map((s: string, i: number) => (
                  <span
                    key={s}
                    className="inline-block -translate-x-2 opacity-80 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <Badge variant="secondary" className="text-[10px]">{s}</Badge>
                  </span>
                ))}
              </div>
            </Link>
          </motion.div>
        ))}
      </StaggerGroup>
    </section>
  );
}

function StatsTrustSection({ stats }: { stats: { dealers: number; stones: number; countries: number } | undefined }) {
  return (
    <section className="border-t border-border bg-secondary/30 py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-3 md:divide-x md:divide-border">
        <StatBig label="Approved dealers" value={stats?.dealers ?? 0} />
        <StatBig label="Stones available" value={stats?.stones ?? 0} />
        <StatBig label="Sourcing countries" value={stats?.countries ?? 0} />
      </div>
      <div className="mx-auto mt-10 grid max-w-7xl gap-8 px-6 md:grid-cols-3">
        <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Verified dealers" desc="Every supplier reviewed and approved before listing." />
        <Feature icon={<Globe2 className="h-5 w-5" />} title="Global sourcing" desc="Direct access to Jaipur, Surat, Bangkok, Colombo and beyond." />
        <Feature icon={<Boxes className="h-5 w-5" />} title="Live inventory sync" desc="Sold stones drop out of every jeweller's feed within 60 seconds." />
      </div>
    </section>
  );
}

function StatBig({ label, value }: { label: string; value: number }) {
  const isEmpty = !value || value === 0;
  return (
    <FadeUp className="text-center md:px-6">
      {isEmpty ? (
        <>
          <div className="font-serif text-5xl text-muted-foreground/50">—</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {label} · Coming soon
          </div>
        </>
      ) : (
        <>
          <div className="font-serif text-5xl text-[var(--color-gold)]">
            <CountUp value={value} />
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        </>
      )}
    </FadeUp>
  );
}

function GemMarkWatermark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      className="pointer-events-none absolute -right-6 -bottom-6 h-44 w-44 opacity-[0.05]"
    >
      <polygon points="12,3 28,3 37,12 37,28 28,37 12,37 3,28 3,12" fill="#E8C97A" />
      <polygon points="16,9 24,9 31,16 31,24 24,31 16,31 9,24 9,16" fill="#E8C97A" />
    </svg>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div>
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-gold)]/15 text-[var(--color-gold)]">
        {icon}
      </div>
      <h3 className="mt-3 font-serif text-xl">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
