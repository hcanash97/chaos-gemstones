import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Gem, Newspaper } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";

const POSTS = [
  {
    slug: "what-jewellers-should-check-before-buying-a-diamond-online",
    category: "Buying checks",
    title: "What jewellers should check before buying a diamond online",
    excerpt:
      "A practical checklist for reading certs, matching stock numbers, spotting missing media, and asking the right dealer questions before reserving a stone.",
    readTime: "5 min read",
  },
  {
    slug: "why-live-inventory-feeds-matter-for-independent-jewellers",
    category: "Live inventory",
    title: "Why live inventory feeds matter for independent jewellers",
    excerpt:
      "How live feeds reduce sold-stone disappointment, speed up quoting, and help smaller jewellers show a broader catalogue without holding stock.",
    readTime: "4 min read",
  },
  {
    slug: "certificate-numbers-stock-numbers-and-sync-keys-explained",
    category: "Dealer API",
    title: "Certificate numbers, stock numbers and sync keys explained",
    excerpt:
      "A beginner-friendly explanation of the IDs Chaos uses to prevent duplicates when importing dealer inventory from APIs, CSV files and WhatsApp listings.",
    readTime: "6 min read",
  },
] as const;

export const Route = createFileRoute("/blog")({
  component: BlogPage,
  head: () => ({
    meta: [
      { title: "Blog — Chaos Gemstones" },
      {
        name: "description",
        content:
          "Chaos Gemstones blog: practical notes on buying diamonds, gemstone sourcing, live inventory feeds, dealer APIs and jeweller retail workflows.",
      },
      { property: "og:title", content: "Chaos Gemstones Blog" },
      {
        property: "og:description",
        content:
          "Practical notes on buying diamonds, gemstone sourcing, live inventory feeds and jeweller retail workflows.",
      },
      { property: "og:url", content: "https://chaosgemstones.com/blog" },
    ],
    links: [{ rel: "canonical", href: "https://chaosgemstones.com/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Chaos Gemstones Blog",
          url: "https://chaosgemstones.com/blog",
          description:
            "Practical notes for jewellers and dealers using Chaos Gemstones.",
          publisher: {
            "@type": "Organization",
            name: "Chaos Gemstones",
            url: "https://chaosgemstones.com",
          },
        }),
      },
    ],
  }),
});

function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-[var(--gold-border)] bg-[color-mix(in_oklab,var(--color-gold)_7%,var(--color-sand))]">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
                <Newspaper className="h-4 w-4" />
                Chaos Blog
              </div>
              <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-foreground sm:text-5xl">
                Notes on sourcing, selling and syncing gemstones.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                A simple editorial home for Chaos: buying guides, dealer API notes,
                marketplace updates, and practical advice for jewellers building a
                stronger stone sourcing workflow.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/marketplace">
                  <Button>
                    Browse stones
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/learn">
                  <Button variant="outline">Visit learning hub</Button>
                </Link>
              </div>
            </div>
            <aside className="rounded-md border border-border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--gold-border)] bg-[color-mix(in_oklab,var(--color-gold)_12%,white)] text-[var(--color-gold)]">
                <Gem className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-serif text-2xl text-foreground">
                Starter publishing path
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                This page is ready for proper article routes later. For now it gives
                the site a crawlable blog index and a clean place to test navigation,
                SEO metadata and visual layout.
              </p>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
                <BookOpen className="h-4 w-4" />
                Latest notes
              </div>
              <h2 className="mt-2 font-serif text-3xl text-foreground">
                Articles to publish next
              </h2>
            </div>
            <Link
              to="/faq"
              className="text-sm font-medium text-[var(--color-gold)] hover:underline"
            >
              Common questions →
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {POSTS.map((post) => (
              <article
                key={post.slug}
                className="flex min-h-[280px] flex-col rounded-md border border-border bg-card p-6 shadow-sm transition hover:border-[var(--color-gold)] hover:shadow-md"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  {post.category}
                </div>
                <h3 className="mt-3 font-serif text-xl leading-snug text-foreground">
                  {post.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                  {post.excerpt}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>{post.readTime}</span>
                  <span className="font-medium text-[var(--color-gold)]">
                    Draft article
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
