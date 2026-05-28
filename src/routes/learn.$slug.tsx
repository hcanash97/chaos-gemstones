import { createFileRoute, notFound } from "@tanstack/react-router";
import { LearnLayout, articleJsonLd } from "@/components/site/LearnLayout";
import type { ReactNode } from "react";

type Guide = {
  eyebrow: string;
  title: string;
  description: string;
  readingTime: string;
  body: ReactNode;
};

const GUIDES: Record<string, Guide> = {
  "sourcing-coloured-gemstones": {
    eyebrow: "Sourcing",
    title: "How to source coloured gemstones direct from cutters",
    description:
      "A practical playbook for buying sapphires, rubies and emeralds direct from verified dealers in Jaipur, Bangkok and Colombo — skipping the broker chain.",
    readingTime: "8 min",
    body: (
      <>
        <p>
          Most independent jewellers buy coloured stones two or three steps removed from the
          cutter. Each step adds 15–40% margin, and worse, every step strips away provenance and
          treatment information. Buying direct is no longer reserved for traders with a Hindi
          phrasebook and a flight to Jaipur — but it does require a small change in habits.
        </p>
        <h2>1. Define what you actually buy</h2>
        <p>
          Before talking to any dealer, write down: the stone types you sell most, your typical
          carat range, your colour and clarity standards, and your average retail price point. A
          dealer can match you faster — and quote sharper — when you arrive with a brief.
        </p>
        <h2>2. Choose your market by speciality</h2>
        <ul>
          <li><strong>Jaipur</strong> — coloured stones across the board, strongest in emeralds, tanzanite, fine commercial sapphires and ruby calibrated goods.</li>
          <li><strong>Bangkok</strong> — the global hub for heated rubies and sapphires, padparadscha, spinel and a growing cutting industry in fancy sapphires.</li>
          <li><strong>Colombo</strong> — unheated sapphires, padparadscha, alexandrite, cat's-eye, and most Sri Lankan rough.</li>
          <li><strong>Antwerp / Tel Aviv / NYC</strong> — diamonds, plus high-end coloured stones repackaged from the source markets above.</li>
        </ul>
        <h2>3. Vet the dealer, not just the stone</h2>
        <p>
          Three filters before you place a first order: lab affiliations (GIA, IGI, ICA, AGTA),
          response time (anything beyond 24h on a live enquiry is a yellow flag), and a clear
          treatment-disclosure policy. On Chaos every approved dealer ships in their own name,
          their feed shows their actual stock, and their response time is published.
        </p>
        <h2>4. Always ask for the four pieces of paper</h2>
        <ol>
          <li>An independent lab report (or a credible statement that one will be issued on confirmation).</li>
          <li>A written treatment disclosure — heat, oil, beryllium, lead-glass, fracture-filling.</li>
          <li>An invoice naming origin, weight, treatment and price.</li>
          <li>A returns window in writing (industry standard is 5 trading days from delivery).</li>
        </ol>
        <h2>5. Pay through a safe channel</h2>
        <p>
          For first orders, escrow or platform-mediated payments protect both sides. Wires are
          fine once the relationship is established, but never wire on the first deal — and never
          to a personal account. The Chaos platform handles initial introductions; the trade
          relationship is between you and the dealer.
        </p>
      </>
    ),
  },
  "api-embedding-guide": {
    eyebrow: "For your website",
    title: "Embedding a live gemstone feed on your jewellery website",
    description:
      "Show your customers a constantly-refreshed catalogue from the dealers you trust — works on Shopify, Wix, Webflow, Squarespace, WordPress or any custom build.",
    readingTime: "6 min",
    body: (
      <>
        <p>
          A static gemstone gallery on a jewellery site goes stale within days. The fix is to wire
          your site to a live feed of the dealers you follow — so when a stone sells, it disappears,
          and when new stock is uploaded, it appears.
        </p>
        <h2>How the Chaos feed works</h2>
        <p>
          Once you're approved as a jeweller, you generate a single API key. The key authorises
          one JSON endpoint that returns the inventory of every dealer you follow, with your
          chosen markup already applied and your chosen display currency baked in.
        </p>
        <h2>Three integration options</h2>
        <ol>
          <li><strong>Drop-in widget</strong> — two lines of HTML. Best for Shopify themes, Webflow embed blocks and WordPress custom HTML.</li>
          <li><strong>iframe embed</strong> — best for Wix and Squarespace, where inline scripts are sandboxed.</li>
          <li><strong>JSON API</strong> — for custom sites and developers who want full control over the rendered card design.</li>
        </ol>
        <h2>Markup, currency and pricing rules</h2>
        <p>
          Set a global markup once (we suggest 2.0–2.5× wholesale for retail) and override per
          dealer if you want. Pick a display currency for browsing and a separate Feed Output
          Currency for what your customers see. Stones a dealer has flagged with a minimum-price
          rule appear in an <code>excluded</code> array — render those as "Contact for price"
          rather than hide them entirely.
        </p>
        <h2>SEO considerations</h2>
        <p>
          The widget renders client-side, so embed a brief, indexable text intro above the
          gallery. Use the JSON API and server-render the cards if SEO is critical to your
          business. Either way, set a clear title and meta description on the page that hosts the
          feed.
        </p>
      </>
    ),
  },
  "jewellers-markup-strategy": {
    eyebrow: "Pricing",
    title: "Markup strategy for independent jewellers",
    description:
      "How to apply a sensible wholesale-to-retail markup per stone type, dealer and currency without scaring off clients.",
    readingTime: "5 min",
    body: (
      <>
        <p>
          The wholesale-to-retail multiplier debate is older than the trade itself. The honest
          answer: there is no single number. It varies by stone type, your overheads, the
          finished-piece labour, and what your client base will bear.
        </p>
        <h2>Baseline multipliers</h2>
        <ul>
          <li><strong>Commercial diamonds</strong> — 1.4–1.8× wholesale, because comparison shopping is brutal.</li>
          <li><strong>Coloured stones</strong> — 2.0–3.0× is normal; rarer material can carry more.</li>
          <li><strong>Set pieces</strong> — the stone markup compounds with labour and metal margin; quote the finished piece, not the stone.</li>
        </ul>
        <h2>Per-dealer overrides</h2>
        <p>
          On Chaos you set a global multiplier and override it per dealer. Use this when a dealer's
          quoted wholesale already reflects their premium reputation — e.g., a respected unheated
          Sri Lankan sapphire cutter — and a flat 2.5× would price you out of the market.
        </p>
        <h2>Currency and conversion</h2>
        <p>
          Hold prices in your client's currency on your website. Chaos lets you set a Feed Output
          Currency separately from the display currency you browse in, so your inventory always
          quotes in (for example) GBP or AUD even though dealers list in USD or THB.
        </p>
        <h2>Pricing floors and minimums</h2>
        <p>
          Dealers can publish minimum-price rules on individual stones or whole categories. Honour
          them: they exist because the dealer has a wholesale floor of their own. Stones that
          breach a rule appear in the <code>excluded</code> array of your API response — render
          them as "Enquire for price" rather than hide them.
        </p>
      </>
    ),
  },
  "gemstone-cert-labs": {
    eyebrow: "Quality",
    title: "GIA, IGI, Gübelin and SSEF — which cert lab to trust",
    description:
      "A buyer's tour of the gemstone certification labs that matter, what each is strict on, and when a cert is worth the wait.",
    readingTime: "7 min",
    body: (
      <>
        <h2>The big four (and why)</h2>
        <ul>
          <li><strong>GIA</strong> — the global benchmark for diamonds and increasingly for coloured stones. Conservative origin calls. Slow turnaround in some markets.</li>
          <li><strong>SSEF (Switzerland)</strong> — the gold standard for high-value coloured stones, especially rubies, sapphires and Colombian emeralds. Origin determinations are taken as the final word in the trade.</li>
          <li><strong>Gübelin (Switzerland)</strong> — peer to SSEF, with the additional <em>Gemstone Rating</em> service which judges overall quality on a single scale.</li>
          <li><strong>AGL (New York)</strong> — leading US lab for coloured stones. Useful when SSEF or Gübelin turnaround is unworkable.</li>
        </ul>
        <h2>Useful regional labs</h2>
        <ul>
          <li><strong>GRS (Bangkok / HK)</strong> — common in the Thai trade; widely accepted but interpret colour grades carefully.</li>
          <li><strong>Lotus Gemology (Bangkok)</strong> — boutique lab respected for fine ruby and sapphire work.</li>
          <li><strong>GIT (Bangkok)</strong> — state-run, useful for export documentation.</li>
          <li><strong>IGI</strong> — fast and economical for diamonds and commercial coloured stones.</li>
        </ul>
        <h2>When to insist on a cert</h2>
        <p>
          Any single stone above roughly USD 3,000 should travel with a recent independent report.
          Calibrated commercial goods normally do not — but the dealer should still be able to
          state treatment in writing on the invoice.
        </p>
      </>
    ),
  },
  "jaipur-bangkok-colombo-guide": {
    eyebrow: "Markets",
    title: "Jaipur, Bangkok, Colombo — the world's gem cutting hubs",
    description:
      "What each market specialises in, how dealers price, and how to evaluate offers from each region remotely.",
    readingTime: "6 min",
    body: (
      <>
        <h2>Jaipur, India</h2>
        <p>
          The largest coloured-stone cutting centre on earth. Anything mined anywhere can be
          calibrated here. Pricing is competitive on volume; rare single stones go through a small
          group of high-end cutters known to the trade. Strong in emerald, tanzanite, garnet,
          tourmaline, ruby and sapphire calibrated goods.
        </p>
        <h2>Bangkok, Thailand</h2>
        <p>
          The world's heat-treatment capital and the global trading floor for fine ruby and
          sapphire. Padparadscha, fine spinel, and a serious modern cutting industry in
          fancy-colour sapphire. Expect well-priced, well-cut stones with full treatment
          disclosure from the better houses.
        </p>
        <h2>Colombo, Sri Lanka</h2>
        <p>
          Source of the world's finest unheated blue sapphires, padparadscha, alexandrite and
          cat's-eye chrysoberyl. Many of the great Burmese-style rubies are also recut here.
          Pricing is highest at source for the best material — small dealers know exactly what
          their rough is worth.
        </p>
        <h2>How to buy remotely from any of them</h2>
        <ol>
          <li>Insist on multiple photos, including the stone face-up under daylight and incandescent light, plus a video.</li>
          <li>Ask for a current independent lab report or a signed treatment disclosure.</li>
          <li>Agree shipping terms (DDU vs DDP, courier, insurance) in writing before payment.</li>
          <li>Use a platform that holds a credible dealer profile and review history — Chaos vets every dealer before listing.</li>
        </ol>
      </>
    ),
  },
  "wholesale-vs-retail": {
    eyebrow: "Trade",
    title: "Wholesale vs retail: how the gem trade actually prices",
    description:
      "Why one dealer's 'wholesale' is another's retail, and how Chaos forces transparent dealer pricing across the platform.",
    readingTime: "4 min",
    body: (
      <>
        <p>
          The word <em>wholesale</em> has been so abused in the gem trade that it now means
          almost nothing. A genuine wholesale price is the per-carat price at which a cutter or
          rough-buying dealer will sell to a trade buyer who is reselling — not finishing the
          piece, not pricing for end-clients, and ordering more than one stone.
        </p>
        <h2>What inflates "wholesale" in the wild</h2>
        <ul>
          <li>Broker margin layered onto the cutter's price (often 10–25%).</li>
          <li>Country-of-export markup once the stone moves through Antwerp or NYC.</li>
          <li>Dealer paying full lab fees and packaging that into the per-carat number.</li>
        </ul>
        <h2>How Chaos enforces a true wholesale floor</h2>
        <p>
          Every dealer on Chaos lists in their own name, with their own published response time
          and review history. Prices shown are the dealer's true wholesale to trade — never
          retail. Jewellers apply their own markup downstream. Dealers can set minimum-price
          rules per stone or per category to protect a wholesale floor on highly-competitive
          inventory, and those rules are honoured in every jeweller's feed.
        </p>
        <h2>For jewellers</h2>
        <p>
          Ask any "wholesaler" for: dealer name on the invoice, treatment disclosure, and a return
          policy. If any of those is missing, you're being sold retail dressed as wholesale.
        </p>
      </>
    ),
  },
};

export const Route = createFileRoute("/learn/$slug")({
  loader: ({ params }) => {
    const g = GUIDES[params.slug];
    if (!g) throw notFound();
    return g;
  },
  head: ({ params }) => {
    const g = GUIDES[params.slug];
    if (!g) {
      return { meta: [{ title: "Guide not found — Chaos" }] };
    }
    const url = `https://chaosgemstones.com/learn/${params.slug}`;
    return {
      meta: [
        { title: `${g.title} — Chaos` },
        { name: "description", content: g.description },
        { property: "og:title", content: g.title },
        { property: "og:description", content: g.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [articleJsonLd({ title: g.title, description: g.description, slug: params.slug })],
    };
  },
  component: GuidePage,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Guide not found.
    </div>
  ),
});

function GuidePage() {
  const g = Route.useLoaderData();
  return (
    <LearnLayout
      eyebrow={g.eyebrow}
      title={g.title}
      intro={g.description}
      readingTime={g.readingTime}
    >
      {g.body}
    </LearnLayout>
  );
}

export const LEARN_SLUGS = Object.keys(GUIDES);