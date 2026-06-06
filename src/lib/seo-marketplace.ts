import type { FilterState } from "@/lib/marketplace/filters";

export type SeoMarketplacePage = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  filters: Partial<FilterState>;
  keywords: string[];
  audience: "jewellers" | "dealers" | "both";
};

export const SEO_MARKETPLACE_PAGES: SeoMarketplacePage[] = [
  {
    slug: "wholesale-gemstones-for-jewellers",
    title: "Wholesale Gemstones for Jewellers — Chaos Gemstones",
    h1: "Wholesale gemstones for jewellers",
    description: "Source certified loose gemstones and diamonds from verified dealers, with live inventory feeds built for trade jewellers.",
    intro: "Chaos helps jewellers source loose stones from approved dealers without rebuilding supplier spreadsheets by hand. Browse certified gemstones, save options, follow vendors, and prepare client quotes from live marketplace inventory.",
    filters: {},
    keywords: ["wholesale gemstones", "loose gemstones for jewellers", "gemstone marketplace", "certified gemstones"],
    audience: "jewellers",
  },
  {
    slug: "lab-grown-diamonds",
    title: "Wholesale Lab-Grown Diamonds — Chaos Gemstones",
    h1: "Wholesale lab-grown diamonds",
    description: "Browse lab-grown diamond inventory from verified dealers, including IGI and GIA certified stones for trade jewellers.",
    intro: "Lab-grown diamond inventory moves quickly, especially when dealers quote from live feeds. Chaos gives jewellers a cleaner way to compare certified stones and keep retail-facing selections current.",
    filters: { types: ["diamond"], origin: "lab-grown", labs: ["IGI", "GIA"] },
    keywords: ["wholesale lab grown diamonds", "IGI lab grown diamonds", "GIA lab grown diamonds"],
    audience: "jewellers",
  },
  {
    slug: "natural-diamonds",
    title: "Wholesale Natural Diamonds — Chaos Gemstones",
    h1: "Wholesale natural diamonds",
    description: "Find natural diamond listings from verified dealers with certificate, shape, carat, colour and clarity filters.",
    intro: "For jewellers sourcing natural diamonds, Chaos keeps the trade workflow practical: search by certificate lab, shape, carat and grading details, then enquire directly with the dealer.",
    filters: { types: ["diamond"], origin: "natural", labs: ["GIA", "IGI"] },
    keywords: ["wholesale natural diamonds", "certified natural diamonds", "GIA diamonds wholesale"],
    audience: "jewellers",
  },
  {
    slug: "green-diamonds",
    title: "Green Diamonds for Jewellers — Chaos Gemstones",
    h1: "Green diamonds for jewellers",
    description: "Search green diamond listings, including fancy colour and lab-grown options, from verified gemstone and diamond dealers.",
    intro: "Fancy colour diamonds need careful data translation because colour naming varies between dealer systems. Chaos normalises the feed where possible, then gives jewellers filter diagnostics when raw values need checking.",
    filters: { types: ["diamond"], fancyColourMode: true, fancyHues: ["green"] },
    keywords: ["green diamonds", "fancy green diamonds", "lab green diamonds", "green diamond wholesale"],
    audience: "jewellers",
  },
  {
    slug: "sapphires",
    title: "Wholesale Sapphires — Chaos Gemstones",
    h1: "Wholesale sapphires",
    description: "Source loose sapphires from verified dealers, including Sri Lankan, Thai and international trade inventory.",
    intro: "Sapphires vary heavily by origin, treatment and colour description. Chaos helps jewellers keep those details visible while still comparing stones in a structured marketplace.",
    filters: { types: ["sapphire"] },
    keywords: ["wholesale sapphires", "loose sapphires", "sapphire dealer", "Sri Lankan sapphire"],
    audience: "jewellers",
  },
  {
    slug: "rubies",
    title: "Wholesale Rubies — Chaos Gemstones",
    h1: "Wholesale rubies",
    description: "Browse loose ruby listings for trade jewellers, with treatment and certificate details kept visible.",
    intro: "Ruby sourcing depends on trust, treatment disclosure and good dealer communication. Chaos keeps those signals near the listing so jewellers can shortlist and enquire more confidently.",
    filters: { types: ["ruby"] },
    keywords: ["wholesale rubies", "loose rubies", "unheated ruby", "ruby dealer"],
    audience: "jewellers",
  },
  {
    slug: "emeralds",
    title: "Wholesale Emeralds — Chaos Gemstones",
    h1: "Wholesale emeralds",
    description: "Search loose emerald listings from verified dealers, with treatment, origin and certificate fields where provided.",
    intro: "Emerald buying is especially sensitive to treatment, clarity and origin notes. Chaos gives dealers room to disclose those details and gives jewellers a consistent place to compare them.",
    filters: { types: ["emerald"] },
    keywords: ["wholesale emeralds", "loose emeralds", "emerald dealer", "certified emeralds"],
    audience: "jewellers",
  },
  {
    slug: "emerald-cut-diamonds",
    title: "Emerald Cut Diamonds Wholesale — Chaos Gemstones",
    h1: "Emerald cut diamonds wholesale",
    description: "Find emerald cut diamond listings by carat, lab, colour, clarity and origin from verified diamond dealers.",
    intro: "Emerald cut diamonds are unforgiving on clarity and proportions, so structured filters matter. Chaos keeps lab, size and shape data available for fast shortlisting.",
    filters: { types: ["diamond"], shapes: ["emerald"] },
    keywords: ["emerald cut diamonds wholesale", "emerald diamond", "certified emerald cut diamond"],
    audience: "jewellers",
  },
  {
    slug: "oval-sapphires",
    title: "Oval Sapphires Wholesale — Chaos Gemstones",
    h1: "Oval sapphires wholesale",
    description: "Browse oval sapphire listings for jewellers, including trade inventory from verified coloured gemstone dealers.",
    intro: "Oval sapphires are a common request for engagement rings and bespoke jewellery. Chaos helps jewellers keep options organised by size, colour, treatment and origin.",
    filters: { types: ["sapphire"], shapes: ["oval"] },
    keywords: ["oval sapphires", "oval sapphire wholesale", "loose oval sapphire"],
    audience: "jewellers",
  },
  {
    slug: "gemstone-api-for-dealers",
    title: "Gemstone Inventory API for Dealers — Chaos Gemstones",
    h1: "Gemstone inventory API for dealers",
    description: "List once and sync gemstone or diamond inventory into Chaos using CSV, API feeds, or human-reviewed WhatsApp intake.",
    intro: "Dealers should not need to retype the same stock across every channel. Chaos supports manual listings, CSV imports, developer API sync, and a WhatsApp intake workflow for dealers whose stock still lives in messages.",
    filters: {},
    keywords: ["gemstone inventory API", "diamond inventory sync", "gemstone dealer API", "jewellery supplier feed"],
    audience: "dealers",
  },
];

export function getSeoMarketplacePage(slug: string) {
  return SEO_MARKETPLACE_PAGES.find((page) => page.slug === slug);
}

export function marketplaceFilterHref(filters: Partial<FilterState>) {
  const entries = Object.entries(filters).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "" && value !== "all";
  });
  if (!entries.length) return "/marketplace";
  return `/marketplace?f=${encodeURIComponent(JSON.stringify(Object.fromEntries(entries)))}`;
}
