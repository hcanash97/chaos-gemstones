export interface SiteThemeSettings {
  logo_url: string;
  accent_color: string;
  hero_title: string;
  hero_subtitle: string;
  contact_whatsapp: string;
  homepage_layout: HomepageLayoutBlock[];
}

export type HomepageBlockType =
  | "hero"
  | "cert_labs"
  | "trust_strip"
  | "audience_cards"
  | "featured_stones"
  | "matched_pairs"
  | "featured_vendors"
  | "founder_quote"
  | "stats";

export type HomepageLayoutBlock = {
  id: string;
  type: HomepageBlockType;
  enabled: boolean;
};

export type SiteConfigurationRow = {
  id: string;
  is_active: boolean;
  theme_data: SiteThemeSettings;
};

export const HOMEPAGE_BLOCK_LABELS: Record<HomepageBlockType, string> = {
  hero: "Hero banner",
  cert_labs: "Certification lab bar",
  trust_strip: "Sourcing countries strip",
  audience_cards: "Dealer/Jeweller explainer",
  featured_stones: "Featured stones",
  matched_pairs: "Matched pairs CTA",
  featured_vendors: "Featured vendors",
  founder_quote: "Founder quote",
  stats: "Stats and trust features",
};

export const DEFAULT_HOMEPAGE_LAYOUT: HomepageLayoutBlock[] = [
  { id: "hero", type: "hero", enabled: true },
  { id: "cert_labs", type: "cert_labs", enabled: true },
  { id: "trust_strip", type: "trust_strip", enabled: true },
  { id: "audience_cards", type: "audience_cards", enabled: true },
  { id: "featured_stones", type: "featured_stones", enabled: true },
  { id: "matched_pairs", type: "matched_pairs", enabled: true },
  { id: "featured_vendors", type: "featured_vendors", enabled: true },
  { id: "founder_quote", type: "founder_quote", enabled: true },
  { id: "stats", type: "stats", enabled: true },
];

export const DEFAULT_SITE_THEME: SiteThemeSettings = {
  logo_url: "",
  accent_color: "#E8C97A",
  hero_title: "Verified diamonds & coloured stones, sourced direct from the world's dealers.",
  hero_subtitle:
    "The global marketplace for independent gemstone dealers. Chaos connects dealers in Jaipur, Surat, Bangkok and Colombo with jewellers across the UK, US, Europe and Australia — browse, follow vendors, pull live inventory into your own site.",
  contact_whatsapp: "",
  homepage_layout: DEFAULT_HOMEPAGE_LAYOUT,
};

export function normalizeSiteTheme(value: unknown): SiteThemeSettings {
  const raw = typeof value === "object" && value !== null ? (value as Partial<SiteThemeSettings>) : {};
  return {
    logo_url: typeof raw.logo_url === "string" ? raw.logo_url : DEFAULT_SITE_THEME.logo_url,
    accent_color: isHexColor(raw.accent_color) ? raw.accent_color : DEFAULT_SITE_THEME.accent_color,
    hero_title: typeof raw.hero_title === "string" && raw.hero_title.trim() ? raw.hero_title : DEFAULT_SITE_THEME.hero_title,
    hero_subtitle:
      typeof raw.hero_subtitle === "string" && raw.hero_subtitle.trim()
        ? raw.hero_subtitle
        : DEFAULT_SITE_THEME.hero_subtitle,
    contact_whatsapp: typeof raw.contact_whatsapp === "string" ? raw.contact_whatsapp : DEFAULT_SITE_THEME.contact_whatsapp,
    homepage_layout: normalizeHomepageLayout(raw.homepage_layout),
  };
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function normalizeHomepageLayout(value: unknown): HomepageLayoutBlock[] {
  const seen = new Set<HomepageBlockType>();
  const blocks: HomepageLayoutBlock[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const raw = item as Partial<HomepageLayoutBlock>;
      if (!isHomepageBlockType(raw.type) || seen.has(raw.type)) continue;
      seen.add(raw.type);
      blocks.push({
        id: raw.id || raw.type,
        type: raw.type,
        enabled: raw.enabled !== false,
      });
    }
  }
  for (const block of DEFAULT_HOMEPAGE_LAYOUT) {
    if (!seen.has(block.type)) blocks.push(block);
  }
  return blocks;
}

export function isHomepageBlockType(value: unknown): value is HomepageBlockType {
  return (
    value === "hero" ||
    value === "cert_labs" ||
    value === "trust_strip" ||
    value === "audience_cards" ||
    value === "featured_stones" ||
    value === "matched_pairs" ||
    value === "featured_vendors" ||
    value === "founder_quote" ||
    value === "stats"
  );
}
