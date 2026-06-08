import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// POST /api/public/hooks/shopify/events
// Receives webhook events from Shopify Custom Apps.
// Verifies HMAC-SHA256 signature before processing.

export const Route = createFileRoute("/api/public/hooks/shopify/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        // ── 1. HMAC verification ─────────────────────────────────────────────
        const hmacHeader = request.headers.get("x-shopify-hmac-sha256") ?? "";
        const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

        if (!webhookSecret) {
          console.error("[shopify/events] SHOPIFY_WEBHOOK_SECRET not set");
          return new Response("Server not configured", { status: 500 });
        }

        const valid = await verifyShopifyHmac(rawBody, hmacHeader, webhookSecret);
        if (!valid) {
          console.warn("[shopify/events] HMAC verification failed — rejecting webhook");
          return new Response("Unauthorized", { status: 401 });
        }

        // ── 2. Parse and route ───────────────────────────────────────────────
        const topic = request.headers.get("x-shopify-topic") ?? "";
        const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "";

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        console.log(`[shopify/events] topic=${topic} shop=${shopDomain}`);

        try {
          switch (topic) {
            case "orders/create":
              await handleOrderCreate(payload, shopDomain);
              break;
            case "products/update":
              await handleProductUpdate(payload, shopDomain);
              break;
            case "products/delete":
              await handleProductDelete(payload, shopDomain);
              break;
            default:
              // Unknown topic — acknowledge with 200 so Shopify doesn't retry
              console.log(`[shopify/events] unhandled topic: ${topic}`);
          }
        } catch (e) {
          console.error(`[shopify/events] handler error for ${topic}:`, e);
          // Return 200 anyway — returning 5xx causes Shopify to retry the webhook
          // which would cause the same error repeatedly.
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

// ── HMAC verification ────────────────────────────────────────────────────────

async function verifyShopifyHmac(
  body: string,
  hmacHeader: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
    // Constant-time comparison
    if (computed.length !== hmacHeader.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ── orders/create ────────────────────────────────────────────────────────────
// When a customer buys a stone on Shopify, mark it as sold on Chaos to prevent
// double-selling.

async function handleOrderCreate(
  payload: Record<string, unknown>,
  shopDomain: string,
): Promise<void> {
  const lineItems = (payload.line_items as any[]) ?? [];

  // Find the jeweller who owns this shop
  const { data: conn } = await supabaseAdmin
    .from("shopify_connections")
    .select("jeweller_id")
    .eq("shop_domain", shopDomain)
    .eq("is_active", true)
    .maybeSingle();

  if (!conn) {
    console.warn(`[shopify/events] orders/create: no connection for shop ${shopDomain}`);
    return;
  }

  for (const item of lineItems) {
    const productId = String(item.product_id ?? "");
    if (!productId) continue;

    // Find the stone this product maps to
    const { data: mapping } = await supabaseAdmin
      .from("shopify_product_map")
      .select("stone_id")
      .eq("jeweller_id", conn.jeweller_id)
      .eq("shopify_product_id", productId)
      .maybeSingle();

    if (!mapping?.stone_id) continue;

    // Mark the stone as sold
    const { error } = await supabaseAdmin
      .from("stones")
      .update({ status: "sold" as const })
      .eq("id", mapping.stone_id)
      .neq("status", "sold"); // idempotent

    if (error) {
      console.error(`[shopify/events] Failed to mark stone ${mapping.stone_id} as sold:`, error.message);
    } else {
      console.log(`[shopify/events] Stone ${mapping.stone_id} marked as sold via Shopify order`);
    }

    // Update the product map status
    await supabaseAdmin
      .from("shopify_product_map")
      .update({ shopify_product_status: "sold" })
      .eq("jeweller_id", conn.jeweller_id)
      .eq("shopify_product_id", productId);
  }
}

// ── products/update ──────────────────────────────────────────────────────────
// If a Shopify product is archived/deleted directly in Shopify Admin,
// reflect that on the Chaos side.

async function handleProductUpdate(
  payload: Record<string, unknown>,
  shopDomain: string,
): Promise<void> {
  const productId = String((payload as any).id ?? "");
  const shopifyStatus = (payload as any).status as string | undefined;
  if (!productId) return;

  const { data: conn } = await supabaseAdmin
    .from("shopify_connections")
    .select("jeweller_id")
    .eq("shop_domain", shopDomain)
    .eq("is_active", true)
    .maybeSingle();
  if (!conn) return;

  // Update the map with the latest status from Shopify
  await supabaseAdmin
    .from("shopify_product_map")
    .update({
      shopify_product_status: shopifyStatus ?? "unknown",
      last_synced_at: new Date().toISOString(),
    })
    .eq("jeweller_id", conn.jeweller_id)
    .eq("shopify_product_id", productId);

  // If Shopify archived the product, mark the stone as sold
  if (shopifyStatus === "archived") {
    const { data: mapping } = await supabaseAdmin
      .from("shopify_product_map")
      .select("stone_id")
      .eq("jeweller_id", conn.jeweller_id)
      .eq("shopify_product_id", productId)
      .maybeSingle();
    if (mapping?.stone_id) {
      await supabaseAdmin
        .from("stones")
        .update({ status: "sold" as const })
        .eq("id", mapping.stone_id)
        .neq("status", "sold");
    }
  }
}

// ── products/delete ──────────────────────────────────────────────────────────

async function handleProductDelete(
  payload: Record<string, unknown>,
  shopDomain: string,
): Promise<void> {
  const productId = String((payload as any).id ?? "");
  if (!productId) return;

  const { data: conn } = await supabaseAdmin
    .from("shopify_connections")
    .select("jeweller_id")
    .eq("shop_domain", shopDomain)
    .eq("is_active", true)
    .maybeSingle();
  if (!conn) return;

  // Remove from map — the product no longer exists on Shopify
  await supabaseAdmin
    .from("shopify_product_map")
    .delete()
    .eq("jeweller_id", conn.jeweller_id)
    .eq("shopify_product_id", productId);
}
