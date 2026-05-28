import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Currency = "USD" | "GBP" | "EUR" | "AUD" | "CAD";

export const CURRENCIES: Currency[] = ["USD", "GBP", "EUR", "AUD", "CAD"];

const SYMBOLS: Record<Currency, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
};

type Rates = Partial<Record<Currency, number>>;

type CurrencyCtx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Rates;
  convert: (usd: number | null | undefined) => number | null;
  format: (usd: number | null | undefined) => string;
  symbol: string;
  loading: boolean;
};

const Ctx = createContext<CurrencyCtx | null>(null);

const STORAGE_CURRENCY = "chaos-currency";
const STORAGE_RATES = "chaos-currency-rates";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [rates, setRates] = useState<Rates>({ USD: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const c = window.localStorage.getItem(STORAGE_CURRENCY) as Currency | null;
      if (c && CURRENCIES.includes(c)) setCurrencyState(c);
      const cached = window.sessionStorage.getItem(STORAGE_RATES);
      if (cached) {
        const { rates: r, ts } = JSON.parse(cached);
        if (r && ts && Date.now() - ts < 12 * 3600 * 1000) {
          setRates({ USD: 1, ...r });
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setLoading(true);
    fetch("https://api.exchangerate-api.com/v4/latest/USD")
      .then((r) => r.json())
      .then((data) => {
        const r: Rates = { USD: 1 };
        for (const c of CURRENCIES) {
          if (data?.rates?.[c]) r[c] = Number(data.rates[c]);
        }
        setRates(r);
        try {
          window.sessionStorage.setItem(STORAGE_RATES, JSON.stringify({ rates: r, ts: Date.now() }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        // graceful fallback — show USD only
      })
      .finally(() => setLoading(false));
  }, []);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    try {
      window.localStorage.setItem(STORAGE_CURRENCY, c);
    } catch {
      /* ignore */
    }
  }

  const value = useMemo<CurrencyCtx>(() => {
    const rate = rates[currency] ?? 1;
    const symbol = SYMBOLS[currency];
    return {
      currency,
      setCurrency,
      rates,
      loading,
      symbol,
      convert: (usd) => {
        if (usd === null || usd === undefined) return null;
        return Number(usd) * rate;
      },
      format: (usd) => {
        if (usd === null || usd === undefined) return "POA";
        if (currency === "USD") return `$${Number(usd).toLocaleString()}`;
        const v = Number(usd) * rate;
        return `≈ ${symbol}${Math.round(v).toLocaleString()}`;
      },
    };
  }, [currency, rates, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyCtx {
  const v = useContext(Ctx);
  if (!v) {
    return {
      currency: "USD",
      setCurrency: () => {},
      rates: { USD: 1 },
      convert: (usd) => (usd === null || usd === undefined ? null : Number(usd)),
      format: (usd) => (usd === null || usd === undefined ? "POA" : `$${Number(usd).toLocaleString()}`),
      symbol: "$",
      loading: false,
    };
  }
  return v;
}