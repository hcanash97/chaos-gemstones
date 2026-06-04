import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend";
import { BASE_URL, btn, esc, shell } from "@/lib/email/templates";

// Daily digest: for each jeweller, send a summary of new stones (last 24h)
// from dealers they follow. Called by pg_cron at 08:00 UTC.
//
// AUTHENTICATION: a shared secret must be sent in the Authorization header,
// matching the CRON_SECRET environment variable. Without this the endpoint
// was world-callable, which let any attacker trigger an email blast.
export const Route = createFileRoute("/api/public/cron/digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) {
          console.error("[cron/digest] CRON_SECRET env var is not set — refusing to run");
          return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        const auth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
        const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (provided !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        try {
          // IMPORTANT: the "follow a dealer" UI writes to feed_selections
          // (selection_type = 'dealer_follow'), NOT to dealer_follows. The
          // dealer_follows table exists in the schema but is never populated
          // by any user-facing code path, so the digest used to silently
          // email no one. Use feed_selections instead.
          // feed_selections has api_key_id (not jeweller_id directly), so
          // we join via api_keys to recover the jeweller.
          const { data: follows } = await supabaseAdmin
            .from("feed_selections")
            .select("dealer_id, api_keys!inner(jeweller_id, is_active)")
            .eq("selection_type", "dealer_follow")
            .not("dealer_id", "is", null)
            .eq("api_keys.is_active", true);
          if (!follows?.length) {
            return new Response(JSON.stringify({ sent: 0, reason: "no follows" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const byJeweller = new Map<string, string[]>();
          for (const f of follows) {
            const ak = (f as any).api_keys;
            const jewellerId = ak?.jeweller_id as string | undefined;
            const dealerId = (f as any).dealer_id as string | undefined;
            if (!jewellerId || !dealerId) continue;
            const arr = byJeweller.get(jewellerId) ?? [];
            if (!arr.includes(dealerId)) arr.push(dealerId);
            byJeweller.set(jewellerId, arr);
          }

          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          let sent = 0;

          for (const [jewellerId, dealerIds] of byJeweller) {
            const { data: stones } = await supabaseAdmin
              .from("stones")
              .select("id, stone_type, shape, carat_weight, wholesale_price_usd, dealer_id")
              .in("dealer_id", dealerIds)
              .eq("status", "available")
              .gte("created_at", since)
              .order("created_at", { ascending: false })
              .limit(5);
            if (!stones?.length) continue;

            const { data: jp } = await supabaseAdmin
              .from("profiles")
              .select("email, full_name")
              .eq("id", jewellerId)
              .maybeSingle();
            if (!jp?.email) continue;

            const items = stones
              .map(
                (s) =>
                  `<li style="margin:0 0 8px;">${esc(String(s.carat_weight ?? ""))}ct ${esc(s.shape ?? "")} ${esc(s.stone_type)}</li>`,
              )
              .join("");

            const html = shell(`
              <p style="margin:0 0 16px;">Hi ${esc(jp.full_name || "there")},</p>
              <p style="margin:0 0 16px;">New stones from dealers you follow on Chaos in the last 24 hours:</p>
              <ul style="margin:0 0 24px;padding-left:20px;">${items}</ul>
              <p style="margin:0 0 24px;">${btn(BASE_URL + "/marketplace", "View on Chaos")}</p>
              <p style="margin:0;">— The Chaos team</p>
            `);

            const r = await sendEmail(
              jp.email,
              "New stones from dealers you follow — Chaos",
              html,
            );
            if (r.ok) sent++;
          }

          return new Response(JSON.stringify({ sent }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[cron/digest] error", e);
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});