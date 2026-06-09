import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildAuthorizeUrl,
  encryptToken,
  getValidAccessToken,
  mintAccessToken,
  normaliseShopDomain,
  runShopifySync,
  testShopifyConnection,
  testConnectionForJeweller,
  dryRunShopifySync,
} from "./shopify.server";
import { isJeweller } from "@/lib/auth.utils";

async function assertJeweller(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, account_types, is_approved")
    .eq("id", userId)
    .single();
  if (!isJeweller(profile as any)) {
    throw new Error("Only jeweller accounts can manage Shopify.");
  }
  if (!profile.is_approved) {
    throw new Error("Your account is pending approval.");
  }
}

export const getShopifyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);
    const { data: conn } = await supabaseAdmin
      .from("shopify_connections")
      .select(
        "shop_domain, shop_name, is_active, auto_sync, last_sync_at, last_sync_status, products_synced, created_at, token_expires_at, access_token",
      )
      .eq("jeweller_id", userId)
      .maybeSingle();
    const { data: logs } = await supabaseAdmin
      .from("shopify_sync_logs")
      .select(
        "id, started_at, completed_at, status, stones_added, stones_updated, stones_archived, error_message",
      )
      .eq("jeweller_id", userId)
      .order("started_at", { ascending: false })
      .limit(10);
    const safeConn = conn
      ? (() => {
          const { access_token, ...rest } = conn as any;
          return { ...rest, has_token: !!access_token };
        })()
      : null;
    return { connection: safeConn, logs: logs ?? [] };
  });

// ── Connect with Client ID + Secret (Client Credentials Exchange) ─────────
// Modern Shopify 2026 flow: mint a fresh access token via
//   POST {shop}/admin/oauth/access_token?grant_type=client_credentials
// No browser redirect needed. We store the encrypted client_secret and mint
// short-lived tokens on every sync/test.

const connectSchema = z.object({
  shopDomain: z.string().min(3).max(255),
  clientId: z.string().min(10).max(255),
  clientSecret: z.string().min(10).max(512),
});

export const connectShopify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => connectSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);

    const shop = normaliseShopDomain(data.shopDomain);

    // Persist credentials, then return Shopify's authorize URL.
    // The browser navigates to that URL; Shopify redirects back to
    // /api/public/shopify/callback which exchanges the code for an
    // offline access token and saves it.
    const encSecret = await encryptToken(data.clientSecret);

    const { error } = await supabaseAdmin.from("shopify_connections").upsert(
      {
        jeweller_id: userId,
        shop_domain: shop,
        client_id: data.clientId,
        client_secret: encSecret,
        is_active: false,
        access_token: null,
        token_expires_at: null,
      },
      { onConflict: "jeweller_id" },
    );
    if (error) throw new Error(error.message);

    const state = crypto.randomUUID();
    await supabaseAdmin.from("shopify_oauth_states").upsert({
      jeweller_id: userId,
      state,
      shop_domain: shop,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const redirectUri = "https://chaosgemstones.com/api/public/shopify/callback";
    const authorizeUrl = buildAuthorizeUrl(shop, data.clientId, redirectUri, state);
    return { ok: true, authorizeUrl, shopName: shop };
  });

export const connectShopifyWithToken = connectShopify; // back-compat alias

export const disconnectShopify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);
    await supabaseAdmin
      .from("shopify_connections")
      .delete()
      .eq("jeweller_id", userId);
    return { ok: true };
  });

const autoSyncSchema = z.object({ enabled: z.boolean() });

export const setShopifyAutoSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => autoSyncSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);
    const { error } = await supabaseAdmin
      .from("shopify_connections")
      .update({ auto_sync: data.enabled })
      .eq("jeweller_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const syncShopifyNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);
    return runShopifySync(userId);
  });

export const testShopifyConnectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);
    return testConnectionForJeweller(userId);
  });

export const dryRunShopifySyncFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);
    return dryRunShopifySync(userId);
  });

// Silence unused-import warnings for re-exports kept for callers/tests.
void getValidAccessToken;
void mintAccessToken;
void testShopifyConnection;