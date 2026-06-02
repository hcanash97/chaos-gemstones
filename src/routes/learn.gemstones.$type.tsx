import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { ChevronLeft } from "lucide-react";
import { articleJsonLd } from "@/components/site/LearnLayout";

type StoneGuide = {
  name: string;
  tagline: string;
  description: string;
  properties: { label: string; value: string }[];
  buyTips: string[];
  certGuidance: string;
  treatmentNotes: string;
  priceTiers: { tier: string; range: string; notes: string }[];
  relatedTypes: string[];
  marketplaceType: string;
};

const GUIDES: Record<string, StoneGuide> = {
  sapphire: {
    name: "Sapphire",
    tagline: "Wholesale sapphire — buying guide for the trade",
    description:
      "Corundum's blue (and rainbow) face. The most commercially important coloured stone in fine jewellery, with origin and treatment driving price more than any other factor.",
    properties: [
      { label: "Mineral", value: "Corundum (Al₂O₃)" },
      { label: "Hardness", value: "9 (Mohs)" },
      { label: "Key origins", value: "Sri Lanka, Myanmar, Madagascar, Kashmir, Thailand, Australia" },
      { label: "Typical treatments", value: "Heat (standard), beryllium diffusion, lead-glass filling" },
    ],
    buyTips: [
      "Insist on a recent independent lab report (SSEF, Gübelin, GIA, GRS, AGL) for any stone above ~USD 3,000.",
      "Origin commands a premium: Kashmir > Burma > Sri Lanka (unheated) > Madagascar > everywhere else.",
      "Confirm \"unheated\" in writing — it can multiply value 2–10×.",
      "Beware beryllium-diffused fancy colours: declared and priced very differently.",
    ],
    certGuidance:
      "SSEF and Gübelin lead for high-end. GIA is the global benchmark on origin and treatment. GRS is widely accepted in the Thai trade — read the treatment line carefully.",
    treatmentNotes:
      "Standard heat is the trade default and disclosed but not penalised. Beryllium diffusion, lead-glass filling and surface coatings must always be disclosed and priced far below natural.",
    priceTiers: [
      { tier: "Commercial", range: "$50–$500 / ct", notes: "Heated, commercial colour, calibrated sizes" },
      { tier: "Fine", range: "$500–$3,000 / ct", notes: "Heated, vivid colour, eye-clean, certified" },
      { tier: "Exceptional", range: "$3,000–$30,000+ / ct", notes: "Unheated, premium origin, top colour" },
    ],
    relatedTypes: ["ruby", "spinel", "tanzanite"],
    marketplaceType: "sapphire",
  },
  ruby: {
    name: "Ruby",
    tagline: "Wholesale ruby — buying guide for the trade",
    description:
      "Red corundum. The rarest gem-quality variety of corundum and historically the most valuable coloured stone per carat at the top of the market.",
    properties: [
      { label: "Mineral", value: "Corundum (Al₂O₃)" },
      { label: "Hardness", value: "9 (Mohs)" },
      { label: "Key origins", value: "Myanmar (Mogok, Mong Hsu), Mozambique, Madagascar, Thailand" },
      { label: "Typical treatments", value: "Heat, lead-glass filling (heavily traded, disclose!), flux healing" },
    ],
    buyTips: [
      "Burmese / Mozambican origin commands a strong premium. Get it on a credible lab report.",
      "Lead-glass filled rubies are common and cheap — never confuse with natural even at retail.",
      "Eye-clean fine rubies under 1ct are scarce; matched pairs even more so.",
      "\"Pigeon blood\" is a colour grade defined by SSEF, Gübelin, GRS and AGL — verify whose definition is being claimed.",
    ],
    certGuidance:
      "For anything above USD 2,000/ct, SSEF, Gübelin, GRS or AGL. Lotus Gemology is the boutique reference for ruby/sapphire.",
    treatmentNotes:
      "Heat is universal and accepted. Lead-glass filling, flux healing and beryllium diffusion must be disclosed and dramatically affect value.",
    priceTiers: [
      { tier: "Commercial", range: "$100–$800 / ct", notes: "Heated, included, smaller sizes" },
      { tier: "Fine", range: "$800–$8,000 / ct", notes: "Heated, vivid red, eye-clean, certified" },
      { tier: "Exceptional", range: "$8,000–$100,000+ / ct", notes: "Unheated Burmese pigeon blood" },
    ],
    relatedTypes: ["sapphire", "spinel"],
    marketplaceType: "ruby",
  },
  emerald: {
    name: "Emerald",
    tagline: "Wholesale emerald — buying guide for the trade",
    description:
      "Green beryl. The defining gem of Colombia, with growing modern supply from Zambia, Brazil and Ethiopia. Clarity treatments are the norm — read the lab report carefully.",
    properties: [
      { label: "Mineral", value: "Beryl (Be₃Al₂Si₆O₁₈)" },
      { label: "Hardness", value: "7.5–8 (Mohs)" },
      { label: "Key origins", value: "Colombia (Muzo, Chivor), Zambia, Brazil, Ethiopia, Afghanistan" },
      { label: "Typical treatments", value: "Cedarwood oil (minor/moderate/significant), resin, polymer (rare/never)" },
    ],
    buyTips: [
      "Every credible emerald report grades clarity treatment: None > Insignificant > Minor > Moderate > Significant.",
      "Avoid polymer- or resin-filled emeralds for fine jewellery — they age badly.",
      "Colombian commands a premium; Zambian is often more saturated but priced lower.",
      "Open clarity is part of an emerald's character; perfectly clean is suspicious.",
    ],
    certGuidance:
      "SSEF, Gübelin, GIA, AGL — all give clarity-enhancement grades. Insist on one for any stone above ~USD 2,000.",
    treatmentNotes:
      "Oil is universal and accepted. Resin and polymer must be disclosed; significant treatment must be priced accordingly.",
    priceTiers: [
      { tier: "Commercial", range: "$80–$600 / ct", notes: "Significant oil, commercial colour" },
      { tier: "Fine", range: "$600–$5,000 / ct", notes: "Minor oil, vivid green, eye-clean" },
      { tier: "Exceptional", range: "$5,000–$60,000+ / ct", notes: "No-oil Colombian, top colour" },
    ],
    relatedTypes: ["tsavorite", "aquamarine"],
    marketplaceType: "emerald",
  },
  alexandrite: {
    name: "Alexandrite",
    tagline: "Wholesale alexandrite — buying guide for the trade",
    description:
      "The famous colour-change chrysoberyl: green in daylight, red in incandescent light. Top stones from the original Russian Ural deposit are among the rarest gems on earth.",
    properties: [
      { label: "Mineral", value: "Chrysoberyl (BeAl₂O₄)" },
      { label: "Hardness", value: "8.5 (Mohs)" },
      { label: "Key origins", value: "Russia (historic), Sri Lanka, Brazil, Tanzania, India" },
      { label: "Typical treatments", value: "None standard — synthetics common, declare!" },
    ],
    buyTips: [
      "Strength of colour change is everything: 100% (full) is the trade benchmark.",
      "Synthetic and simulated alexandrite is everywhere — always require lab confirmation.",
      "Russian provenance commands a 3–5× premium and SSEF/Gübelin reports are the trade standard.",
    ],
    certGuidance:
      "Any natural alexandrite over USD 1,500 should travel with a recent independent lab report stating natural origin and colour-change percentage.",
    treatmentNotes:
      "Natural alexandrite is almost never treated; synthetics are the main risk and must always be disclosed.",
    priceTiers: [
      { tier: "Commercial", range: "$300–$2,000 / ct", notes: "Weak colour change, included" },
      { tier: "Fine", range: "$2,000–$15,000 / ct", notes: "Strong change, eye-clean" },
      { tier: "Exceptional", range: "$15,000–$100,000+ / ct", notes: "Russian, 100% change, large sizes" },
    ],
    relatedTypes: ["cats-eye", "spinel"],
    marketplaceType: "alexandrite",
  },
  spinel: {
    name: "Spinel",
    tagline: "Wholesale spinel — buying guide for the trade",
    description:
      "Long misidentified as ruby in historic crown jewels. Now recognised as a serious gem in its own right, especially Burmese reds, Mahenge pinks and cobalt blues.",
    properties: [
      { label: "Mineral", value: "Spinel (MgAl₂O₄)" },
      { label: "Hardness", value: "8 (Mohs)" },
      { label: "Key origins", value: "Myanmar (Mogok), Tanzania (Mahenge), Vietnam, Tajikistan, Sri Lanka" },
      { label: "Typical treatments", value: "None standard — heat is uncommon and disclosed" },
    ],
    buyTips: [
      "Untreated by default — a major advantage when selling to disclosure-conscious buyers.",
      "Mahenge hot-pink and Burmese red are the headline collectors' colours.",
      "Cobalt-blue spinel is one of the most expensive blue stones in the trade per carat.",
    ],
    certGuidance:
      "GIA, SSEF, Gübelin — for any cobalt-blue stone or Mahenge claim, a lab report is essential.",
    treatmentNotes:
      "Almost always untreated. Heat treatment exists but is uncommon and must be disclosed.",
    priceTiers: [
      { tier: "Commercial", range: "$80–$500 / ct", notes: "Commercial colour" },
      { tier: "Fine", range: "$500–$5,000 / ct", notes: "Vivid pink, red, blue or grey" },
      { tier: "Exceptional", range: "$5,000–$30,000+ / ct", notes: "Burmese red, Mahenge, cobalt blue" },
    ],
    relatedTypes: ["ruby", "sapphire"],
    marketplaceType: "spinel",
  },
  tanzanite: {
    name: "Tanzanite",
    tagline: "Wholesale tanzanite — buying guide for the trade",
    description:
      "Found in a single ~5km strip of Tanzania's Merelani Hills. Strong blue-to-violet pleochroism, almost always heated to reveal its signature colour.",
    properties: [
      { label: "Mineral", value: "Zoisite (Ca₂Al₃Si₃O₁₂(OH))" },
      { label: "Hardness", value: "6.5 (Mohs)" },
      { label: "Key origins", value: "Tanzania only (Merelani Hills)" },
      { label: "Typical treatments", value: "Heat (universal and accepted)" },
    ],
    buyTips: [
      "Block-D AAA grading is the trade standard for tanzanite quality.",
      "Calibrated cushions, ovals and trillions trade in volume from Jaipur cutters.",
      "Tanzanite is brittle — favour protective settings.",
    ],
    certGuidance:
      "GIA or IGI for anything above USD 1,000. Origin is uncontested (Tanzania), so reports focus on grade and treatment.",
    treatmentNotes:
      "Heat is universal and accepted — undisclosed in most invoices but assumed industry-wide.",
    priceTiers: [
      { tier: "Commercial", range: "$80–$300 / ct", notes: "Smaller sizes, lighter colour" },
      { tier: "Fine", range: "$300–$1,200 / ct", notes: "AAA, vivid violet-blue" },
      { tier: "Exceptional", range: "$1,200–$5,000+ / ct", notes: "Large, top-colour, well-cut" },
    ],
    relatedTypes: ["sapphire", "iolite"],
    marketplaceType: "tanzanite",
  },
  diamond: {
    name: "Diamond",
    tagline: "Wholesale diamond — buying guide for the trade",
    description:
      "Carbon. The world's most commoditised gemstone — graded against the global 4Cs and traded against published rapaport pricing for natural goods.",
    properties: [
      { label: "Mineral", value: "Carbon (C)" },
      { label: "Hardness", value: "10 (Mohs)" },
      { label: "Key origins", value: "Botswana, Russia, Canada, Australia (closing), South Africa; lab-grown global" },
      { label: "Typical treatments", value: "HPHT (colour), laser drilling, fracture filling — all disclosed" },
    ],
    buyTips: [
      "GIA is the global benchmark. IGI is dominant for lab-grown.",
      "Match the cert to the price tier you sell at — IGI for commercial, GIA for fine.",
      "Natural vs lab-grown wholesale is now a 5–10× spread; treat them as different categories.",
      "Check the report for fluorescence, polish/symmetry, and any HPHT or fracture-filling treatment.",
    ],
    certGuidance:
      "GIA for natural fine. IGI / HRD for commercial natural and lab-grown. Always cross-check the report online via the lab's own verification tool.",
    treatmentNotes:
      "HPHT colour treatment, laser drilling and fracture filling are all in the market — must be disclosed on the report and on the invoice.",
    priceTiers: [
      { tier: "Commercial (natural)", range: "$1,500–$4,500 / ct", notes: "Sub-1ct H/I SI grades" },
      { tier: "Fine (natural)", range: "$4,500–$25,000 / ct", notes: "1–3ct D-G VS+ ideal" },
      { tier: "Lab-grown", range: "$300–$1,200 / ct", notes: "Wide range, falling year-on-year" },
    ],
    relatedTypes: ["sapphire", "ruby"],
    marketplaceType: "diamond-natural",
  },
  tourmaline: {
    name: "Tourmaline",
    tagline: "Wholesale tourmaline — buying guide for the trade",
    description:
      "A whole colour wheel in a single mineral family. Paraiba is the headline; rubellite, chrome and indicolite all have serious followings.",
    properties: [
      { label: "Mineral", value: "Tourmaline group" },
      { label: "Hardness", value: "7–7.5 (Mohs)" },
      { label: "Key origins", value: "Brazil, Mozambique, Nigeria, Afghanistan, Madagascar, USA" },
      { label: "Typical treatments", value: "Heat (common, disclosed), irradiation (some pinks)" },
    ],
    buyTips: [
      "Distinguish Paraiba (copper-bearing) from neon-blue but copper-free tourmaline — labs verify with chemistry.",
      "Brazilian Paraiba carries the highest origin premium; Mozambican is the modern supply.",
      "Chrome tourmaline from Tanzania is rare and strong-green.",
    ],
    certGuidance:
      "For Paraiba claims, always insist on GIA, SSEF or Gübelin chemistry-verified origin reports.",
    treatmentNotes:
      "Most tourmaline is sold untreated; heated and irradiated material exists and must be disclosed.",
    priceTiers: [
      { tier: "Commercial", range: "$100–$500 / ct", notes: "Most colours, included" },
      { tier: "Fine", range: "$500–$3,000 / ct", notes: "Vivid colour, eye-clean" },
      { tier: "Paraiba", range: "$3,000–$30,000+ / ct", notes: "Copper-bearing, neon blue-green" },
    ],
    relatedTypes: ["paraiba", "emerald"],
    marketplaceType: "tourmaline",
  },
  paraiba: {
    name: "Paraiba Tourmaline",
    tagline: "Wholesale Paraiba tourmaline — buying guide for the trade",
    description:
      "Copper-bearing tourmaline with an electric neon blue-to-green glow unlike any other gem. Brazilian origin commands a multiple over modern Mozambican production.",
    properties: [
      { label: "Mineral", value: "Cu-bearing tourmaline (Elbaite)" },
      { label: "Hardness", value: "7–7.5 (Mohs)" },
      { label: "Key origins", value: "Brazil (Paraíba, Rio Grande do Norte), Mozambique, Nigeria" },
      { label: "Typical treatments", value: "Heat (almost universal, accepted)" },
    ],
    buyTips: [
      "Only copper-bearing tourmaline can legitimately be sold as \"Paraiba\" — chemistry reports are essential.",
      "Sub-1ct Brazilian Paraiba is the trade sweet spot; over 3ct Brazilian is genuinely rare.",
      "Mozambican Paraiba comes in much larger sizes at a fraction of Brazilian price.",
    ],
    certGuidance:
      "SSEF, Gübelin or GIA chemistry-verified origin reports are the trade standard for any Paraiba over USD 2,000.",
    treatmentNotes:
      "Heat treatment is universal and accepted. Any other treatment is unusual and must be disclosed.",
    priceTiers: [
      { tier: "Commercial (Mozambique)", range: "$500–$2,500 / ct", notes: "Smaller, lighter, larger stones" },
      { tier: "Fine", range: "$2,500–$10,000 / ct", notes: "Neon colour, eye-clean" },
      { tier: "Brazilian", range: "$10,000–$50,000+ / ct", notes: "Origin-verified, top neon" },
    ],
    relatedTypes: ["tourmaline", "sapphire"],
    marketplaceType: "paraiba-tourmaline",
  },
};

