import { useEffect } from "react";
import { useSiteTheme } from "@/hooks/useSiteTheme";

export function SiteThemeBridge() {
  const { theme } = useSiteTheme();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const accent = theme.accent_color;
    const rgb = hexToRgb(accent);
    root.style.setProperty("--color-gold", accent);
    root.style.setProperty("--color-gold-foreground", readableTextColor(accent));
    if (rgb) {
      root.style.setProperty("--gold-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.36)`);
    }
  }, [theme.accent_color]);

  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function readableTextColor(hex: string): "#081236" | "#FFFFFF" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#081236";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.58 ? "#081236" : "#FFFFFF";
}
