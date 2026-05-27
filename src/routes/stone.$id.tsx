import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText } from "lucide-react";
import { EnquireDialog } from "@/components/site/EnquireDialog";
import { certLink, countryFlag } from "@/lib/countries";
import { getCertSignedUrl } from "@/lib/cert.functions";

export const Route = createFileRoute("/stone/$id")({
  component: StoneDetail,
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("stones")
      .select("id, stone_type, shape, carat_weight, colour_grade, clarity_grade, cert_lab, stone_images(storage_url), profiles:dealer_id(company_name, city, country)")
      .eq("id", params.id)
      .maybeSingle();
    return { stone: data as any };
  },
  head: ({ loaderData, params }) => {
    const s = loaderData?.stone;
    if (!s) return { meta: [{ title: "Stone — Chaos" }] };
    const carat = s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : "";
    const shape = s.shape ? `${s.shape} ` : "";
    const title = `${carat}${shape}${s.stone_type} — ${s.cert_lab || "Uncertified"} — Chaos`;
    const desc = `${carat}${s.colour_grade ? s.colour_grade + " " : ""}${shape}${s.stone_type}${s.clarity_grade ? ", " + s.clarity_grade : ""}${s.cert_lab ? ", certified by " + s.cert_lab : ""}${s.profiles?.company_name ? ", sourced from " + s.profiles.company_name : ""}${s.profiles?.city ? " in " + s.profiles.city + (s.profiles.country ? ", " + s.profiles.country : "") : ""}.`;
    const img = s.stone_images?.[0]?.storage_url;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `/stone/${params.id}` },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/stone/${params.id}` }],
    };
  },
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
  const fetchCert = useServerFn(getCertSignedUrl);
  const { data: certData } = useQuery({
    queryKey: ["cert-url", id],
    queryFn: () => fetchCert({ data: { stoneId: id } }),
    enabled: !!data?.cert_url,
    staleTime: 5 * 60 * 1000,
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
    ["Minimum order qty", stone.minimum_order_qty && stone.minimum_order_qty > 1 ? stone.minimum_order_qty : null],
    ["Bulk pricing", stone.bulk_pricing_available ? "Available on request" : null],
  ];

  const certHref = certLink(stone.cert_lab, stone.cert_number);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/marketplace" className="text-xs text-muted-foreground hover:text-foreground">← Back to marketplace</Link>
        <div className="mt-4 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* Gallery */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-card">
              {primaryImage ? (
                <motion.img
                  src={primaryImage}
                  alt=""
                  className="h-full w-full object-cover"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.slice(0, 5).map((src, i) => (
                  <motion.div
                    key={i}
                    className="aspect-square overflow-hidden rounded border border-border"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
                  >
                    <img src={src} className="h-full w-full object-cover" alt="" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

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
              {stone.status !== "available" && (
                <div
                  className={`mb-4 rounded-md border px-3 py-2 text-xs font-medium uppercase tracking-wider ${
                    stone.status === "sold"
                      ? "border-border bg-muted text-muted-foreground"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {stone.status === "sold" ? "Sold — no longer available" : "Reserved — currently under offer"}
                </div>
              )}
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Wholesale price</div>
              <div className="mt-1 font-mono text-3xl font-semibold">
                {stone.wholesale_price_usd ? `$${Number(stone.wholesale_price_usd).toLocaleString()} USD` : "POA"}
              </div>
              <div className="mt-4">
                {stone.status === "available" ? (
                  <EnquireDialog
                    dealerId={stone.dealer_id}
                    stoneId={stone.id}
                    context={`${stone.carat_weight ? Number(stone.carat_weight).toFixed(2) + "ct " : ""}${stone.shape || ""} ${stone.stone_type}`}
                  />
                ) : (
                  <Button disabled variant="outline" className="w-full">
                    {stone.status === "sold" ? "Sold" : "Reserved"}
                  </Button>
                )}
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
                  .map(([k, v], i) => (
                    <motion.div
                      key={k}
                      className="grid grid-cols-2 py-2.5"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
                    >
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-mono capitalize">{String(v)}</dd>
                    </motion.div>
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
              {stone.notes_for_buyers && (
                <div className="mt-4 rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)]">Notes from the dealer</div>
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground/85">{stone.notes_for_buyers}</p>
                </div>
              )}
              {certData?.url && (
                <a
                  href={certData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--color-gold)]/50 bg-[var(--color-gold)]/5 px-3 py-2 text-sm text-foreground hover:bg-[var(--color-gold)]/10"
                >
                  <FileText className="h-4 w-4 text-[var(--color-gold)]" />
                  View certificate PDF
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}