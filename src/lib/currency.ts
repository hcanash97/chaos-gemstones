// Supported currencies for the Chaos platform.
export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "THB", symbol: "฿", name: "Thai Baht", flag: "🇹🇭" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee", flag: "🇱🇰" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", flag: "🇭🇰" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "ZAR", symbol: "R", name: "South African Rand", flag: "🇿🇦" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const ALL_CURRENCY_CODES: CurrencyCode[] = SUPPORTED_CURRENCIES.map((c) => c.code);

// Default-currency suggestions by country name (sign-up flows).
export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
  "United Kingdom": "GBP",
  "Australia": "AUD",
  "Canada": "CAD",
  "India": "INR",
  "Thailand": "THB",
  "Sri Lanka": "LKR",
  "United Arab Emirates": "AED",
  "Switzerland": "CHF",
  "South Africa": "ZAR",
  "Japan": "JPY",
  "Hong Kong": "HKD",
  "Singapore": "SGD",
};

export function suggestCurrencyForCountry(country?: string | null): CurrencyCode {
  if (!country) return "USD";
  return COUNTRY_CURRENCY_MAP[country] ?? "USD";
}

const CACHE_KEY = "chaos_fx_rates";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type RatesCache = { rates: Record<string, number>; fetchedAt: number };

// Fallback rates — used only when the network call fails or sessionStorage is unavailable.
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1, GBP: 0.79, EUR: 0.92, AUD: 1.53, CAD: 1.37,
  INR: 83.5, THB: 35.2, LKR: 305, HKD: 7.82, SGD: 1.35,
  JPY: 149, AED: 3.67, CHF: 0.9, ZAR: 18.6,
};

export async function getExchangeRates(): Promise<Record<string, number>> {
  try {
    if (typeof sessionStorage !== "undefined") {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: RatesCache = JSON.parse(cached);
        if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
          return parsed.rates;
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (!res.ok) throw new Error("fetch failed");
    const json = (await res.json()) as { rates: Record<string, number> };
    const rates = json.rates;
    try {
      sessionStorage?.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }));
    } catch {
      /* ignore */
    }
    return rates;
  } catch {
    return { ...FALLBACK_RATES };
  }
}

export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency] ?? FALLBACK_RATES[fromCurrency] ?? 1;
  const toRate = rates[toCurrency] ?? FALLBACK_RATES[toCurrency] ?? 1;
  const usd = amount / fromRate;
  return usd * toRate;
}

const NO_DECIMAL = new Set(["JPY", "INR", "LKR", "THB"]);

export function formatPrice(
  amount: number,
  currencyCode: string,
  options?: { indicative?: boolean; compact?: boolean },
): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = currency?.symbol ?? `${currencyCode} `;
  const rounded = NO_DECIMAL.has(currencyCode)
    ? Math.round(amount)
    : Math.round(amount * 100) / 100;
  const formatted =
    options?.compact && Math.abs(rounded) >= 1000
      ? `${symbol}${(rounded / 1000).toFixed(1)}k`
      : `${symbol}${rounded.toLocaleString()}`;
  return options?.indicative ? `≈ ${formatted}` : formatted;
}