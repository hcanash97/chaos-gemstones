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

export function countryFlag(country?: string | null): string {
  if (!country) return "";
  return FLAGS[country.trim().toLowerCase()] ?? "";
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