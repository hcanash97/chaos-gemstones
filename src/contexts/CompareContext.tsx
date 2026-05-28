import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const MAX_COMPARE = 3;
const STORAGE_KEY = "chaos-compare-ids";

type CompareCtx = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  max: number;
};

const Ctx = createContext<CompareCtx | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setIds(parsed.filter((x) => typeof x === "string").slice(0, MAX_COMPARE));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, [ids]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }, []);
  const remove = useCallback((id: string) => setIds((p) => p.filter((x) => x !== id)), []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(
    () => ({ ids, has, toggle, remove, clear, max: MAX_COMPARE }),
    [ids, has, toggle, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare(): CompareCtx {
  const v = useContext(Ctx);
  if (!v) {
    // Safe fallback so SSR / unwrapped trees don't crash
    return {
      ids: [],
      has: () => false,
      toggle: () => {},
      remove: () => {},
      clear: () => {},
      max: MAX_COMPARE,
    };
  }
  return v;
}