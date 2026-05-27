import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { EnquireDialog } from "@/components/site/EnquireDialog";
import { certLink, countryFlag } from "@/lib/countries";

export const Route = createFileRoute("/stone/$id")({
  component: StoneDetail,
});

function StoneDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["stone", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stones")
        .select("*, stone_images(storage_url, is_primary, sort_order), profiles:dealer_id(company_name, city, country, is_verified), dealer:dealer_id(dealer_profiles(slug))")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="mx-auto max-w-7xl px-6 py-20 text-center text-sm text-muted-foreground">Loading…</div></div>;
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="font-serif text-3xl">Stone not found or unavailable</h1>
          <Link to="/marketplace" className="mt-4 inline-block text-sm text-[var(--color-gold)]">← Back to marketplace</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const stone: any = data;
  const images: string[] = (stone.stone_images ?? []).map((i: any) => i.storage_url);
  const primaryImage = images[0];
  const slug = stone.dealer?.dealer_profiles?.slug;

  const specs: Array<[string, any]> = [
    ["Stone type", stone.stone_type],
    ["Origin", stone.origin],
    ["Country of origin", stone.country_of_origin ? `${countryFlag(stone.country_of_origin)} ${stone.country_of_origin}` : null],
    ["Treatment", stone.treatment],
    ["Shape", stone.shape],
    ["Carat weight", stone.carat_weight ? `${Number(stone.carat_weight).toFixed(2)} ct` : null],
    ["Colour grade", stone.colour_grade],
    ["Clarity grade", stone.clarity_grade],
    ["Cut grade", stone.cut_grade],
    ["Polish", stone.polish],
    ["Symmetry", stone.symmetry],
    ["Fluorescence", stone.fluorescence],
    ["Colour hue", stone.colour_hue],
    ["Colour tone", stone.colour_tone],
    ["Colour saturation", stone.colour_saturation],
    ["Cert lab", stone.cert_lab],
    ["Report date", stone.report_date],
    ["Lead time", stone.lead_time_days ? `${stone.lead_time_days} days` : null],
    ["Available qty", stone.available_qty],
  ];

  const certHref = certLink(stone.cert_lab, stone.cert_number);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/marketplace" className="text-xs text-muted-foreground hover:text-foreground">← Back to marketplace</Link>
        <div className="mt-4 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* Gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded-md border border-border bg-card">
              {primaryImage ? (
                <img src={primaryImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.slice(0, 5).map((src, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded border border-border">
                    <img src={src} className="h-full w-full object-cover" alt="" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Specs */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {stone.origin === "lab-grown" ? "Lab Grown" : "Natural"} · {stone.cert_lab || "No cert"}
            </div>
            <h1 className="mt-2 font-serif text-4xl capitalize">
              {stone.carat_weight ? `${Number(stone.carat_weight).toFixed(2)}ct ` : ""}
              {stone.shape} {stone.stone_type}
            </h1>
            <div className="mt-2 flex gap-2">
              {stone.colour_grade && <Badge variant="outline" className="font-mono">{stone.colour_grade}</Badge>}
              {stone.clarity_grade && <Badge variant="outline" className="font-mono">{stone.clarity_grade}</Badge>}
              {stone.cut_grade && <Badge variant="outline" className="font-mono">{stone.cut_grade}</Badge>}
            </div>

            <div className="mt-6 rounded-md border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Wholesale price</div>
              <div className="mt-1 font-mono text-3xl font-semibold">
                {stone.wholesale_price_usd ? `$${Number(stone.wholesale_price_usd).toLocaleString()} USD` : "POA"}
              </div>
              <div className="mt-4">
                <EnquireDialog
                  dealerId={stone.dealer_id}
                  stoneId={stone.id}
                  context={`${stone.carat_weight ? Number(stone.carat_weight).toFixed(2) + "ct " : ""}${stone.shape || ""} ${stone.stone_type}`}
                />
              </div>
            </div>

            {/* Vendor card */}
            {slug && (
              <Link to="/vendors/$slug" params={{ slug }} className="mt-4 block rounded-md border border-border bg-card p-4 transition-all hover:border-[var(--color-gold)]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Listed by</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-serif text-lg">{stone.profiles?.company_name}</span>
                  {stone.profiles?.is_verified && <ShieldCheck className="h-4 w-4 text-[var(--color-gold)]" />}
                </div>
                <div className="text-xs text-muted-foreground">{stone.profiles?.city}, {stone.profiles?.country}</div>
              </Link>
            )}

            {/* Spec table */}
            <div className="mt-6">
              <h3 className="font-serif text-xl">Specifications</h3>
              <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
                {specs
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([k, v]) => (
                    <div key={k} className="grid grid-cols-2 py-2.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-mono capitalize">{String(v)}</dd>
                    </div>
                  ))}
              {stone.cert_number && (
                <div className="grid grid-cols-2 py-2.5">
                  <dt className="text-muted-foreground">Cert number</dt>
                  <dd className="font-mono">
                    {certHref ? (
                      <a
                        href={certHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-gold)] underline-offset-2 hover:underline"
                      >
                        {stone.cert_number} ↗
                      </a>
                    ) : (
                      stone.cert_number
                    )}
                  </dd>
                </div>
              )}
              </dl>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}