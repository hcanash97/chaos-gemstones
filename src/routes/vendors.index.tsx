import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ShieldCheck, Gem } from "lucide-react";
import { motion } from "framer-motion";
import { StaggerGroup } from "@/components/anim/Motion";

export const Route = createFileRoute("/vendors/")({
  component: Vendors,
  head: () => ({
    meta: [
      { title: "Verified Gemstone & Diamond Dealers — Chaos Gemstones" },
      {
        name: "description",
        content:
          "Browse verified independent gemstone and diamond dealers from Jaipur, Surat, Bangkok, Colombo and beyond. GIA, IGI, GRS certified stones available wholesale.",
      },
      {
        name: "keywords",
        content:
          "gemstone dealers, diamond dealers India, Jaipur gemstone supplier, Surat diamond dealer, wholesale gemstone supplier, certified gemstone dealer",
      },
      { property: "og:title", content: "Verified Gemstone & Diamond Dealers — Chaos Gemstones" },
      {
        property: "og:description",
        content:
          "Browse verified independent gemstone and diamond dealers worldwide. GIA, IGI, GRS certified stones available wholesale.",
      },
      { property: "og:url", content: "/vendors" },
    ],
    links: [{ rel: "canonical", href: "/vendors" }],
  }),
});

function Vendors() {
  const [q, setQ] = useState("");
  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors"],
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await supabase
        .from("dealer_profiles")
        .select("id, slug, bio, logo_url, tagline, story, specialities, years_trading, response_time_hours, profiles:dealer_profiles_public!inner(company_name, city, country, is_verified)")
        .order("featured", { ascending: false });
      return data ?? [];
    },
  });

  const { data: stoneCounts } = useQuery({
    queryKey: ["vendor-stone-counts"],
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const counts: Record<string, number> = {};
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("stones")
          .select("dealer_id")
          .eq("status", "available")
          .eq("feed_inactive", false)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        (data ?? []).forEach((s: any) => {
          counts[s.dealer_id] = (counts[s.dealer_id] ?? 0) + 1;
        });
        if (!data || data.length < pageSize) break;
      }
      return counts;
    },
  });

  const filtered = (vendors ?? []).filter((v: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      v.profiles?.company_name?.toLowerCase().includes(s) ||
      v.profiles?.city?.toLowerCase().includes(s) ||
      v.profiles?.country?.toLowerCase().includes(s) ||
      v.tagline?.toLowerCase().includes(s) ||
      (v.specialities ?? []).some((x: string) => x.toLowerCase().includes(s))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-serif text-4xl">Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">Independent dealers across the gemstone trade.</p>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, city, country or speciality…" className="mt-6 max-w-md" />
        {isLoading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border bg-card p-6">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <Skeleton className="mt-1 h-3 w-1/3" />
                <Skeleton className="mt-4 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-5/6" />
                <div className="mt-4 flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <StaggerGroup className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" delay={0.06}>
          {filtered.map((v: any) => {
            const specs: string[] = v.specialities ?? [];
            const isDiamond = specs.some((s) => /diamond/i.test(s));
            const headerStyle = isDiamond
              ? { background: "linear-gradient(135deg, #0F1B3D 0%, #2E4A8A 100%)" }
              : { background: "linear-gradient(135deg, #1B3A2D 0%, #3F7A5E 100%)" };
            const count = stoneCounts?.[v.id] ?? 0;
            const completeness = publicVendorCompleteness(v, count);
            const hasCompleteProfile = completeness >= 80;
            return (
            <motion.div
              key={v.id}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link
                to="/vendors/$slug"
                params={{ slug: v.slug }}
                className="relative block overflow-hidden rounded-md border border-border bg-card transition-all hover:border-[var(--color-gold)] hover:shadow-[0_18px_40px_-22px_rgba(15,27,61,0.45)]"
              >
                <div className="relative h-3 w-full" style={headerStyle}>
                  <span className="shimmer-overlay" aria-hidden />
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-3">
                    {v.logo_url ? (
                      <img
                        src={v.logo_url}
                        alt={`${v.profiles?.company_name ?? "Vendor"} logo`}
                        className="h-11 w-11 shrink-0 rounded-full border border-[var(--color-gold)]/40 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-serif text-lg">
                        {(v.profiles?.company_name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-xl leading-tight">{v.profiles?.company_name}</h3>
                        {v.profiles?.is_verified && (
                          <ShieldCheck className="h-4 w-4 text-[var(--color-gold)] gold-pulse" />
                        )}
                      </div>
                      {hasCompleteProfile && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Profile complete
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {v.profiles?.city}, {v.profiles?.country} · {v.years_trading} yrs trading
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[var(--color-gold)]">
                    <Gem className="h-3.5 w-3.5" />
                    <span className="font-mono text-lg leading-none font-semibold">{count}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">stones</span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                    {v.tagline || v.bio}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {specs.slice(0, 4).map((s: string) => (
                      <span
                        key={s}
                        className="rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-gold)]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </motion.div>
            );
          })}
        </StaggerGroup>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function publicVendorCompleteness(v: any, stoneCount: number) {
  let score = 0;
  if (v.profiles?.company_name) score += 15;
  if (v.profiles?.city && v.profiles?.country) score += 15;
  if (v.profiles?.is_verified) score += 15;
  if (v.logo_url) score += 10;
  if (v.tagline) score += 10;
  if ((v.bio?.trim()?.length ?? 0) >= 80 || (v.story?.trim()?.length ?? 0) >= 80) score += 15;
  if ((v.specialities?.length ?? 0) > 0) score += 10;
  if (stoneCount > 0) score += 10;
  return score;
}
