import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/public/feed")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const key = url.searchParams.get("key");
          if (!key) return json({ error: "Missing 'key' query parameter" }, 401);

          const keyHash = createHash("sha256").update(key).digest("hex");
          const { data: apiKey } = await supabaseAdmin
            .from("api_keys")
            .select("id, jeweller_id, is_active")
            .eq("key_hash", keyHash)
            .maybeSingle();

          if (!apiKey || !apiKey.is_active) {
            return json({ error: "Invalid or inactive API key" }, 401);
          }

          // Fire-and-forget last_used_at update
          supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", apiKey.id)
            .then(() => {});

          const { data: jProfile } = await supabaseAdmin
            .from("jeweller_profiles")
            .select("markup_global")
            .eq("id", apiKey.jeweller_id)
            .maybeSingle();
          const globalMarkup = Number(jProfile?.markup_global ?? 2);

          const { data: selections } = await supabaseAdmin
            .from("feed_selections")
            .select("selection_type, stone_id, dealer_id, markup_override")
            .eq("api_key_id", apiKey.id);

          const dealerFollows = (selections ?? []).filter(
            (s) => s.selection_type === "dealer_follow" && s.dealer_id,
          );
          const stonePins = (selections ?? []).filter(
            (s) => s.selection_type === "stone_pin" && s.stone_id,
          );

          const stones: any[] = [];
          const seen = new Set<string>();

          const pushStone = (s: any, markup: number) => {
            if (seen.has(s.id)) return;
            seen.add(s.id);
            const wholesale = s.wholesale_price_usd != null ? Number(s.wholesale_price_usd) : null;
            stones.push({
              ...s,
              retail_price: wholesale != null ? Math.round(wholesale * markup * 100) / 100 : null,
              markup_applied: markup,
            });
          };

          if (dealerFollows.length) {
            const dealerIds = dealerFollows.map((d) => d.dealer_id as string);
            const { data } = await supabaseAdmin
              .from("stones")
              .select("*, stone_images(storage_url, is_primary, sort_order)")
              .in("dealer_id", dealerIds)
              .eq("status", "available");
            (data ?? []).forEach((s: any) => {
              const override = dealerFollows.find((d) => d.dealer_id === s.dealer_id)?.markup_override;
              const m = override != null ? Number(override) : globalMarkup;
              pushStone(s, m);
            });
          }

          if (stonePins.length) {
            const stoneIds = stonePins.map((p) => p.stone_id as string);
            const { data } = await supabaseAdmin
              .from("stones")
              .select("*, stone_images(storage_url, is_primary, sort_order)")
              .in("id", stoneIds)
              .eq("status", "available");
            (data ?? []).forEach((s: any) => {
              const pin = stonePins.find((p) => p.stone_id === s.id);
              const m = pin?.markup_override != null ? Number(pin.markup_override) : globalMarkup;
              pushStone(s, m);
            });
          }

          return json({
            count: stones.length,
            last_updated: new Date().toISOString(),
            stones,
          });
        } catch (e) {
          console.error("[feed] internal error", e);
          return json({ error: "Internal server error" }, 500);
        }
      },
    },
  },
});