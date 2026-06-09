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
// Simplified: we look up the jeweller by shop domain rather than
// depending on an exact state match (which breaks if the user clicks
// around before the redirect fires).

export const Route = createFileRoute("/api/public/shopify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code  = url.searchParams.get("code") ?? "";
        const shop  = url.searchParams.get("shop") ?? "";
        const error = url.searchParams.get("error") ?? "";

        const CHAOS = "https://chaosgemstones.com";
        const fail = (msg: string) =>
          Response.redirect(
            `${CHAOS}/dashboard/jeweller/shopify?error=${encodeURIComponent(msg)}`,
            302,
          );

        // Shopify sometimes sends error param (e.g. user clicked Cancel)
        if (error) return fail(`Shopify returned error: ${error}`);
        if (!code || !shop) return fail("Missing code or shop from Shopify redirect.");

        const normShop = normaliseShopDomain(shop);

        // Look up the jeweller by shop domain — no state table needed
        const { data: conn } = await supabaseAdmin
          .from("shopify_connections")
          .select("id, jeweller_id, client_id, client_secret")
          .eq("shop_domain", normShop)
          .maybeSingle();

        if (!conn) {
          return fail(
            `No connection record found for ${normShop}. ` +
            "Please fill in the form and click Connect again.",
          );
        }

        if (!conn.client_id || !conn.client_secret) {
          return fail("Credentials not found. Please click Connect again.");
        }

        let clientId: string;
        let clientSecret: string;
        try {
          clientId     = await decryptToken(conn.client_id);
          clientSecret = await decryptToken(conn.client_secret);
        } catch (e) {
          return fail("Could not read stored credentials — please reconnect.");
        }

        // Exchange the authorisation code for a permanent offline token
        let token: string;
        try {
          token = await exchangeCodeForToken(normShop, clientId, clientSecret, code);
        } catch (e) {
          return fail(
            `Token exchange failed: ${e instanceof Error ? e.message : String(e)}`,
          );
        }

        // Quick sanity check
        const test = await testShopifyConnection(normShop, token);
        if (!test.ok) return fail(`Connection test failed: ${test.error}`);

        // Persist the permanent token
        const encToken = await encryptToken(token);
        const { error: dbError } = await supabaseAdmin
          .from("shopify_connections")
          .update({
            shop_name:         test.name,
            access_token:      encToken,
            token_expires_at:  null,   // permanent
            is_active:         true,
          })
          .eq("id", conn.id);

        if (dbError) return fail(`Database error: ${dbError.message}`);

        // Clean up any leftover state rows
        try {
          await supabaseAdmin
            .from("shopify_oauth_states")
            .delete()
            .eq("jeweller_id", conn.jeweller_id);
        } catch {
          // non-fatal
        }

        return Response.redirect(
          `${CHAOS}/dashboard/jeweller/shopify?connected=1`,
          302,
        );
      },
    },
  },
});
