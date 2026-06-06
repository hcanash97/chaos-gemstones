import { useEffect, useState } from "react";

const KEY = "chaos:retail-mode";

export function useRetailMode() {
  const [retailMode, setRetailModeState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRetailModeState(window.localStorage.getItem(KEY) === "1");
  }, []);

  function setRetailMode(next: boolean) {
    setRetailModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    }
  }

  return { retailMode, setRetailMode };
}
