import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/vendors/")({
  component: Vendors,
});

function Vendors() {
  const [q, setQ] = useState("");
  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dealer_profiles")
        .select("id, slug, bio, specialities, years_trading, response_time_hours, profiles!inner(company_name, city, country, is_verified)")
        .order("featured", { ascending: false });
      return data ?? [];
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
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v: any) => (
            <Link
              key={v.id}
              to="/vendors/$slug"
              params={{ slug: v.slug }}
              className="block rounded-md border border-border bg-card p-6 transition-all hover:border-[var(--color-gold)]"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl">{v.profiles?.company_name}</h3>
                {v.profiles?.is_verified && <ShieldCheck className="h-4 w-4 text-[var(--color-gold)]" />}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {v.profiles?.city}, {v.profiles?.country} · {v.years_trading} yrs trading
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{v.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(v.specialities ?? []).slice(0, 4).map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}