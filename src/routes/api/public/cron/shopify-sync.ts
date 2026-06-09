import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runShopifySync } from "@/lib/shopify.server";

// AUTHENTICATION: a shared secret must be sent in the Authorization header,
// matching the CRON_SECRET environment variable. Without this the endpoint
// was world-callable, which let any attacker trigger Shopify-side traffic
// for every connected jeweller.
export const Route = createFileRoute("/api/public/cron/shopify-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) {
          console.error("[cron/shopify-sync] CRON_SECRET env var is not set — refusing to run");
          return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        const auth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
        const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (provided !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const { data: conns } = await supabaseAdmin
          .from("shopify_connections")
          .select("jeweller_id, last_sync_at")
          .eq("is_active", true)
          .eq("auto_sync", true);

        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
        const due = (conns ?? []).filter(
          (c) => !c.last_sync_at || new Date(c.last_sync_at).getTime() < fourHoursAgo,
        );

        const results: Array<{ jeweller_id: string; ok: boolean; error?: string }> = [];
        for (const c of due) {
          try {
            await runShopifySync(c.jeweller_id, "cron_4hr");
            results.push({ jeweller_id: c.jeweller_id, ok: true });
          } catch (e) {
            results.push({
              jeweller_id: c.jeweller_id,
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        return new Response(
          JSON.stringify({ processed: results.length, results }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});