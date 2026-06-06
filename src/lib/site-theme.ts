export interface SiteThemeSettings {
  site_name: string;
  logo_url: string;
  accent_color: string;
  hero_title: string;
  hero_subtitle: string;
  hero_badge_label: string;
  hero_background_image_url: string;
  hero_overlay_opacity: number;
  hero_media_type: "image" | "video";
  hero_video_url: string;
  hero_primary_cta_label: string;
  hero_primary_cta_url: string;
  hero_secondary_cta_label: string;
  hero_secondary_cta_url: string;
  animation_preset: "classic-fade" | "luxury-fade" | "spring-slide";
  enable_parallax: boolean;
  primary_glow_color: string;
  contact_whatsapp: string;
  contact_email: string;
  instagram_url: string;
  footer_tagline: string;
  footer_notice: string;
  seo_title: string;
  seo_description: string;
  seo_image_url: string;
  ticker_enabled: boolean;
  ticker_mode: "manual" | "recent-stones";
  ticker_items: string[];
  ticker_speed_seconds: number;
  shape_grid_enabled: boolean;
  shape_grid_title: string;
  shape_grid_mode: "grid" | "carousel";
  homepage_layout: HomepageLayoutBlock[];
  homepage_copy: HomepageSectionCopy;
}

export type HomepageBlockType =
  | "hero"
  | "cert_labs"
  | "trust_strip"
  | "ticker"
  | "audience_cards"
  | "shape_grid"
  | "whatsapp_cta"
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

export type HomepageSectionCopy = {
  featured_stones_eyebrow: string;
  featured_stones_title: string;
  featured_stones_link_label: string;
  matched_pairs_eyebrow: string;
  matched_pairs_title: string;
  matched_pairs_body: string;
  matched_pairs_link_label: string;
  featured_vendors_eyebrow: string;
  featured_vendors_title: string;
  featured_vendors_link_label: string;
  whatsapp_cta_title: string;
  whatsapp_cta_body: string;
  whatsapp_cta_button_label: string;
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
  ticker: "Live ticker strip",
  audience_cards: "Dealer/Jeweller explainer",
  shape_grid: "Gemstone shape grid",
  whatsapp_cta: "WhatsApp CTA",
  featured_stones: "Featured stones",
  matched_pairs: "Matched pairs CTA",
  featured_vendors: "Featured vendors",
  founder_quote: "Founder quote",
  stats: "Stats and trust features",
};

export const DEFAULT_HOMEPAGE_LAYOUT: HomepageLayoutBlock[] = [
  { id: "hero", type: "hero", enabled: true },
  { id: "ticker", type: "ticker", enabled: true },
  { id: "cert_labs", type: "cert_labs", enabled: true },
  { id: "trust_strip", type: "trust_strip", enabled: true },
  { id: "audience_cards", type: "audience_cards", enabled: true },
  { id: "shape_grid", type: "shape_grid", enabled: true },
  { id: "whatsapp_cta", type: "whatsapp_cta", enabled: false },
  { id: "featured_stones", type: "featured_stones", enabled: true },
  { id: "matched_pairs", type: "matched_pairs", enabled: true },
  { id: "featured_vendors", type: "featured_vendors", enabled: true },
  { id: "founder_quote", type: "founder_quote", enabled: true },
  { id: "stats", type: "stats", enabled: true },
];

export const DEFAULT_HOMEPAGE_COPY: HomepageSectionCopy = {
  featured_stones_eyebrow: "Featured Inventory",
  featured_stones_title: "Hand-picked stones",
  featured_stones_link_label: "View all",
  matched_pairs_eyebrow: "Matched Pairs",
  matched_pairs_title: "Matched pairs — ideal for earrings and symmetric settings",
  matched_pairs_body:
    "Browse colour-, cut- and weight-matched pairs from verified dealers. Save hours of back-and-forth sourcing for symmetrical commissions.",
  matched_pairs_link_label: "Browse matched pairs",
  featured_vendors_eyebrow: "Trusted Suppliers",
  featured_vendors_title: "Featured vendors",
  featured_vendors_link_label: "View all",
  whatsapp_cta_title: "Want help sourcing a specific stone?",
  whatsapp_cta_body:
    "Send Chaos the brief by WhatsApp. We can help turn a client request into a focused search across verified dealer inventory.",
  whatsapp_cta_button_label: "Message Chaos on WhatsApp",
};

