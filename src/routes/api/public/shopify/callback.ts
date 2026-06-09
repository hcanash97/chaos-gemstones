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
//
// Resilient design:
// - Looks up connection by shop domain (no state table race condition)
// - Stores the token IMMEDIATELY once exchanged
// - Sets is_active=true before optional test
// - Test failure is non-fatal — token is already saved

export const Route = createFileRoute("/api/public/shopify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url  = new URL(request.url);
        const code  = url.searchParams.get("code")  ?? "";
        const shop  = url.searchParams.get("shop")  ?? "";
        const error = url.searchParams.get("error") ?? "";

        const CHAOS = "https://chaosgemstones.com";
        const fail  = (msg: string) =>
          Response.redirect(
            `${CHAOS}/dashboard/jeweller/shopify?error=${encodeURIComponent(msg)}`,
            302,
          );

        if (error) return fail(`Shopify declined the request: ${error}`);
        if (!code) return fail("No authorisation code received from Shopify.");
        if (!shop) return fail("No shop domain in Shopify redirect.");

        const normShop = normaliseShopDomain(shop);

        // ── 1. Find the connection row by shop domain ──────────────────────
        const { data: conn } = await supabaseAdmin
          .from("shopify_connections")
          .select("id, jeweller_id, client_id, client_secret")
          .eq("shop_domain", normShop)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conn) {
          return fail(
            `No connection found for ${normShop}. ` +
            "Please fill in the form and click Connect again.",
          );
        }

        if (!conn.client_id || !conn.client_secret) {
          return fail(
            "Credentials missing from connection record. Please click Disconnect then Connect again.",
          );
        }

        // ── 2. Decrypt stored credentials ───────────────────────────────────
        let clientId: string;
        let clientSecret: string;
        try {
          clientId     = await decryptToken(conn.client_id);
          clientSecret = await decryptToken(conn.client_secret);
        } catch {
          return fail("Could not read stored credentials. Please reconnect.");
        }

        // ── 3. Exchange code for permanent offline token ─────────────────────
        let token: string;
        try {
          token = await exchangeCodeForToken(normShop, clientId, clientSecret, code);
        } catch (e) {
          return fail(
            `Token exchange failed: ${e instanceof Error ? e.message : String(e)}`,
          );
        }

        // ── 4. Store token IMMEDIATELY — before any further checks ───────────
        // Storing first means the token is saved even if the subsequent
        // test call fails. is_active=true so syncs can proceed.
        let encToken: string;
        try {
          encToken = await encryptToken(token);
        } catch {
          return fail("Failed to encrypt token. Check server environment variables.");
        }

        const { error: dbErr } = await supabaseAdmin
          .from("shopify_connections")
          .update({
            access_token:     encToken,
            token_expires_at: null,       // permanent offline token
            is_active:        true,
          })
          .eq("id", conn.id);

        if (dbErr) {
          return fail(`Failed to save token: ${dbErr.message}`);
        }

        // ── 5. Fetch shop name (non-fatal) ──────────────────────────────────
        // Token is already saved — if this fails the user is still connected.
        const test = await testShopifyConnection(normShop, token).catch(() => null);
        if (test?.ok && test.name) {
          await supabaseAdmin
            .from("shopify_connections")
            .update({ shop_name: test.name })
            .eq("id", conn.id)
            .then(() => {})
            .catch(() => {});
        }

        // ── 6. Clean up state rows if they exist ────────────────────────────
        await supabaseAdmin
          .from("shopify_oauth_states")
          .delete()
          .eq("jeweller_id", conn.jeweller_id)
          .then(() => {})
          .catch(() => {});

        return Response.redirect(
          `${CHAOS}/dashboard/jeweller/shopify?connected=1`,
          302,
        );
      },
    },
  },
});
