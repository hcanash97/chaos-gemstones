import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { StoneCard } from "@/components/site/StoneCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Globe2, Boxes } from "lucide-react";
import { CountUp, FadeUp, StaggerGroup, WordReveal } from "@/components/anim/Motion";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [dealers, stones, countries] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "dealer").eq("is_approved", true),
        supabase.from("stones").select("id", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("profiles").select("country").eq("account_type", "dealer").eq("is_approved", true),
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
        .select("id, stone_type, shape, carat_weight, origin, country_of_origin, cert_lab, wholesale_price_usd, colour_grade, clarity_grade, stone_images(storage_url, is_primary)")
        .eq("featured", true)
        .eq("status", "available")
        .limit(8);
      return (data ?? []).map((s: any) => ({
        ...s,
        image: s.stone_images?.[0]?.storage_url ?? null,
      }));
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden text-primary-foreground hero-aurora">
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">B2B · For the trade</Badge>
          </motion.div>
          <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] md:text-7xl">
            <WordReveal text="Verified diamonds & coloured stones, sourced direct from the world's dealers." />
          </h1>
          <motion.p
            className="mt-6 max-w-xl text-lg opacity-80"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.8, y: 0 }}
            transition={{ duration: 0.55, delay: 0.6 }}
          >
            CHAOS connects independent gemstone dealers in Jaipur, Surat, Bangkok and Colombo with jewellers in the UK, US, Europe and Australia. Browse the marketplace, follow vendors, pull live inventory into your own site.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.9 }}
          >
            <Link to="/marketplace">
              <Button size="lg" className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] gold-glow transition-shadow hover:opacity-95">
                Browse marketplace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/sign-up/dealer">
              <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10">
                List as a dealer
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Two-sided explainer */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-8">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Jewellers</div>
            <h2 className="mt-3 font-serif text-3xl">Source verified stones. Sell as your own.</h2>
            <p className="mt-4 text-muted-foreground">
              Browse thousands of certified stones from trusted dealers. Follow vendors you trust, set your markup, embed a live API feed into your own website. Sold stones drop out of your inventory automatically.
            </p>
            <Link to="/sign-up/jeweller" className="mt-6 inline-flex items-center text-sm font-medium text-foreground hover:text-[var(--color-gold)]">
              Create a jeweller account <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-md border border-border bg-card p-8">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Dealers</div>
            <h2 className="mt-3 font-serif text-3xl">List once. Reach jewellers worldwide.</h2>
            <p className="mt-4 text-muted-foreground">
              Upload your inventory manually or via CSV. Get discovered by jewellers across the UK, US, Europe and Australia. Your stones appear in their stores automatically; mark sold and they disappear instantly.
            </p>
            <Link to="/sign-up/dealer" className="mt-6 inline-flex items-center text-sm font-medium text-foreground hover:text-[var(--color-gold)]">
              Become a verified dealer <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured stones */}
      <section className="bg-secondary/30 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeUp className="flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured Inventory</div>
              <h2 className="mt-2 font-serif text-4xl">Hand-picked stones</h2>
            </div>
            <Link to="/marketplace" className="text-sm text-foreground hover:text-[var(--color-gold)]">
              View all →
            </Link>
          </FadeUp>
          <StaggerGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" delay={0.08}>
            {(featuredStones ?? []).map((s) => (
              <StoneCard key={s.id} stone={s} />
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Featured vendors */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <FadeUp className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Trusted Suppliers</div>
            <h2 className="mt-2 font-serif text-4xl">Featured vendors</h2>
          </div>
          <Link to="/vendors" className="text-sm text-foreground hover:text-[var(--color-gold)]">
            View all →
          </Link>
        </FadeUp>
        <StaggerGroup className="mt-8 grid gap-5 md:grid-cols-3">
          {(featuredVendors ?? []).map((v: any) => (
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

      {/* Trust strip */}
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

      <SiteFooter />
    </div>
  );
}

function StatBig({ label, value }: { label: string; value: number }) {
  return (
    <FadeUp className="text-center md:px-6">
      <div className="font-serif text-5xl text-[var(--color-gold)]">
        <CountUp value={value} />
      </div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    </FadeUp>
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
