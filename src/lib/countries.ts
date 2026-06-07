// Country → flag emoji + cert verification link helpers.

const FLAGS: Record<string, string> = {
  india: "🇮🇳",
  "sri lanka": "🇱🇰",
  thailand: "🇹🇭",
  myanmar: "🇲🇲",
  burma: "🇲🇲",
  colombia: "🇨🇴",
  zambia: "🇿🇲",
  brazil: "🇧🇷",
  mozambique: "🇲🇿",
  tanzania: "🇹🇿",
  madagascar: "🇲🇬",
  kenya: "🇰🇪",
  afghanistan: "🇦🇫",
  pakistan: "🇵🇰",
  australia: "🇦🇺",
  russia: "🇷🇺",
  "united states": "🇺🇸",
  usa: "🇺🇸",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
};

const COUNTRY_ALIASES: Record<string, string> = {
  india: "India",
  bharat: "India",
  pakistan: "Pakistan",
  "sri lanka": "Sri Lanka",
  srilanka: "Sri Lanka",
  ceylon: "Sri Lanka",
  thailand: "Thailand",
  myanmar: "Myanmar",
  burma: "Myanmar",
  colombia: "Colombia",
  zambia: "Zambia",
  brazil: "Brazil",
  mozambique: "Mozambique",
  tanzania: "Tanzania",
  madagascar: "Madagascar",
  kenya: "Kenya",
  afghanistan: "Afghanistan",
  australia: "Australia",
  russia: "Russia",
  "united states": "United States",
  "united states of america": "United States",
  usa: "United States",
  us: "United States",
  "u.s.": "United States",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  "northern ireland": "United Kingdom",
  france: "France",
  germany: "Germany",
  italy: "Italy",
  spain: "Spain",
  belgium: "Belgium",
  netherlands: "Netherlands",
  switzerland: "Switzerland",
  austria: "Austria",
  portugal: "Portugal",
  ireland: "Ireland",
  "united arab emirates": "United Arab Emirates",
  uae: "United Arab Emirates",
  "hong kong": "Hong Kong",
  china: "China",
  japan: "Japan",
  canada: "Canada",
  mexico: "Mexico",
  "south africa": "South Africa",
};

const REGION_WORDS = new Set([
  "africa",
  "asia",
  "europe",
  "middle east",
  "north america",
  "oceania",
  "south america",
  "southeast asia",
  "south asia",
]);

const CITY_COUNTRY_HINTS: Record<string, string> = {
  surat: "India",
  jaipur: "India",
  mumbai: "India",
  bombay: "India",
  delhi: "India",
  "new delhi": "India",
  bangkok: "Thailand",
  chanthaburi: "Thailand",
  colombo: "Sri Lanka",
  ratnapura: "Sri Lanka",
  lahore: "Pakistan",
  karachi: "Pakistan",
  peshawar: "Pakistan",
  islamabad: "Pakistan",
  antwerp: "Belgium",
  "new york": "United States",
  london: "United Kingdom",
  dubai: "United Arab Emirates",
  hongkong: "Hong Kong",
  "hong kong": "Hong Kong",
};

export function countryFlag(country?: string | null): string {
  if (!country) return "";
  const normalized = normalizeCountryName(country) ?? country;
  return FLAGS[normalized.trim().toLowerCase()] ?? FLAGS[country.trim().toLowerCase()] ?? "";
}

function cleanLocationText(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeCountryName(country?: string | null): string | null {
  const clean = cleanLocationText(country);
  if (!clean) return null;
  const key = clean.toLowerCase();
  if (REGION_WORDS.has(key)) return null;
  return COUNTRY_ALIASES[key] ?? clean;
}

export function inferCountryFromCity(city?: string | null): string | null {
  const clean = cleanLocationText(city);
  if (!clean) return null;
  return CITY_COUNTRY_HINTS[clean.toLowerCase()] ?? null;
}

export function normalizeProfileLocation(input: {
  city?: string | null;
  country?: string | null;
}): {
  city: string | null;
  country: string | null;
  corrected: boolean;
  warning: string | null;
} {
  const city = cleanLocationText(input.city) || null;
  const normalizedCountry = normalizeCountryName(input.country);
  const inferredCountry = inferCountryFromCity(city);
  const rawCountry = cleanLocationText(input.country);
  const rawWasRegion = rawCountry ? REGION_WORDS.has(rawCountry.toLowerCase()) : false;

  if (inferredCountry && (!normalizedCountry || rawWasRegion)) {
    return {
      city,
      country: inferredCountry,
      corrected: true,
      warning: `Country corrected to ${inferredCountry} from city ${city}.`,
    };
  }

  if (inferredCountry && normalizedCountry && inferredCountry !== normalizedCountry) {
    return {
      city,
      country: inferredCountry,
      corrected: true,
      warning: `Country corrected to ${inferredCountry} because ${city} is not in ${normalizedCountry}.`,
    };
  }

  if (rawWasRegion) {
    return {
      city,
      country: null,
      corrected: true,
      warning: `${rawCountry} is a region, not a country. Please choose the dealer's actual country.`,
    };
  }

  return {
    city,
    country: normalizedCountry,
    corrected: false,
    warning: null,
  };
}

export function certLink(lab?: string | null, number?: string | null): string | null {
  if (!lab || !number) return null;
  const n = encodeURIComponent(number.trim());
  switch (lab.trim().toUpperCase()) {
    case "GIA":
      return `https://www.gia.edu/report-check?reportno=${n}`;
    case "IGI":
      return `https://www.igi.org/verify-your-report?r=${n}`;
    case "GRS":
      return "https://www.grsgemresearch.ch/service/verify";
    case "AGL":
      return "https://aglgemlab.com/reports";
    default:
      return null;
  }
}
