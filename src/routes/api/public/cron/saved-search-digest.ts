import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend";
import { BASE_URL, btn, esc, shell } from "@/lib/email/templates";
import { applyFilters, type FilterState } from "@/lib/marketplace/filters";

// Daily digest of new stones matching each jeweller's saved searches.
// Schedule with pg_cron, see /docs.api for cadence.
export const Route = createFileRoute("/api/public/cron/saved-search-digest")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { data: searches } = await supabaseAdmin
            .from("saved_searches")
            .select("id, jeweller_id, name, filters, last_notified_at")
            .eq("notify_daily", true);
          if (!searches?.length) {
            return new Response(JSON.stringify({ sent: 0, reason: "no active searches" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Pull all stones added in the last 7 days once; we'll filter per search.
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: recentStones } = await supabaseAdmin
            .from("stones")
            .select(
              "id, dealer_id, stone_type, shape, carat_weight, origin, country_of_origin, cert_lab, cert_number, wholesale_price_usd, colour_grade, clarity_grade, cut_grade, polish, symmetry, fluorescence, fluorescence_colour, colour_hue, colour_tone, colour_saturation, treatment, status, listing_type, parcel_quantity, matching_pair, has_video, has_360, cert_url, view_count, bulk_pricing_available, phenomenon, enhancement, girdle, culet_size, milky, eye_clean, black_inclusion, provenance_report, measurements_length, measurements_width, measurements_height, lw_ratio, depth_pct, table_pct, created_at, updated_at, stone_images(storage_url)",
            )
            .eq("status", "available")
            .gte("created_at", sevenDaysAgo)
            .order("created_at", { ascending: false })
            .limit(500);
          const pool = recentStones ?? [];

          let sent = 0;

          for (const search of searches) {
            const since = search.last_notified_at
              ? new Date(search.last_notified_at).getTime()
              : Date.now() - 24 * 60 * 60 * 1000;
            const newPool = pool.filter((s) => new Date(s.created_at).getTime() > since);
            if (!newPool.length) continue;

            const filters = (search.filters ?? {}) as FilterState;
            let matches: any[] = [];
            try {
              matches = applyFilters(newPool, filters).slice(0, 8);
            } catch (err) {
              console.warn("[saved-search-digest] filter error", search.id, err);
              continue;
            }
            if (!matches.length) continue;

            const { data: jp } = await supabaseAdmin
              .from("profiles")
              .select("email, full_name")
              .eq("id", search.jeweller_id)
              .maybeSingle();
            if (!jp?.email) continue;

            const items = matches
              .map((s) => {
                const carat = s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : "";
                const shape = s.shape ? `${s.shape} ` : "";
                const price = s.wholesale_price_usd
                  ? ` — $${Number(s.wholesale_price_usd).toLocaleString()}`
                  : "";
                return `<li style="margin:0 0 8px;"><a href="${BASE_URL}/stone/${s.id}" style="color:#1B3A2D;">${esc(carat)}${esc(shape)}${esc(s.stone_type)}</a>${esc(price)}</li>`;
              })
              .join("");

            const html = shell(`
              <p style="margin:0 0 16px;">Hi ${esc(jp.full_name || "there")},</p>
              <p style="margin:0 0 16px;">${matches.length} new stone${matches.length === 1 ? "" : "s"} matched your saved search <strong>${esc(search.name)}</strong>:</p>
              <ul style="margin:0 0 24px;padding-left:20px;">${items}</ul>
              <p style="margin:0 0 24px;">${btn(BASE_URL + "/dashboard/jeweller/saved-searches", "Manage saved searches")}</p>
              <p style="margin:0;">— The Chaos team</p>
            `);

            const r = await sendEmail(
              jp.email,
              `${matches.length} new match${matches.length === 1 ? "" : "es"} for "${search.name}" — Chaos`,
              html,
            );
            if (r.ok) {
              sent++;
              await supabaseAdmin
                .from("saved_searches")
                .update({ last_notified_at: new Date().toISOString() })
                .eq("id", search.id);
            }
          }

          return new Response(JSON.stringify({ sent }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[cron/saved-search-digest] error", e);
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});