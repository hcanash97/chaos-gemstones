import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { StoneCard } from "@/components/site/StoneCard";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/vendors/$slug")({
  component: VendorProfile,
});

function VendorProfile() {
  const { slug } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["vendor", slug],
    queryFn: async () => {
      const { data: vendor } = await supabase
        .from("dealer_profiles")
        .select("id, bio, specialities, languages, years_trading, response_time_hours, gia_member, igi_member, profiles!inner(company_name, city, country, website, is_verified)")
        .eq("slug", slug)
        .maybeSingle();
      if (!vendor) return { vendor: null, stones: [] };
      const { data: stones } = await supabase
        .from("stones")
        .select("id, stone_type, shape, carat_weight, origin, country_of_origin, cert_lab, wholesale_price_usd, colour_grade, clarity_grade, stone_images(storage_url, is_primary)")
        .eq("dealer_id", vendor.id)
        .eq("status", "available");
      return {
        vendor,
        stones: (stones ?? []).map((s: any) => ({ ...s, image: s.stone_images?.[0]?.storage_url ?? null })),
      };
    },
  });

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
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <Link to="/vendors" className="text-xs opacity-70 hover:opacity-100">← All vendors</Link>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="font-serif text-5xl">{v.profiles.company_name}</h1>
            {v.profiles.is_verified && <ShieldCheck className="h-6 w-6 text-[var(--color-gold)]" />}
          </div>
          <div className="mt-2 text-sm opacity-70">
            {v.profiles.city}, {v.profiles.country} · {v.years_trading} years trading · ~{v.response_time_hours}h response
          </div>
          <p className="mt-6 max-w-2xl opacity-90">{v.bio}</p>
          <div className="mt-6 flex flex-wrap gap-1.5">
            {(v.specialities ?? []).map((s: string) => (
              <Badge key={s} className="bg-white/10 text-primary-foreground">{s}</Badge>
            ))}
            {v.gia_member && <Badge className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">GIA Member</Badge>}
            {v.igi_member && <Badge className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">IGI Member</Badge>}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="font-serif text-3xl">Catalogue</h2>
        <p className="mt-1 text-sm text-muted-foreground">{data.stones.length} stones available</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.stones.map((s) => <StoneCard key={s.id} stone={s} />)}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}