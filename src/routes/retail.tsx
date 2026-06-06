import { createFileRoute, Link } from "@tanstack/react-router";
import { Gem, Handshake, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/retail")({
  component: RetailShowroomPage,
  head: () => ({
    meta: [
      { title: "Retail Gemstone Showroom — Chaos Gemstones" },
      {
        name: "description",
        content:
          "A client-facing gemstone sourcing experience from Chaos, built for retail enquiries, transparent stone passports and curated gemstone quotes.",
      },
      { property: "og:title", content: "Retail Gemstone Showroom — Chaos Gemstones" },
      {
        property: "og:description",
        content:
          "Browse retail-ready gemstone sourcing with client-facing quotes, stone passports and curated support from Chaos.",
      },
    ],
    links: [{ rel: "canonical", href: "/retail" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Retail Gemstone Showroom",
          description:
            "A client-facing gemstone sourcing experience from Chaos for retail enquiries and curated gemstone quotes.",
          url: "https://chaosgemstones.com/retail",
        }),
      },
    ],
  }),
});

const RETAIL_POINTS = [
  {
    title: "Chaos-controlled retail margin",
    text: "Use Chaos as its own retail-facing sourcing channel, with markups controlled by the Chaos account rather than sending every opportunity through a separate jewellery brand.",
    icon: ReceiptText,
  },
  {
    title: "Client-facing browsing",
    text: "Retail Mode hides trade-only context and makes the marketplace easier to use when discussing stones with a private client.",
    icon: ShieldCheck,
  },
  {
    title: "Concierge before checkout",
    text: "The sensible first version is enquiry-led: confirm availability, certificate details, setting requirements and pricing before adding full ecommerce payments.",
    icon: Handshake,
  },
];

function RetailShowroomPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-secondary/20">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--color-gold)]">
                <Sparkles className="h-4 w-4" />
                Retail showroom
              </div>
              <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight md:text-6xl">
                Sell sourced stones through Chaos as a retail experience.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                Chaos can support a consumer-facing path without depending on a partner brand. The first version should be a curated enquiry workflow: browse retail-ready stones, prepare a client quote, confirm the dealer stock, then manage the sale cleanly through Chaos.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="/marketplace?retail=1">
                  <Button size="lg" className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                    Browse retail-ready stones
                  </Button>
                </a>
                <Link to="/faq">
                  <Button size="lg" variant="outline">Read retail FAQ</Button>
                </Link>
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)]">
                  <Gem className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl">How this starts</h2>
                  <p className="text-sm text-muted-foreground">Manual, controlled, and commercially clear.</p>
                </div>
              </div>
              <ol className="mt-6 space-y-4 text-sm text-muted-foreground">
                <li><span className="font-medium text-foreground">1.</span> Client requests a stone or browses a retail-safe marketplace view.</li>
                <li><span className="font-medium text-foreground">2.</span> Chaos prepares a Stone Passport or quote with an agreed retail margin.</li>
                <li><span className="font-medium text-foreground">3.</span> Availability, certificate details and shipping are confirmed before taking payment.</li>
                <li><span className="font-medium text-foreground">4.</span> Checkout and fulfilment automation can be added once the manual workflow proves demand.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-5 md:grid-cols-3">
            {RETAIL_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <article key={point.title} className="rounded-md border border-border bg-card p-6">
                  <Icon className="h-5 w-5 text-[var(--color-gold)]" />
                  <h2 className="mt-4 font-serif text-xl">{point.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{point.text}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-10 rounded-md border border-[var(--gold-border)] bg-[var(--color-gold)]/10 p-6">
            <h2 className="font-serif text-2xl">Commercial note</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              From a product perspective, the cleanest route is to keep Chaos Retail as a separate channel with its own markup rules, enquiries and records. Any relationship with another jewellery company should be documented separately so ownership, margin, referrals and responsibilities are clear before orders start moving.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
