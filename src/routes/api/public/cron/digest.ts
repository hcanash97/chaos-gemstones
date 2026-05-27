import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend";
import { BASE_URL, btn, esc, shell } from "@/lib/email/templates";

// Daily digest: for each jeweller, send a summary of new stones (last 24h)
// from dealers they follow. Called by pg_cron at 08:00 UTC.
export const Route = createFileRoute("/api/public/cron/digest")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { data: follows } = await supabaseAdmin
            .from("dealer_follows")
            .select("jeweller_id, dealer_id");
          if (!follows?.length) {
            return new Response(JSON.stringify({ sent: 0, reason: "no follows" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const byJeweller = new Map<string, string[]>();
          for (const f of follows) {
            const arr = byJeweller.get(f.jeweller_id) ?? [];
            arr.push(f.dealer_id);
            byJeweller.set(f.jeweller_id, arr);
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
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});