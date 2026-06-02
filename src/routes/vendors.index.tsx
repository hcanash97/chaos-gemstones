import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";
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
    queryFn: async () => {
      const { data } = await supabase
        .from("dealer_profiles")
        .select("id, slug, bio, specialities, years_trading, response_time_hours, profiles!inner(company_name, city, country, is_verified)")
        .order("featured", { ascending: false });
      return data ?? [];
    },
  });

  const { data: stoneCounts } = useQuery({
    queryKey: ["vendor-stone-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stones")
        .select("dealer_id")
        .eq("status", "available")
        .limit(1000);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((s: any) => {
        counts[s.dealer_id] = (counts[s.dealer_id] ?? 0) + 1;
      });
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
          {filtered.map((v: any) => (
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
                <div className="mt-1 text-xs font-mono text-[var(--color-gold)]">
                  {stoneCounts?.[v.id] ?? 0} stones available
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{v.bio}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(v.specialities ?? []).slice(0, 4).map((s: string, i: number) => (
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
        )}
      </div>
      <SiteFooter />
    </div>
  );
}