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
        "shop_domain, shop_name, is_active, auto_sync, last_sync_at, last_sync_status, products_synced, created_at, token_expires_at",
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
    return { connection: conn ?? null, logs: logs ?? [] };
  });

// ── Step 1: Start OAuth — returns the URL to redirect the user to ─────────

const startOAuthSchema = z.object({
  shopDomain: z.string().min(3).max(255),
  clientId: z.string().min(10).max(255),
  clientSecret: z.string().min(10).max(512),
});

export const startShopifyOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startOAuthSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);

    const shop = normaliseShopDomain(data.shopDomain);
    const state = crypto.randomUUID();
    const redirectUri = `${process.env.VITE_SUPABASE_URL ? "https://chaosgemstones.com" : "http://localhost:5173"}/api/public/shopify/callback`;

    // Store credentials + state so the callback can complete the exchange
    const [encClientId, encClientSecret] = await Promise.all([
      encryptToken(data.clientId),
      encryptToken(data.clientSecret),
    ]);

    await supabaseAdmin.from("shopify_connections").upsert(
      {
        jeweller_id: userId,
        shop_domain: shop,
        client_id: encClientId,
        client_secret: encClientSecret,
        is_active: false,  // not active until callback completes
      },
      { onConflict: "jeweller_id" },
    );

    // Store state in a short-lived DB row keyed to the jeweller
    await supabaseAdmin.from("shopify_oauth_states").upsert(
      { jeweller_id: userId, state, shop_domain: shop, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
      { onConflict: "jeweller_id" },
    );

    const authorizeUrl = buildAuthorizeUrl(shop, data.clientId, redirectUri, state);
    return { authorizeUrl };
  });

// ── Step 2: Callback handler (server route) ───────────────────────────────
// This is handled in /api/public/shopify/callback.ts (separate file)

export const connectShopify = startShopifyOAuth; // alias for backward compat

// ── Direct Access Token connect (Custom App `shpat_...`) ─────────────────
// For jewellers who already have a Shopify Custom App and just want to
// paste their Admin API access token. This is the most reliable path —
// it skips OAuth entirely and stores the permanent token directly.

const tokenConnectSchema = z.object({
  shopDomain: z.string().min(3).max(255),
  accessToken: z.string().min(10).max(512),
});

export const connectShopifyWithToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tokenConnectSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);

    const shop = normaliseShopDomain(data.shopDomain);
    const token = data.accessToken.trim();

    // Validate the token by calling /shop.json before persisting
    const test = await testShopifyConnection(shop, token);
    if (!test.ok) {
      throw new Error(`Could not verify token: ${test.error}`);
    }

    const encToken = await encryptToken(token);

    const { error } = await supabaseAdmin.from("shopify_connections").upsert(
      {
        jeweller_id: userId,
        shop_domain: shop,
        shop_name: test.name,
        access_token: encToken,
        token_expires_at: null,
        is_active: true,
      },
      { onConflict: "jeweller_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, shopName: test.name };
  });

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