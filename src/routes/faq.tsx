import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/faq")({
  component: FAQPage,
  head: () => ({
    meta: [
      { title: "FAQ — Chaos Gemstones" },
      {
        name: "description",
        content: "Frequently asked questions about Chaos Gemstones for dealers and jewellers using the B2B gemstone marketplace.",
      },
      { property: "og:title", content: "FAQ — Chaos Gemstones" },
      { property: "og:description", content: "Answers for dealers and jewellers using Chaos Gemstones." },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
});

const FAQS = [
  {
    q: "What is Chaos Gemstones?",
    a: "Chaos is a B2B marketplace connecting verified gemstone and diamond dealers with trade jewellers. Dealers list inventory once, while jewellers can browse, save, compare, enquire and prepare client quotes.",
  },
  {
    q: "Who can see wholesale prices?",
    a: "Wholesale pricing is intended for approved trade accounts. Public visitors can browse limited listing information, while approved jewellers and dealers see trade details.",
  },
  {
    q: "How do dealers add inventory?",
    a: "Dealers can add stones manually, import CSV files, connect an inventory API feed, or use the WhatsApp intake workflow to turn message-based stock into human-reviewed draft listings.",
  },
  {
    q: "Does Chaos automatically publish WhatsApp messages?",
    a: "Not yet. The current workflow parses pasted WhatsApp stock messages into draft fields. A dealer or admin should review certificate, treatment, price and media before publishing.",
  },
  {
    q: "Can jewellers show stones to clients?",
    a: "Yes. Retail Mode hides trade-facing details, and the Stone Passport / Client Quote tool helps jewellers prepare a cleaner client-facing summary.",
  },
  {
    q: "Are certificates verified by Chaos?",
    a: "Chaos stores and displays certificate lab and report data where provided. Jewellers should still verify reports directly with the issuing lab before purchase.",
  },
  {
    q: "Is Chaos free?",
    a: "Chaos is free during launch beta. Any future fees will be communicated before they are introduced.",
  },
];

function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-14">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-gold)]">Help centre</div>
            <h1 className="mt-3 font-serif text-5xl">Frequently asked questions</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Quick answers for dealers, jewellers, and anyone exploring how Chaos handles listings, feeds, quotes and trade access.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/marketplace">
                <Button>Browse marketplace</Button>
              </Link>
              <a href="https://www.instagram.com/chaosgemstonemarket" target="_blank" rel="noreferrer noopener">
                <Button variant="outline">
                  <Instagram className="mr-2 h-4 w-4" />
                  @chaosgemstonemarket
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-10">
          <div className="divide-y divide-border rounded-md border border-border bg-card">
            {FAQS.map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="cursor-pointer list-none font-medium text-foreground">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
