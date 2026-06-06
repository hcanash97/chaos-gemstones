import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ALL_CURRENCY_CODES,
  type CurrencyCode,
  FALLBACK_RATES,
  SUPPORTED_CURRENCIES,
  convertPrice,
  formatPrice,
  getExchangeRates,
} from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";

// Re-export for backwards compatibility with existing imports.
export type Currency = CurrencyCode;
export const CURRENCIES = ALL_CURRENCY_CODES;

type CurrencyCtx = {
  // New API
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (c: CurrencyCode) => void;
  rates: Record<string, number>;
  ratesLoading: boolean;
  convert: (amount: number | null | undefined, fromCurrency?: string) => number | null;
  format: (
    amount: number | null | undefined,
    fromCurrency?: string,
    indicative?: boolean,
  ) => string;
  // Backwards-compatible aliases
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
  loading: boolean;
};

const Ctx = createContext<CurrencyCtx | null>(null);

const STORAGE_CURRENCY = "chaos_display_currency";

function isCurrencyCode(v: string | null | undefined): v is CurrencyCode {
  return !!v && (ALL_CURRENCY_CODES as string[]).includes(v);
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Read from localStorage synchronously so the UI never flashes USD on
  // first render when the user previously picked another currency.
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return "USD";
    try {
      const stored = window.localStorage.getItem(STORAGE_CURRENCY);
      if (isCurrencyCode(stored)) return stored;
    } catch {
      /* ignore */
    }
    return "USD";
  });
  const [rates, setRates] = useState<Record<string, number>>({ ...FALLBACK_RATES });
  const [ratesLoading, setRatesLoading] = useState(false);

  // Fetch remote rates on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRatesLoading(true);
    getExchangeRates()
      .then((r) => setRates(r))
      .finally(() => setRatesLoading(false));
  }, []);

  // If logged-in as a jeweller and no localStorage override, use their display_currency.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      const stored = window.localStorage.getItem(STORAGE_CURRENCY);
      if (stored) return; // user explicitly chose
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      let code: string | undefined;
      try {
        const { getJewellerSettings } = await import("@/lib/profile-settings.functions");
        const data = await getJewellerSettings();
        code = data?.display_currency ?? undefined;
      } catch {
        code = undefined;
      }
      if (!cancelled && isCurrencyCode(code)) setDisplayCurrencyState(code);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setDisplayCurrency(c: CurrencyCode) {
    setDisplayCurrencyState(c);
    try {
      window.localStorage.setItem(STORAGE_CURRENCY, c);
    } catch {
      /* ignore */
    }
  }

  const value = useMemo<CurrencyCtx>(() => {
    const symbol =
      SUPPORTED_CURRENCIES.find((c) => c.code === displayCurrency)?.symbol ?? "$";
    const convert = (amount: number | null | undefined, fromCurrency = "USD") => {
      if (amount === null || amount === undefined) return null;
      const n = Number(amount);
      if (!isFinite(n)) return null;
      return convertPrice(n, fromCurrency, displayCurrency, rates);
    };
    const format = (
      amount: number | null | undefined,
      fromCurrency = "USD",
      indicative?: boolean,
    ) => {
      if (amount === null || amount === undefined) return "POA";
      const n = Number(amount);
      if (!isFinite(n)) return "POA";
      const converted = convertPrice(n, fromCurrency, displayCurrency, rates);
      const isConverted = fromCurrency !== displayCurrency;
      return formatPrice(converted, displayCurrency, {
        indicative: indicative ?? isConverted,
      });
    };
    return {
      displayCurrency,
      setDisplayCurrency,
      rates,
      ratesLoading,
      convert,
      format,
      currency: displayCurrency,
      setCurrency: setDisplayCurrency,
      symbol,
      loading: ratesLoading,
    };
  }, [displayCurrency, rates, ratesLoading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyCtx {
  const v = useContext(Ctx);
  if (v) return v;
  // Fallback when used outside a provider (e.g. tests, SSR shells).
  const noop = () => {};
  return {
    displayCurrency: "USD",
    setDisplayCurrency: noop,
    rates: { ...FALLBACK_RATES },
    ratesLoading: false,
    convert: (a, _from) => (a === null || a === undefined ? null : Number(a)),
    format: (a) => (a === null || a === undefined ? "POA" : `$${Number(a).toLocaleString()}`),
    currency: "USD",
    setCurrency: noop,
    symbol: "$",
    loading: false,
  };
}