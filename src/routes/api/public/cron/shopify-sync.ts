import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runShopifySync } from "@/lib/shopify.server";

export const Route = createFileRoute("/api/public/cron/shopify-sync")({
  server: {
    handlers: {
      POST: async () => {
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
            await runShopifySync(c.jeweller_id);
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