import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SEO_MARKETPLACE_PAGES } from "@/lib/seo-marketplace";

const BASE_URL = "https://chaosgemstones.com";

const STATIC_ROUTES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/marketplace", priority: "0.9", changefreq: "hourly" },
  { path: "/retail", priority: "0.8", changefreq: "weekly" },
  ...SEO_MARKETPLACE_PAGES.map((page) => ({
    path: `/marketplace/${page.slug}`,
    priority: page.audience === "dealers" ? "0.8" : "0.75",
    changefreq: "daily",
  })),
  { path: "/vendors", priority: "0.8", changefreq: "daily" },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/how-it-works/payments", priority: "0.5", changefreq: "monthly" },
  { path: "/how-it-works/shipping", priority: "0.5", changefreq: "monthly" },
  { path: "/docs/api", priority: "0.7", changefreq: "weekly" },
  { path: "/docs/dealer-api", priority: "0.6", changefreq: "weekly" },
  { path: "/requests", priority: "0.7", changefreq: "daily" },
  { path: "/sign-up/dealer", priority: "0.8", changefreq: "monthly" },
  { path: "/sign-up/jeweller", priority: "0.8", changefreq: "monthly" },
  { path: "/learn", priority: "0.7", changefreq: "weekly" },
  { path: "/learn/how-to-source-sapphires-wholesale", priority: "0.7", changefreq: "monthly" },
  { path: "/learn/diamond-grading-explained", priority: "0.7", changefreq: "monthly" },
  { path: "/learn/buying-unheated-rubies", priority: "0.7", changefreq: "monthly" },
  { path: "/learn/gemstone-api-for-jewellers", priority: "0.8", changefreq: "monthly" },
  { path: "/learn/understand-gemstone-treatments", priority: "0.6", changefreq: "monthly" },
  { path: "/learn/jaipur-gemstone-market-guide", priority: "0.6", changefreq: "monthly" },
  { path: "/learn/gemstones/sapphire", priority: "0.7", changefreq: "weekly" },
  { path: "/learn/gemstones/ruby", priority: "0.7", changefreq: "weekly" },
  { path: "/learn/gemstones/emerald", priority: "0.7", changefreq: "weekly" },
  { path: "/learn/gemstones/alexandrite", priority: "0.7", changefreq: "weekly" },
  { path: "/learn/gemstones/diamond", priority: "0.7", changefreq: "weekly" },
  { path: "/learn/gemstones/spinel", priority: "0.6", changefreq: "weekly" },
  { path: "/learn/gemstones/tanzanite", priority: "0.6", changefreq: "weekly" },
  { path: "/learn/gemstones/tourmaline", priority: "0.6", changefreq: "weekly" },
  { path: "/learn/gemstones/paraiba", priority: "0.6", changefreq: "weekly" },
];

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [{ data: vendors }, { data: jewellers }, { data: stones }] = await Promise.all([
          supabaseAdmin
            .from("dealer_profiles")
            .select("slug, updated_at, profiles!inner(is_approved)")
            .eq("profiles.is_approved", true),
          supabaseAdmin
            .from("jeweller_profiles")
            .select("slug, created_at, profiles!inner(is_approved)")
            .eq("profiles.is_approved", true)
            .eq("is_public", true)
            .not("slug", "is", null),
          supabaseAdmin
            .from("stones")
            .select("id, updated_at")
            .eq("status", "available")
            .limit(10000),
        ]);

        const urls: string[] = [];
        for (const r of STATIC_ROUTES) {
          urls.push(
            `  <url><loc>${BASE_URL}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
          );
        }
        for (const v of vendors ?? []) {
          const lastmod = fmtDate((v as any).updated_at);
          urls.push(
            `  <url><loc>${BASE_URL}/vendors/${(v as any).slug}</loc>${
              lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
            }<changefreq>weekly</changefreq><priority>0.7</priority></url>`,
          );
        }
        for (const j of jewellers ?? []) {
          const lastmod = fmtDate((j as any).created_at);
          urls.push(
            `  <url><loc>${BASE_URL}/jewellers/${(j as any).slug}</loc>${
              lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
            }<changefreq>weekly</changefreq><priority>0.6</priority></url>`,
          );
        }
        for (const s of stones ?? []) {
          const lastmod = fmtDate((s as any).updated_at);
          urls.push(
            `  <url><loc>${BASE_URL}/stone/${(s as any).id}</loc>${
              lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
            }<changefreq>daily</changefreq><priority>0.6</priority></url>`,
          );
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
          },
        });
      },
    },
  },
});
