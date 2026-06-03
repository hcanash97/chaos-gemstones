import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { countryFlag } from "@/lib/countries";
import { motion } from "framer-motion";

export const Route = createFileRoute("/jewellers/")({
  component: JewellersDirectory,
  head: () => ({
    meta: [
      { title: "Jewellers using Chaos — Verified B2B buyers" },
      { name: "description", content: "Independent jewellers across the UK, US, Canada and Australia sourcing through Chaos." },
      { property: "og:title", content: "Jewellers using Chaos" },
      { property: "og:description", content: "Independent jewellers sourcing certified gemstones through Chaos." },
    ],
    links: [{ rel: "canonical", href: "/jewellers" }],
  }),
});

function JewellersDirectory() {
  const [q, setQ] = useState("");
  const { data: jewellers, isLoading } = useQuery({
    queryKey: ["jewellers-public"],
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("jeweller_profiles")
        .select("id, slug, logo_url, tagline, specialities, primary_market, created_at, is_public, profiles!inner(company_name, city, country, is_approved, account_type, account_types)")
        .eq("is_public", true);
      return ((data ?? []) as any[]).filter((j) =>
        j.profiles?.is_approved &&
        (j.profiles.account_type === "jeweller" || (j.profiles.account_types ?? []).includes("jeweller")),
      );
    },
  });

  const filtered = (jewellers ?? []).filter((j: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      j.profiles?.company_name?.toLowerCase().includes(s) ||
      j.profiles?.city?.toLowerCase().includes(s) ||
      j.profiles?.country?.toLowerCase().includes(s) ||
      (j.specialities ?? []).some((x: string) => x.toLowerCase().includes(s))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">Community</div>
        <h1 className="mt-2 font-serif text-4xl">Jewellers using Chaos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Independent jewellery houses, designers and ateliers sourcing certified stones through the platform.
        </p>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, city or speciality…"
          className="mt-6 max-w-md"
          aria-label="Search jewellers"
        />

        {isLoading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border bg-card p-6">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="mt-4 h-5 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-md border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No public jeweller profiles yet — check back soon.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((j: any, i: number) => {
              const initials = (j.profiles.company_name || "?").slice(0, 1).toUpperCase();
              return (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                >
                  <Link
                    to="/jewellers/$slug"
                    params={{ slug: j.slug || j.id }}
                    className="group block rounded-md border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--color-gold)] hover:shadow-[0_18px_40px_-22px_rgba(15,27,61,0.45)]"
                  >
                    <div className="flex items-center gap-3">
                      {j.logo_url ? (
                        <img src={j.logo_url} alt={`${j.profiles.company_name} logo`} className="h-12 w-12 rounded-full border-2 border-[var(--color-gold)] object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--color-gold)] bg-[var(--color-gold)]/10 font-serif text-lg text-[var(--color-gold)]">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h3 className="font-serif text-lg leading-tight">{j.profiles.company_name}</h3>
                        <div className="text-xs text-muted-foreground">
                          {j.profiles.city ? `${j.profiles.city}, ` : ""}
                          {j.profiles.country ? `${countryFlag(j.profiles.country)} ${j.profiles.country}` : ""}
                        </div>
                      </div>
                    </div>
                    {j.tagline && <p className="mt-3 text-sm italic text-muted-foreground">{j.tagline}</p>}
                    {(j.specialities ?? []).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {(j.specialities ?? []).slice(0, 4).map((s: string) => (
                          <span key={s} className="rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-gold)]">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 text-xs font-medium text-[var(--color-gold)]">View profile →</div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}