import { Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function LearnLayout({
  eyebrow,
  title,
  intro,
  children,
  readingTime,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  readingTime?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-6 py-14">
        <Link
          to="/learn"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> All guides
        </Link>
        <div className="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
          {eyebrow}
        </div>
        <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">{title}</h1>
        {readingTime && (
          <div className="mt-3 text-xs text-muted-foreground">{readingTime} read</div>
        )}
        <p className="mt-4 text-lg text-muted-foreground">{intro}</p>
        <div className="prose prose-neutral mt-8 max-w-none text-foreground prose-headings:font-serif prose-headings:text-foreground prose-h2:mt-10 prose-h2:text-2xl prose-h3:text-xl prose-a:text-[var(--color-gold)] prose-strong:text-foreground prose-li:my-1">
          {children}
        </div>
        <div className="mt-12 rounded-lg border border-[var(--gold-border)] bg-card p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Next steps</div>
          <h3 className="mt-1 font-serif text-xl">Browse Chaos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Verified independent dealers in Jaipur, Bangkok, Colombo, Antwerp and more — wholesale prices, no middlemen.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/marketplace"
              className="rounded-md bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-gold-foreground)] hover:opacity-90"
            >
              Explore marketplace
            </Link>
            <Link
              to="/sign-up/jeweller"
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Sign up as a jeweller
            </Link>
          </div>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}

export function articleJsonLd(opts: {
  title: string;
  description: string;
  slug: string;
  datePublished?: string;
}) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: opts.title,
      description: opts.description,
      datePublished: opts.datePublished ?? "2026-05-28",
      author: { "@type": "Organization", name: "Chaos Gemstones" },
      publisher: {
        "@type": "Organization",
        name: "Chaos Gemstones",
        url: "https://chaosgemstones.com",
      },
      mainEntityOfPage: `https://chaosgemstones.com/learn/${opts.slug}`,
    }),
  };
}