export const Route = createFileRoute("/learn/gemstones/$type")({
  loader: ({ params }) => {
    const g = GUIDES[params.type];
    if (!g) throw notFound();
    return g;
  },
  head: ({ params }) => {
    const g = GUIDES[params.type];
    if (!g) return { meta: [{ title: "Gemstone guide not found — Chaos" }] };
    const url = `https://chaosgemstones.com/learn/gemstones/${params.type}`;
    const title = `${g.name} — Wholesale Buying Guide for the Trade`;
    return {
      meta: [
        { title: `${title} | Chaos Gemstones` },
        { name: "description", content: g.description },
        { property: "og:title", content: title },
        { property: "og:description", content: g.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        articleJsonLd({
          title,
          description: g.description,
          slug: `gemstones/${params.type}`,
        }),
      ],
    };
  },
  component: GemstonePage,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Gemstone guide not found.
    </div>
  ),
});

function GemstonePage() {
  const g = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <article className="mx-auto max-w-4xl px-6 py-14">
        <Link
          to="/learn"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> All guides
        </Link>
        <div className="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
          Gemstone Encyclopedia
        </div>
        <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">{g.name}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{g.tagline}</p>
        <p className="mt-6 text-base leading-relaxed text-foreground/90">{g.description}</p>

        <h2 className="mt-12 font-serif text-2xl">Key properties</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {g.properties.map((p) => (
            <div
              key={p.label}
              className="rounded-md border border-border bg-card p-4"
            >
              <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {p.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{p.value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-12 font-serif text-2xl">What to look for when buying wholesale</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-foreground/90">
          {g.buyTips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <h2 className="mt-12 font-serif text-2xl">Certification guidance</h2>
        <p className="mt-3 text-foreground/90">{g.certGuidance}</p>

        <h2 className="mt-12 font-serif text-2xl">Treatment disclosure</h2>
        <p className="mt-3 text-foreground/90">{g.treatmentNotes}</p>

        <h2 className="mt-12 font-serif text-2xl">Typical wholesale price tiers</h2>
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">Tier</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">Wholesale</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {g.priceTiers.map((t) => (
                <tr key={t.tier}>
                  <td className="px-4 py-2.5 font-medium">{t.tier}</td>
                  <td className="px-4 py-2.5 font-mono">{t.range}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Prices are indicative wholesale-to-trade ranges. Actual offers depend on origin, certification and supply at the time of enquiry.
        </p>

        <div className="mt-12 rounded-lg border border-[var(--gold-border)] bg-card p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Source direct
          </div>
          <h3 className="mt-1 font-serif text-2xl">
            Browse verified {g.name.toLowerCase()} dealers on Chaos
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Live inventory from independent dealers in Jaipur, Bangkok, Colombo and beyond. Wholesale prices, no broker chain.
          </p>
          <Link
            to="/marketplace"
            className="mt-4 inline-flex items-center rounded-md bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-gold-foreground)] hover:opacity-90"
          >
            View {g.name.toLowerCase()} on the marketplace →
          </Link>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}

export const GEMSTONE_GUIDE_SLUGS = Object.keys(GUIDES);
