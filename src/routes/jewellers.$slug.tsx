import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { countryFlag } from "@/lib/countries";
import { Globe, Instagram, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/jewellers/$slug")({
  component: JewellerProfile,
  head: ({ params }) => ({
    meta: [
      { title: `Jeweller profile — Chaos Gemstones` },
      { property: "og:url", content: `/jewellers/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `/jewellers/${params.slug}` }],
  }),
});

function JewellerProfile() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["jeweller-profile", slug],
    queryFn: async () => {
      const { data: jp } = await (supabase as any)
        .from("jeweller_profiles")
        .select("id, slug, logo_url, tagline, instagram_url, founded_year, specialities, primary_market, website, bio, is_public, profiles!inner(company_name, city, country, website, is_approved, created_at)")
        .eq("slug", slug)
        .maybeSingle();
      if (!jp || !jp.is_public || !jp.profiles?.is_approved) return { jeweller: null, requests: [] as any[] };
      const { data: requests } = await supabase
        .from("stone_requests")
        .select("id, stone_type, shape, min_carat, max_carat, colour_description, treatment, cert_lab, notes, created_at")
        .eq("jeweller_id", jp.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10);
      return { jeweller: jp, requests: requests ?? [] };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-6 py-16">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="mt-6 h-10 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  const j: any = data?.jeweller;
  if (!j) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="font-serif text-3xl">Jeweller not found</h1>
          <Link to="/jewellers" className="mt-4 inline-block text-sm text-[var(--color-gold)]">← Back to jewellers</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const memberSince = j.profiles?.created_at
    ? new Date(j.profiles.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;
  const initials = (j.profiles.company_name || "?").slice(0, 1).toUpperCase();
  const website = j.website || j.profiles?.website;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden text-primary-foreground" style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #162347 100%)" }}>
        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <Link to="/jewellers" className="text-xs opacity-70 hover:opacity-100">← All jewellers</Link>
          <div className="mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {j.logo_url ? (
              <img src={j.logo_url} alt={`${j.profiles.company_name} logo`} className="h-24 w-24 rounded-full border-2 border-[var(--color-gold)] object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--color-gold)] bg-[var(--color-gold)]/10 font-serif text-4xl text-[var(--color-gold)]">
                {initials}
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-serif text-4xl md:text-5xl">{j.profiles.company_name}</h1>
              <div className="mt-2 text-sm opacity-80">
                {j.profiles.city ? `${j.profiles.city}, ` : ""}
                {j.profiles.country ? `${countryFlag(j.profiles.country)} ${j.profiles.country}` : ""}
                {j.founded_year ? ` · Est. ${j.founded_year}` : ""}
              </div>
              {j.tagline && <p className="mt-3 max-w-xl text-base italic opacity-90">{j.tagline}</p>}
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {website && (
                  <a href={website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-[var(--color-gold)] hover:opacity-90">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                {j.instagram_url && (
                  <a href={j.instagram_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-[var(--color-gold)] hover:opacity-90">
                    <Instagram className="h-4 w-4" /> Instagram
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {(j.specialities ?? []).length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sourcing for</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(j.specialities ?? []).map((s: string) => (
                <Badge key={s} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {j.bio && (
          <div className="mt-10 border-l-2 border-[var(--color-gold)] pl-5">
            <p className="text-base leading-relaxed text-foreground/85">{j.bio}</p>
          </div>
        )}

        {memberSince && (
          <p className="mt-8 text-xs uppercase tracking-[0.18em] text-muted-foreground">Active on Chaos since {memberSince}</p>
        )}

        <div className="mt-6 flex items-start gap-2 rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-gold)]" />
          <span>This jeweller sources stones through Chaos Gemstones — a verified B2B marketplace.</span>
        </div>

        {(data?.requests ?? []).length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl">Currently looking for</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(data?.requests ?? []).map((r: any) => (
                <div key={r.id} className="rounded-md border border-border bg-card p-4">
                  <div className="text-sm font-medium capitalize">
                    {r.shape?.join?.(", ") || ""} {r.stone_type}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.min_carat ? `${r.min_carat}` : ""}{r.max_carat ? `–${r.max_carat}ct` : r.min_carat ? "ct+" : ""}
                    {r.cert_lab ? ` · ${r.cert_lab}` : ""}
                    {r.treatment ? ` · ${r.treatment}` : ""}
                  </div>
                  {r.colour_description && <div className="mt-1 text-xs text-muted-foreground">Colour: {r.colour_description}</div>}
                  {r.notes && <p className="mt-2 text-sm text-foreground/80">{r.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}