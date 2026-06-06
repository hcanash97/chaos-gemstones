export interface SiteThemeSettings {
  logo_url: string;
  accent_color: string;
  hero_title: string;
  hero_subtitle: string;
  contact_whatsapp: string;
}

export type SiteConfigurationRow = {
  id: string;
  is_active: boolean;
  theme_data: SiteThemeSettings;
};

export const DEFAULT_SITE_THEME: SiteThemeSettings = {
  logo_url: "",
  accent_color: "#E8C97A",
  hero_title: "Verified diamonds & coloured stones, sourced direct from the world's dealers.",
  hero_subtitle:
    "The global marketplace for independent gemstone dealers. Chaos connects dealers in Jaipur, Surat, Bangkok and Colombo with jewellers across the UK, US, Europe and Australia — browse, follow vendors, pull live inventory into your own site.",
  contact_whatsapp: "",
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
  };
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}
