import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
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

const connectSchema = z.object({
  shopDomain: z.string().min(3).max(255),
  // For Custom Apps, clientId is still stored for reference but the
  // accessToken field (mapped from the "clientSecret" UI field) is what
  // actually authenticates API calls.
  clientId: z.string().max(255).optional().default(""),
  clientSecret: z.string().min(10).max(512), // This holds the shpat_... access token
});

export const connectShopify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => connectSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context;
    await assertJeweller(supabase, userId);

    const shop = normaliseShopDomain(data.shopDomain);
    const accessToken = data.clientSecret.trim(); // Custom App Admin API Access Token

    // Validate the token works before storing
    const test = await testShopifyConnection(shop, accessToken);
    if (!test.ok) throw new Error(test.error);

    const encAccessToken = await encryptToken(accessToken);
    // Store client_id if provided, otherwise store empty
    const encClientId = data.clientId ? await encryptToken(data.clientId) : null;

    const { error } = await supabaseAdmin
      .from("shopify_connections")
      .upsert(
        {
          jeweller_id: userId,
          shop_domain: shop,
          shop_name: test.name,
          client_id: encClientId,
          client_secret: null, // not needed for Custom App
          access_token: encAccessToken,
          token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        },
        { onConflict: "jeweller_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, shopName: test.name, shop };
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