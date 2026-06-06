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
    q: "Can dealers upload profile images and cover images?",
    a: "Yes. Dealer logos and cover images can be uploaded from Account settings. Images should be clear, trade-appropriate and under 5MB so they load quickly on mobile vendor pages.",
  },
  {
    q: "What happens if a dealer has no API or CSV feed?",
    a: "Chaos can still support them. The WhatsApp intake workflow is designed for dealers who send stock by message, photo, video or short text lists. The first version creates drafts for review rather than publishing automatically.",
  },
  {
    q: "Does Chaos automatically publish WhatsApp messages?",
    a: "Not yet. The current workflow parses pasted WhatsApp stock messages into draft fields. A dealer or admin should review certificate, treatment, price and media before publishing.",
  },
  {
    q: "How does the API sync avoid duplicate listings?",
    a: "Feeds should sync against stable identifiers such as certificate number, dealer stock number and the private Chaos sync key. If a public certificate number is missing, Chaos can still use stock number based matching so the next sync updates the same listing instead of creating another one.",
  },
  {
    q: "Why might imported stones show warnings?",
    a: "Warnings usually mean a feed used a blank certificate number, an unusual lab label, a regional field name or a value that needed cleaning before import. The diagnostics log explains what Chaos changed and whether the stone was still imported.",
  },
  {
    q: "Can jewellers edit their company profile?",
    a: "Yes. Account settings lets jewellers update contact details and public profile details such as logo, website, Instagram, tagline, specialities and profile slug.",
  },
  {
    q: "Can jewellers show stones to clients?",
    a: "Yes. Retail Mode hides trade-facing details, and the Stone Passport / Client Quote tool helps jewellers prepare a cleaner client-facing summary.",
  },
  {
    q: "What is the Retail Showroom?",
    a: "The Retail Showroom is the start of a consumer-facing Chaos channel. It lets Chaos present sourced stones in a retail-safe way, prepare quotes, and handle enquiries before full ecommerce checkout is added.",
  },
  {
    q: "Can Chaos sell stones directly as a retail channel?",
    a: "Technically, yes. The practical first version should be enquiry-led: Chaos applies a retail margin, confirms availability with the dealer, prepares a client quote, then handles the sale manually. Checkout, deposits and fulfilment automation can come later.",
  },
  {
    q: "Can jewellers set their own markups?",
    a: "Yes. Jeweller-facing tools can use global or per-vendor markup rules so stones can be presented to clients at retail prices without exposing wholesale costs.",
  },
  {
    q: "Can a jeweller build a quote without exposing dealer details?",
    a: "Yes. Stone Passport and Client Quote tools are intended to present the stone, certificate, grading and client price while hiding trade-only dealer and wholesale information.",
  },
  {
    q: "Are certificates verified by Chaos?",
    a: "Chaos stores and displays certificate lab and report data where provided. Jewellers should still verify reports directly with the issuing lab before purchase.",
  },
  {
    q: "What if a stone sells elsewhere?",
    a: "Dealers should update stock status as soon as possible. API-connected feeds can mark unavailable stones inactive during sync, helping jewellers avoid quoting stones that are no longer available.",
  },
  {
    q: "Does Chaos handle payment and shipping?",
    a: "Payment and shipping workflows are still developing. During launch, enquiries and fulfilment should be confirmed manually so dealer availability, treatment disclosures, certificates and shipping responsibilities are clear.",
  },
  {
    q: "Can Chaos be used on mobile?",
    a: "Yes. The platform is being tightened for mobile use, including scrollable dashboard sections, mobile filter panels, bottom navigation and lightweight marketplace pagination.",
  },
  {
    q: "Is Chaos free?",
    a: "Chaos is free during launch beta. Any future fees will be communicated before they are introduced.",
  },
  {
    q: "Where can I follow Chaos?",
    a: "Chaos is on Instagram at @chaosgemstonemarket. Social links are available in the site header, footer and help pages as they are added.",
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
              <Link to="/retail">
                <Button variant="outline">Retail showroom</Button>
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
