import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Gem, Search, ShieldCheck, Sparkles } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { SEO_MARKETPLACE_PAGES, getSeoMarketplacePage, marketplaceFilterHref } from "@/lib/seo-marketplace";

export const Route = createFileRoute("/marketplace/$slug")({
  component: SeoMarketplaceLanding,
  head: ({ params }) => {
    const page = getSeoMarketplacePage(params.slug);
    if (!page) return { meta: [{ title: "Marketplace — Chaos Gemstones" }] };
    const url = `/marketplace/${page.slug}`;
    return {
      meta: [
        { title: page.title },
        { name: "description", content: page.description },
        { name: "keywords", content: page.keywords.join(", ") },
        { property: "og:title", content: page.title },
        { property: "og:description", content: page.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: page.h1,
            description: page.description,
            url: `https://chaosgemstones.com${url}`,
            isPartOf: {
              "@type": "WebSite",
              name: "Chaos Gemstones",
              url: "https://chaosgemstones.com",
            },
          }),
        },
      ],
    };
  },
});

function SeoMarketplaceLanding() {
  const { slug } = Route.useParams();
  const page = getSeoMarketplacePage(slug);

  if (!page) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="font-serif text-4xl">Marketplace page not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">This collection has moved or is not available yet.</p>
          <Link to="/marketplace" className="mt-6 inline-block">
            <Button>Browse marketplace</Button>
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const marketplaceHref = marketplaceFilterHref(page.filters);
  const related = SEO_MARKETPLACE_PAGES.filter((item) => item.slug !== page.slug).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-secondary/20">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-gold)]">
                Chaos marketplace collection
              </div>
              <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground md:text-5xl">{page.h1}</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">{page.intro}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={marketplaceHref}>
                  <Button>
                    <Search className="mr-2 h-4 w-4" />
                    Browse live listings
                  </Button>
                </a>
                {page.audience !== "dealers" ? (
                  <Link to="/sign-up/jeweller">
                    <Button variant="outline">Join as a jeweller</Button>
                  </Link>
                ) : (
                  <Link to="/sign-up/dealer">
                    <Button variant="outline">List as a dealer</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-6 py-10 md:grid-cols-3">
          <ValueCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Verified trade access"
            text="Chaos is built around approved dealers and jewellers, with certificate, origin, treatment and pricing fields kept close to each listing."
          />
          <ValueCard
            icon={<Gem className="h-4 w-4" />}
            title="Structured inventory"
            text="Search by stone type, shape, carat, lab, colour, clarity and treatment instead of reading inconsistent spreadsheet notes."
          />
          <ValueCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Selling tools"
            text="Jewellers can save stones, prepare client quotes, browse in retail mode, and pull followed dealer inventory into their own feeds."
          />
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <h2 className="font-serif text-2xl">Popular marketplace searches</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  to="/marketplace/$slug"
                  params={{ slug: item.slug }}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition hover:border-[var(--color-gold)] hover:text-foreground"
                >
                  {item.h1}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ValueCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)]">
        {icon}
      </div>
      <h2 className="mt-4 font-serif text-xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
