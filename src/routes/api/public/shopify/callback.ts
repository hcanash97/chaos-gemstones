import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  decryptToken,
  encryptToken,
  exchangeCodeForToken,
  normaliseShopDomain,
  testShopifyConnection,
} from "@/lib/shopify.server";

// GET /api/public/shopify/callback
// Shopify redirects here after the merchant authorises the app.
// We persist the access token IMMEDIATELY (first DB write) — before any
// follow-up shop.json call, so a failed shop-name fetch can't lose the token.

export const Route = createFileRoute("/api/public/shopify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code") ?? "";
        const shop = url.searchParams.get("shop") ?? "";
        const error = url.searchParams.get("error") ?? "";
        const state = url.searchParams.get("state") ?? "";

        const CHAOS = "https://chaosgemstones.com";
        const fail = (msg: string) =>
          Response.redirect(
            `${CHAOS}/dashboard/jeweller/shopify?error=${encodeURIComponent(msg)}`,
            302,
          );

        if (error) return fail(`Shopify declined: ${error}`);
        if (!code) return fail("No authorisation code received from Shopify.");
        if (!shop) return fail("No shop domain in Shopify redirect.");

        const normShop = normaliseShopDomain(shop);

        // Look up the connection by state (tied to the jeweller who started
        // the flow). This is robust to Shopify substituting a different shop
        // (e.g. a Partner dev store) for the one originally entered.
        let jewellerId: string | null = null;
        if (state) {
          const { data: st } = await supabaseAdmin
            .from("shopify_oauth_states")
            .select("jeweller_id, expires_at")
            .eq("state", state)
            .maybeSingle();
          if (st && new Date(st.expires_at).getTime() > Date.now()) {
            jewellerId = st.jeweller_id;
          }
        }

        let conn: { id: string; jeweller_id: string; client_id: string | null; client_secret: string | null } | null = null;
        if (jewellerId) {
          const { data } = await supabaseAdmin
            .from("shopify_connections")
            .select("id, jeweller_id, client_id, client_secret")
            .eq("jeweller_id", jewellerId)
            .maybeSingle();
          conn = data ?? null;
        }
        if (!conn) {
          // Fallback: try matching by the shop domain Shopify returned.
          const { data: rows } = await supabaseAdmin
            .from("shopify_connections")
            .select("id, jeweller_id, client_id, client_secret")
            .eq("shop_domain", normShop)
            .order("created_at", { ascending: false })
            .limit(1);
          conn = rows?.[0] ?? null;
        }

        if (!conn) {
          return fail(
            `No connection record found for ${normShop}. Please return to Chaos, click Disconnect, then Connect again — and authorise on your real store (not a Shopify development store).`,
          );
        }
        if (!conn.client_id || !conn.client_secret) {
          return fail("Credentials not found. Please click Disconnect then Connect again.");
        }

        let clientSecret: string;
        try {
          clientSecret = await decryptToken(conn.client_secret);
        } catch {
          return fail("Could not decrypt stored credentials. Please reconnect.");
        }

        let token: string;
        try {
          token = await exchangeCodeForToken(normShop, conn.client_id, clientSecret, code);
        } catch (e) {
          return fail(
            `Token exchange failed: ${e instanceof Error ? e.message : String(e)}`,
          );
        }

        let encToken: string;
        try {
          encToken = await encryptToken(token);
        } catch {
          return fail("Failed to encrypt token. Check ENCRYPTION_KEY env var.");
        }

        // Save the token FIRST — before any further calls.
        const { error: dbErr } = await supabaseAdmin
          .from("shopify_connections")
          .update({
            access_token: encToken,
            token_expires_at: null,
            is_active: true,
            shop_domain: normShop,
          })
          .eq("id", conn.id);
        if (dbErr) return fail(`Failed to save token: ${dbErr.message}`);

        // Non-fatal: fetch shop name.
        const test = await testShopifyConnection(normShop, token).catch(() => null);
        if (test?.ok && test.name) {
          await supabaseAdmin
            .from("shopify_connections")
            .update({ shop_name: test.name })
            .eq("id", conn.id);
        }

        await supabaseAdmin
          .from("shopify_oauth_states")
          .delete()
          .eq("jeweller_id", conn.jeweller_id);

        return Response.redirect(
          `${CHAOS}/dashboard/jeweller/shopify?connected=1`,
          302,
        );
      },
    },
  },
});