export const DEFAULT_SITE_THEME: SiteThemeSettings = {
  site_name: "Chaos",
  logo_url: "",
  accent_color: "#E8C97A",
  hero_title: "Verified diamonds & coloured stones, sourced direct from the world's dealers.",
  hero_subtitle:
    "The global marketplace for independent gemstone dealers. Chaos connects dealers in Jaipur, Surat, Bangkok and Colombo with jewellers across the UK, US, Europe and Australia — browse, follow vendors, pull live inventory into your own site.",
  hero_badge_label: "B2B · For the trade",
  hero_background_image_url: "",
  hero_overlay_opacity: 0.62,
  hero_media_type: "image",
  hero_video_url: "",
  hero_primary_cta_label: "Browse marketplace",
  hero_primary_cta_url: "/marketplace",
  hero_secondary_cta_label: "Sign up",
  hero_secondary_cta_url: "/sign-up",
  animation_preset: "luxury-fade",
  enable_parallax: true,
  primary_glow_color: "#E8C97A",
  contact_whatsapp: "",
  contact_email: "",
  instagram_url: "https://www.instagram.com/chaosgemstonemarket",
  footer_tagline: "The global marketplace for independent gemstone dealers.",
  footer_notice: "All prices shown are wholesale USD. CHAOS is a B2B platform for verified trade professionals only.",
  seo_title: "CHAOS — Gemstone & Diamond Marketplace",
  seo_description: "The global B2B marketplace for independent gemstone and diamond dealers.",
  seo_image_url: "https://chaosgemstones.com/icons/icon-512.png",
  ticker_enabled: true,
  ticker_mode: "manual",
  ticker_items: [
    "Verified dealers uploading live inventory",
    "Lab diamonds, coloured stones and matched pairs",
    "API sync, CSV import and WhatsApp intake workflows",
  ],
  ticker_speed_seconds: 36,
  shape_grid_enabled: true,
  shape_grid_title: "Browse by diamond shape",
  shape_grid_mode: "grid",
  homepage_layout: DEFAULT_HOMEPAGE_LAYOUT,
  homepage_copy: DEFAULT_HOMEPAGE_COPY,
};

export function normalizeSiteTheme(value: unknown): SiteThemeSettings {
  const raw = typeof value === "object" && value !== null ? (value as Partial<SiteThemeSettings>) : {};
  return {
    site_name: stringOrDefault(raw.site_name, DEFAULT_SITE_THEME.site_name),
    logo_url: typeof raw.logo_url === "string" ? raw.logo_url : DEFAULT_SITE_THEME.logo_url,
    accent_color: isHexColor(raw.accent_color) ? raw.accent_color : DEFAULT_SITE_THEME.accent_color,
    hero_title: typeof raw.hero_title === "string" && raw.hero_title.trim() ? raw.hero_title : DEFAULT_SITE_THEME.hero_title,
    hero_subtitle:
      typeof raw.hero_subtitle === "string" && raw.hero_subtitle.trim()
        ? raw.hero_subtitle
        : DEFAULT_SITE_THEME.hero_subtitle,
    hero_badge_label: stringOrDefault(raw.hero_badge_label, DEFAULT_SITE_THEME.hero_badge_label),
    hero_background_image_url:
      typeof raw.hero_background_image_url === "string" ? raw.hero_background_image_url : DEFAULT_SITE_THEME.hero_background_image_url,
    hero_overlay_opacity: normalizeOverlayOpacity(raw.hero_overlay_opacity),
    hero_media_type: raw.hero_media_type === "video" ? "video" : "image",
    hero_video_url: typeof raw.hero_video_url === "string" ? raw.hero_video_url : DEFAULT_SITE_THEME.hero_video_url,
    hero_primary_cta_label: stringOrDefault(raw.hero_primary_cta_label, DEFAULT_SITE_THEME.hero_primary_cta_label),
    hero_primary_cta_url: stringOrDefault(raw.hero_primary_cta_url, DEFAULT_SITE_THEME.hero_primary_cta_url),
    hero_secondary_cta_label: stringOrDefault(raw.hero_secondary_cta_label, DEFAULT_SITE_THEME.hero_secondary_cta_label),
    hero_secondary_cta_url: stringOrDefault(raw.hero_secondary_cta_url, DEFAULT_SITE_THEME.hero_secondary_cta_url),
    animation_preset: normalizeAnimationPreset(raw.animation_preset),
    enable_parallax: raw.enable_parallax !== false,
    primary_glow_color: isHexColor(raw.primary_glow_color) ? raw.primary_glow_color : DEFAULT_SITE_THEME.primary_glow_color,
    contact_whatsapp: typeof raw.contact_whatsapp === "string" ? raw.contact_whatsapp : DEFAULT_SITE_THEME.contact_whatsapp,
    contact_email: typeof raw.contact_email === "string" ? raw.contact_email : DEFAULT_SITE_THEME.contact_email,
    instagram_url: stringOrDefault(raw.instagram_url, DEFAULT_SITE_THEME.instagram_url),
    footer_tagline: stringOrDefault(raw.footer_tagline, DEFAULT_SITE_THEME.footer_tagline),
    footer_notice: stringOrDefault(raw.footer_notice, DEFAULT_SITE_THEME.footer_notice),
    seo_title: stringOrDefault(raw.seo_title, DEFAULT_SITE_THEME.seo_title),
    seo_description: stringOrDefault(raw.seo_description, DEFAULT_SITE_THEME.seo_description),
    seo_image_url: stringOrDefault(raw.seo_image_url, DEFAULT_SITE_THEME.seo_image_url),
    ticker_enabled: raw.ticker_enabled !== false,
    ticker_mode: raw.ticker_mode === "recent-stones" ? "recent-stones" : "manual",
    ticker_items: normalizeTickerItems(raw.ticker_items),
    ticker_speed_seconds: normalizeTickerSpeed(raw.ticker_speed_seconds),
    shape_grid_enabled: raw.shape_grid_enabled !== false,
    shape_grid_title: stringOrDefault(raw.shape_grid_title, DEFAULT_SITE_THEME.shape_grid_title),
    shape_grid_mode: raw.shape_grid_mode === "carousel" ? "carousel" : "grid",
    homepage_layout: normalizeHomepageLayout(raw.homepage_layout),
    homepage_copy: normalizeHomepageCopy(raw.homepage_copy),
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
    value === "ticker" ||
    value === "audience_cards" ||
    value === "shape_grid" ||
    value === "whatsapp_cta" ||
    value === "featured_stones" ||
    value === "matched_pairs" ||
    value === "featured_vendors" ||
    value === "founder_quote" ||
    value === "stats"
  );
}

