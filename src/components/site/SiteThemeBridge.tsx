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
    root.style.setProperty("--chaos-glow-color", theme.primary_glow_color);
    root.dataset.animationPreset = theme.animation_preset;
    root.dataset.parallax = theme.enable_parallax ? "on" : "off";
    if (rgb) {
      root.style.setProperty("--gold-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.36)`);
    }
    const glowRgb = hexToRgb(theme.primary_glow_color);
    if (glowRgb) {
      root.style.setProperty("--chaos-glow-rgb", `${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}`);
    }
  }, [theme.accent_color, theme.animation_preset, theme.enable_parallax, theme.primary_glow_color]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = theme.seo_title;
    setMeta("name", "description", theme.seo_description);
    setMeta("property", "og:site_name", theme.site_name.toUpperCase());
    setMeta("property", "og:title", theme.seo_title);
    setMeta("property", "og:description", theme.seo_description);
    setMeta("name", "twitter:title", theme.seo_title);
    setMeta("name", "twitter:description", theme.seo_description);
    if (theme.seo_image_url) {
      setMeta("property", "og:image", theme.seo_image_url);
      setMeta("name", "twitter:image", theme.seo_image_url);
    }
    setMeta("name", "theme-color", theme.accent_color);
  }, [theme.accent_color, theme.seo_description, theme.seo_image_url, theme.seo_title, theme.site_name]);

  return null;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
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
