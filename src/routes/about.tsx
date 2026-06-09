import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({
    meta: [
      { title: "About Chaos — B2B Gemstone Marketplace" },
      { name: "description", content: "Chaos connects independent gemstone and diamond dealers in Jaipur, Surat, Bangkok and Colombo with jewellers worldwide via live inventory feeds." },
      { property: "og:title", content: "About Chaos — B2B Gemstone Marketplace" },
      { property: "og:description", content: "How the Chaos marketplace and live API feeds work for dealers and jewellers." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "https://chaosgemstones.com/about" }],
  }),
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">About Chaos</div>
        <h1 className="mt-3 font-serif text-5xl leading-tight">
          A B2B marketplace built around the way the trade actually works.
        </h1>
        <div className="mt-8 space-y-4 text-foreground">
          <p className="text-lg text-muted-foreground">
            Chaos connects independent gemstone and diamond dealers — primarily in Jaipur, Surat, Bangkok and Colombo — with jewellers and jewellery businesses in the UK, US, Europe and Australia.
          </p>
          <p className="text-muted-foreground">
            We're both a searchable directory of verified stones and a live API feed layer. Dealers upload inventory once. Jewellers follow the dealers they trust and pipe that inventory straight into their own websites. When a stone sells, it disappears from every connected feed within 60 seconds.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Dealers</div>
            <h2 className="mt-2 font-serif text-2xl">Sell to the world, not just the bourse</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Upload stones one at a time or in bulk by CSV. Every dealer is reviewed before listing. Your inventory appears across dozens of jeweller storefronts automatically — when you mark a stone sold, it drops from every shop within a minute.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <li>· Manual entry or CSV import</li>
              <li>· Direct enquiries from approved jewellers</li>
              <li>· One inventory, many storefronts</li>
            </ul>
            <Link to="/sign-up/dealer" className="mt-5 inline-block"><Button>Apply as a dealer</Button></Link>
          </div>
          <div className="rounded-md border border-border bg-card p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Jewellers</div>
            <h2 className="mt-2 font-serif text-2xl">Source verified stones. Sell them as your own.</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Browse certified stones from approved dealers. Follow the vendors you trust and pull their live inventory into your Shopify store, WordPress site or custom build via a single API endpoint. Set a global markup, override per vendor, and we'll do the maths.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <li>· Live JSON feed — one URL, ready to embed</li>
              <li>· Global + per-vendor markup multipliers</li>
              <li>· Sold stones drop out within 60 seconds</li>
            </ul>
            <Link to="/sign-up/jeweller" className="mt-5 inline-block"><Button>Open a jeweller account</Button></Link>
          </div>
        </div>

        <div className="mt-14 rounded-md border border-border bg-secondary/30 p-7">
          <h2 className="font-serif text-xl">How the API feed works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Once approved, a jeweller generates a single API key from their dashboard. That key returns a JSON list of every stone in their curated feed, with retail prices already calculated using their markup. Paste a few lines of JavaScript, PHP or Shopify Liquid into your site and the stones render — refreshed every time the page loads.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}