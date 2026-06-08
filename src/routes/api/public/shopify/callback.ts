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
// Shopify redirects here after the user authorises the app.
// Query params: code, shop, state, hmac (optional)

export const Route = createFileRoute("/api/public/shopify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code  = url.searchParams.get("code") ?? "";
        const shop  = url.searchParams.get("shop") ?? "";
        const state = url.searchParams.get("state") ?? "";

        const CHAOS_ORIGIN = process.env.VITE_SUPABASE_URL
          ? "https://chaosgemstones.com"
          : "http://localhost:5173";

        const fail = (msg: string) =>
          Response.redirect(`${CHAOS_ORIGIN}/dashboard/jeweller/shopify?error=${encodeURIComponent(msg)}`, 302);

        if (!code || !shop || !state) {
          return fail("Missing OAuth parameters from Shopify.");
        }

        // Look up the state to find the jeweller
        const { data: oauthState } = await supabaseAdmin
          .from("shopify_oauth_states")
          .select("jeweller_id, shop_domain, expires_at")
          .eq("state", state)
          .maybeSingle();

        if (!oauthState) return fail("Invalid or expired OAuth state. Please try connecting again.");
        if (new Date(oauthState.expires_at) < new Date()) return fail("OAuth session expired. Please try connecting again.");

        const normalisedShop = normaliseShopDomain(shop);
        if (normalisedShop !== oauthState.shop_domain) return fail("Store domain mismatch.");

        // Clean up the state row
        await supabaseAdmin.from("shopify_oauth_states").delete().eq("state", state);

        // Fetch the stored credentials for this jeweller
        const { data: conn } = await supabaseAdmin
          .from("shopify_connections")
          .select("client_id, client_secret")
          .eq("jeweller_id", oauthState.jeweller_id)
          .maybeSingle();

        if (!conn?.client_id || !conn?.client_secret) {
          return fail("Credentials not found. Please start the connection process again.");
        }

        let clientId: string;
        let clientSecret: string;
        try {
          clientId     = await decryptToken(conn.client_id);
          clientSecret = await decryptToken(conn.client_secret);
        } catch {
          return fail("Could not decrypt stored credentials.");
        }

        // Exchange code for permanent offline token
        let token: string;
        try {
          token = await exchangeCodeForToken(normalisedShop, clientId, clientSecret, code);
        } catch (e) {
          return fail(`Token exchange failed: ${e instanceof Error ? e.message : String(e)}`);
        }

        // Verify it works
        const test = await testShopifyConnection(normalisedShop, token);
        if (!test.ok) return fail(`Connection test failed: ${test.error}`);

        // Store the permanent token
        const encToken = await encryptToken(token);
        const { error } = await supabaseAdmin
          .from("shopify_connections")
          .update({
            shop_name: test.name,
            access_token: encToken,
            token_expires_at: null, // permanent — never expires
            is_active: true,
          })
          .eq("jeweller_id", oauthState.jeweller_id);

        if (error) return fail(`Database error: ${error.message}`);

        // Redirect back to the Shopify dashboard with success
        return Response.redirect(
          `${CHAOS_ORIGIN}/dashboard/jeweller/shopify?connected=1`,
          302,
        );
      },
    },
  },
});