function normalizeAnimationPreset(value: unknown): SiteThemeSettings["animation_preset"] {
  if (value === "classic-fade" || value === "luxury-fade" || value === "spring-slide") return value;
  return DEFAULT_SITE_THEME.animation_preset;
}

function normalizeTickerItems(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_SITE_THEME.ticker_items;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
  return items.length ? items : DEFAULT_SITE_THEME.ticker_items;
}

function normalizeTickerSpeed(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : DEFAULT_SITE_THEME.ticker_speed_seconds;
  if (!Number.isFinite(n)) return DEFAULT_SITE_THEME.ticker_speed_seconds;
  return Math.min(90, Math.max(12, n));
}

export function normalizeHomepageCopy(value: unknown): HomepageSectionCopy {
  const raw = typeof value === "object" && value !== null ? (value as Partial<HomepageSectionCopy>) : {};
  return {
    featured_stones_eyebrow: stringOrDefault(raw.featured_stones_eyebrow, DEFAULT_HOMEPAGE_COPY.featured_stones_eyebrow),
    featured_stones_title: stringOrDefault(raw.featured_stones_title, DEFAULT_HOMEPAGE_COPY.featured_stones_title),
    featured_stones_link_label: stringOrDefault(raw.featured_stones_link_label, DEFAULT_HOMEPAGE_COPY.featured_stones_link_label),
    matched_pairs_eyebrow: stringOrDefault(raw.matched_pairs_eyebrow, DEFAULT_HOMEPAGE_COPY.matched_pairs_eyebrow),
    matched_pairs_title: stringOrDefault(raw.matched_pairs_title, DEFAULT_HOMEPAGE_COPY.matched_pairs_title),
    matched_pairs_body: stringOrDefault(raw.matched_pairs_body, DEFAULT_HOMEPAGE_COPY.matched_pairs_body),
    matched_pairs_link_label: stringOrDefault(raw.matched_pairs_link_label, DEFAULT_HOMEPAGE_COPY.matched_pairs_link_label),
    featured_vendors_eyebrow: stringOrDefault(raw.featured_vendors_eyebrow, DEFAULT_HOMEPAGE_COPY.featured_vendors_eyebrow),
    featured_vendors_title: stringOrDefault(raw.featured_vendors_title, DEFAULT_HOMEPAGE_COPY.featured_vendors_title),
    featured_vendors_link_label: stringOrDefault(raw.featured_vendors_link_label, DEFAULT_HOMEPAGE_COPY.featured_vendors_link_label),
    whatsapp_cta_title: stringOrDefault(raw.whatsapp_cta_title, DEFAULT_HOMEPAGE_COPY.whatsapp_cta_title),
    whatsapp_cta_body: stringOrDefault(raw.whatsapp_cta_body, DEFAULT_HOMEPAGE_COPY.whatsapp_cta_body),
    whatsapp_cta_button_label: stringOrDefault(raw.whatsapp_cta_button_label, DEFAULT_HOMEPAGE_COPY.whatsapp_cta_button_label),
  };
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeOverlayOpacity(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : DEFAULT_SITE_THEME.hero_overlay_opacity;
  if (!Number.isFinite(n)) return DEFAULT_SITE_THEME.hero_overlay_opacity;
  return Math.min(0.9, Math.max(0.15, n));
}
