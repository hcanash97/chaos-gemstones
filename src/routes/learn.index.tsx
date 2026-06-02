import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { BookOpen, Gem } from "lucide-react";

const ENCYCLOPEDIA = [
  { slug: "sapphire", name: "Sapphire" },
  { slug: "ruby", name: "Ruby" },
  { slug: "emerald", name: "Emerald" },
  { slug: "alexandrite", name: "Alexandrite" },
  { slug: "spinel", name: "Spinel" },
  { slug: "tanzanite", name: "Tanzanite" },
  { slug: "diamond", name: "Diamond" },
  { slug: "tourmaline", name: "Tourmaline" },
  { slug: "paraiba", name: "Paraiba Tourmaline" },
];

export const Route = createFileRoute("/learn/")({
  component: LearnIndex,
  head: () => ({
    meta: [
      { title: "Learning Hub — Chaos Gemstones" },
      {
        name: "description",
        content:
          "Guides for jewellers and buyers: sourcing coloured stones, embedding live dealer feeds, markup strategy, cert labs, and the world's gem hubs.",
      },
      { property: "og:title", content: "Chaos Learning Hub — Sourcing & Trade Guides" },
      {
        property: "og:description",
        content:
          "Free guides on sourcing gemstones direct from Jaipur, Bangkok and Colombo, embedding live inventory feeds, and pricing strategy.",
      },
      { property: "og:url", content: "https://chaosgemstones.com/learn" },
    ],
    links: [{ rel: "canonical", href: "https://chaosgemstones.com/learn" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Chaos Learning Hub",
          url: "https://chaosgemstones.com/learn",
          description:
            "Guides for independent jewellers sourcing gemstones direct from verified trade dealers.",
        }),
      },
    ],
  }),
});

const GUIDES = [
  {
    slug: "sourcing-coloured-gemstones",
    eyebrow: "Sourcing",
    title: "How to source coloured gemstones direct from cutters",
    blurb:
      "Skip the broker chain. A practical playbook for buying sapphires, rubies and emeralds from verified dealers in Asia.",
  },
  {
    slug: "api-embedding-guide",
    eyebrow: "For your website",
    title: "Embedding a live gemstone feed on your jewellery website",
    blurb:
      "Show your customers a constantly-refreshed catalogue from the dealers you trust — Shopify, Wix, Webflow, Squarespace, WordPress.",
  },
  {
    slug: "jewellers-markup-strategy",
    eyebrow: "Pricing",
    title: "Markup strategy for independent jewellers",
    blurb:
      "How to apply a sensible wholesale-to-retail markup per stone type, dealer and currency without scaring off clients.",
  },
  {
    slug: "gemstone-cert-labs",
    eyebrow: "Quality",
    title: "GIA, IGI, Gübelin and SSEF — which cert lab to trust",
    blurb:
      "A buyer's tour of the gemstone certification labs that matter, what each lab is strict on, and when a cert is worth the wait.",
  },
  {
    slug: "jaipur-bangkok-colombo-guide",
    eyebrow: "Markets",
    title: "Jaipur, Bangkok, Colombo — the world's gem cutting hubs",
    blurb:
      "What each market specialises in, how dealers price, and how to evaluate offers from each region remotely.",
  },
  {
    slug: "wholesale-vs-retail",
    eyebrow: "Trade",
    title: "Wholesale vs retail: how the gem trade actually prices",
    blurb:
      "Why one dealer's 'wholesale' is another's retail, and how Chaos forces transparent dealer pricing across the platform.",
  },
] as const;

function LearnIndex() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-[var(--gold-border)] bg-[color-mix(in_oklab,var(--color-gold)_6%,var(--color-sand))]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
            <BookOpen className="h-4 w-4" /> Learning Hub
          </div>
          <h1 className="mt-2 font-serif text-5xl text-foreground">Guides for the modern jeweller</h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Practical, plainly-written guides on sourcing gemstones direct, embedding live dealer
            feeds, pricing strategy, and the cert labs and markets that matter.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              to="/learn/$slug"
              params={{ slug: g.slug }}
              className="group rounded-lg border border-border bg-card p-6 transition hover:border-[var(--color-gold)] hover:shadow-md"
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)]">
                {g.eyebrow}
              </div>
              <h2 className="mt-2 font-serif text-xl text-foreground group-hover:text-[var(--color-gold)]">
                {g.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{g.blurb}</p>
              <div className="mt-4 text-xs font-medium text-[var(--color-gold)]">Read guide →</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
            <Gem className="h-4 w-4" /> Gemstone Encyclopedia
          </div>
          <h2 className="mt-2 font-serif text-3xl text-foreground">
            Wholesale buying guides by stone type
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Properties, what to look for, certification guidance, treatment standards and
            typical wholesale price tiers — for every major coloured stone and diamond category.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {ENCYCLOPEDIA.map((s) => (
              <Link
                key={s.slug}
                to="/learn/gemstones/$type"
                params={{ type: s.slug }}
                className="group rounded-md border border-border bg-card p-4 transition hover:border-[var(--color-gold)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-lg text-foreground group-hover:text-[var(--color-gold)]">
                    {s.name}
                  </span>
                  <span className="text-xs text-[var(--color-gold)]">→</span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Buying guide
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}