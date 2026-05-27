import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Stable production URL — flip to a custom domain when one is set.
const BASE_URL = "https://chaosgemstones.com";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticPaths = ["/", "/marketplace", "/vendors", "/about"];
        const [{ data: vendors }, { data: stones }] = await Promise.all([
          supabaseAdmin
            .from("dealer_profiles")
            .select("slug, profiles!inner(is_approved)")
            .eq("profiles.is_approved", true),
          supabaseAdmin
            .from("stones")
            .select("id")
            .eq("status", "available")
            .limit(5000),
        ]);

        const urls: string[] = [];
        for (const p of staticPaths) {
          urls.push(`  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`);
        }
        for (const v of vendors ?? []) {
          urls.push(`  <url><loc>${BASE_URL}/vendors/${(v as any).slug}</loc><changefreq>weekly</changefreq></url>`);
        }
        for (const s of stones ?? []) {
          urls.push(`  <url><loc>${BASE_URL}/stone/${(s as any).id}</loc><changefreq>daily</changefreq></url>`);
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
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});