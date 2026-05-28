import { supabaseAdmin } from "@/integrations/supabase/client.server";

// --- Token encryption (AES-GCM, key derived from service role secret) ----

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing encryption secret");
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${b64(iv)}:${b64(ct)}`;
}

export async function decryptToken(payload: string): Promise<string> {
  const [ivStr, ctStr] = payload.split(":");
  if (!ivStr || !ctStr) throw new Error("Bad token payload");
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivStr) as BufferSource },
    key,
    fromB64(ctStr) as BufferSource,
  );
  return new TextDecoder().decode(pt);
}

// --- Shopify API client -------------------------------------------------

const API_VERSION = "2024-01";

export function normaliseShopDomain(raw: string): string {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!d.includes(".")) d = `${d}.myshopify.com`;
  return d;
}

async function shopifyFetch(
  shop: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}${path}`, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

export async function testShopifyConnection(
  shop: string,
  token: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  try {
    const res = await shopifyFetch(shop, token, "/shop.json");
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Shopify ${res.status}: ${txt.slice(0, 200)}` };
    }
    const json = (await res.json()) as { shop?: { name?: string } };
    return { ok: true, name: json.shop?.name ?? shop };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- Stone -> Shopify product formatting --------------------------------

type StoneRow = {
  id: string;
  stone_type: string;
  shape: string | null;
  carat_weight: number | null;
  colour_grade: string | null;
  clarity_grade: string | null;
  cut_grade: string | null;
  origin: string | null;
  country_of_origin: string | null;
  treatment: string | null;
  cert_lab: string | null;
  cert_number: string | null;
  measurements_length: number | null;
  measurements_width: number | null;
  measurements_height: number | null;
  fluorescence: string | null;
  polish: string | null;
  symmetry: string | null;
  notes_for_buyers: string | null;
  wholesale_price_usd: number | null;
  status: string;
};

type StoneImageRow = { stone_id: string; storage_url: string; external_image_url: string | null; is_primary: boolean; sort_order: number };

function titleFor(s: StoneRow): string {
  const ct = s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : "";
  const shape = s.shape ? `${cap(s.shape)} ` : "";
  const cert = s.cert_lab ? ` — ${s.cert_lab.toUpperCase()} Certified` : "";
  return `${ct}${shape}${cap(s.stone_type)}${cert}`.trim();
}

function cap(s: string | null): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function bodyHtml(s: StoneRow): string {
  const rows: [string, string | null][] = [
    ["Stone type", cap(s.stone_type)],
    ["Shape", cap(s.shape)],
    ["Carat weight", s.carat_weight ? `${Number(s.carat_weight).toFixed(2)} ct` : null],
    ["Colour grade", s.colour_grade],
    ["Clarity grade", s.clarity_grade],
    ["Cut grade", s.cut_grade],
    ["Polish", s.polish],
    ["Symmetry", s.symmetry],
    ["Fluorescence", s.fluorescence],
    ["Origin", s.origin || s.country_of_origin],
    ["Treatment", s.treatment],
    [
      "Measurements",
      s.measurements_length && s.measurements_width
        ? `${s.measurements_length} × ${s.measurements_width}${s.measurements_height ? ` × ${s.measurements_height}` : ""} mm`
        : null,
    ],
    ["Certification", s.cert_lab ? `${s.cert_lab.toUpperCase()}${s.cert_number ? ` #${s.cert_number}` : ""}` : null],
  ].filter(([, v]) => v) as [string, string][];

  const tableRows = rows
    .map(([k, v]) => `<tr><th style="text-align:left;padding:4px 12px 4px 0;">${k}</th><td>${v}</td></tr>`)
    .join("");

  const notes = s.notes_for_buyers
    ? `<p>${escapeHtml(s.notes_for_buyers)}</p>`
    : "";

  return `${notes}<table>${tableRows}</table><p><small>Sourced via Chaos Gemstones.</small></p>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildProductPayload(
  s: StoneRow,
  images: StoneImageRow[],
  retailPrice: number | null,
) {
  return {
    product: {
      title: titleFor(s),
      body_html: bodyHtml(s),
      vendor: "Chaos Gemstones",
      product_type: cap(s.stone_type),
      tags: [s.shape, s.origin || s.country_of_origin, s.cert_lab, s.treatment]
        .filter(Boolean)
        .map((t) => String(t))
        .join(", "),
      status: "active",
      images: images
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
        .slice(0, 10)
        .map((img) => ({ src: img.external_image_url || img.storage_url })),
      variants: [
        {
          price: retailPrice ? retailPrice.toFixed(2) : "0.00",
          inventory_management: null,
          sku: `CHAOS-${s.id.slice(0, 8).toUpperCase()}`,
          requires_shipping: true,
          taxable: true,
        },
      ],
      metafields: [
        {
          namespace: "chaos",
          key: "stone_id",
          type: "single_line_text_field",
          value: s.id,
        },
      ],
    },
  };
}

// --- Sync ---------------------------------------------------------------

export type SyncResult = {
  added: number;
  updated: number;
  archived: number;
  errors: string[];
};

export async function runShopifySync(jewellerId: string): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, archived: 0, errors: [] };

  const { data: log } = await supabaseAdmin
    .from("shopify_sync_logs")
    .insert({ jeweller_id: jewellerId, status: "running" })
    .select("id")
    .single();
  const logId = log?.id;

  try {
    const { data: conn } = await supabaseAdmin
      .from("shopify_connections")
      .select("shop_domain, access_token, is_active")
      .eq("jeweller_id", jewellerId)
      .maybeSingle();

    if (!conn || !conn.is_active) throw new Error("Shopify is not connected.");
    const token = await decryptToken(conn.access_token);
    const shop = conn.shop_domain;

    // Fetch jeweller markup + feed selections
    const [{ data: jp }, { data: sels }] = await Promise.all([
      supabaseAdmin
        .from("jeweller_profiles")
        .select("markup_global")
        .eq("id", jewellerId)
        .maybeSingle(),
      supabaseAdmin
        .from("feed_selections")
        .select("selection_type, dealer_id, stone_id, markup_override")
        .eq("api_key_id", await activeApiKeyIdFor(jewellerId)),
    ]);

    const globalMarkup = Number(jp?.markup_global ?? 2);
    const follows = (sels ?? []).filter((s: any) => s.selection_type === "dealer_follow");
    const pins = (sels ?? []).filter((s: any) => s.selection_type === "stone_pin");

    const stoneFields =
      "id, stone_type, shape, carat_weight, colour_grade, clarity_grade, cut_grade, origin, country_of_origin, treatment, cert_lab, cert_number, measurements_length, measurements_width, measurements_height, fluorescence, polish, symmetry, notes_for_buyers, wholesale_price_usd, status, dealer_id";

    type FedStone = StoneRow & { dealer_id: string; markup: number };
    const stoneMap = new Map<string, FedStone>();

    if (follows.length) {
      const { data } = await supabaseAdmin
        .from("stones")
        .select(stoneFields)
        .in("dealer_id", follows.map((f: any) => f.dealer_id as string))
        .eq("status", "available");
      for (const s of data ?? []) {
        const ovr = follows.find((f: any) => f.dealer_id === (s as any).dealer_id)?.markup_override;
        stoneMap.set((s as any).id, { ...(s as any), markup: ovr != null ? Number(ovr) : globalMarkup });
      }
    }
    if (pins.length) {
      const { data } = await supabaseAdmin
        .from("stones")
        .select(stoneFields)
        .in("id", pins.map((p: any) => p.stone_id as string))
        .eq("status", "available");
      for (const s of data ?? []) {
        const ovr = pins.find((p: any) => p.stone_id === (s as any).id)?.markup_override;
        if (!stoneMap.has((s as any).id)) {
          stoneMap.set((s as any).id, { ...(s as any), markup: ovr != null ? Number(ovr) : globalMarkup });
        }
      }
    }

    const stones = Array.from(stoneMap.values());

    // Images
    const imagesByStone = new Map<string, StoneImageRow[]>();
    if (stones.length) {
      const { data: imgs } = await supabaseAdmin
        .from("stone_images")
        .select("stone_id, storage_url, external_image_url, is_primary, sort_order")
        .in(
          "stone_id",
          stones.map((s) => s.id),
        );
      for (const img of imgs ?? []) {
        const arr = imagesByStone.get(img.stone_id) ?? [];
        arr.push(img as StoneImageRow);
        imagesByStone.set(img.stone_id, arr);
      }
    }

    // Existing maps for this jeweller
    const { data: existing } = await supabaseAdmin
      .from("shopify_product_map")
      .select("stone_id, shopify_product_id, shopify_product_status")
      .eq("jeweller_id", jewellerId);
    const existingMap = new Map<string, { id: string; status: string }>();
    for (const e of existing ?? []) {
      existingMap.set(e.stone_id, { id: e.shopify_product_id, status: e.shopify_product_status });
    }

    const currentIds = new Set(stones.map((s) => s.id));

    // Upsert each stone
    for (const s of stones) {
      const retail = s.wholesale_price_usd ? Number(s.wholesale_price_usd) * s.markup : null;
      const images = imagesByStone.get(s.id) ?? [];
      const payload = buildProductPayload(s, images, retail);
      const existingEntry = existingMap.get(s.id);

      try {
        if (existingEntry) {
          const res = await shopifyFetch(
            shop,
            token,
            `/products/${existingEntry.id}.json`,
            { method: "PUT", body: JSON.stringify({ product: { id: existingEntry.id, ...payload.product, status: "active" } }) },
          );
          if (!res.ok) {
            result.errors.push(`Update ${s.id}: ${res.status}`);
            continue;
          }
          await supabaseAdmin
            .from("shopify_product_map")
            .update({ shopify_product_status: "active", last_synced_at: new Date().toISOString() })
            .eq("jeweller_id", jewellerId)
            .eq("stone_id", s.id);
          result.updated++;
        } else {
          const res = await shopifyFetch(shop, token, "/products.json", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const t = await res.text();
            result.errors.push(`Create ${s.id}: ${res.status} ${t.slice(0, 120)}`);
            continue;
          }
          const body = (await res.json()) as { product?: { id?: number | string; handle?: string } };
          const pid = body.product?.id ? String(body.product.id) : null;
          if (pid) {
            await supabaseAdmin.from("shopify_product_map").insert({
              jeweller_id: jewellerId,
              stone_id: s.id,
              shopify_product_id: pid,
              shopify_handle: body.product?.handle ?? null,
              shopify_product_status: "active",
              last_synced_at: new Date().toISOString(),
            });
            result.added++;
          }
        }
      } catch (e) {
        result.errors.push(`Stone ${s.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Archive products whose stones are no longer in the feed (or sold)
    for (const [stoneId, entry] of existingMap.entries()) {
      if (currentIds.has(stoneId)) continue;
      if (entry.status === "draft") continue;
      try {
        const res = await shopifyFetch(shop, token, `/products/${entry.id}.json`, {
          method: "PUT",
          body: JSON.stringify({ product: { id: entry.id, status: "draft" } }),
        });
        if (res.ok) {
          await supabaseAdmin
            .from("shopify_product_map")
            .update({ shopify_product_status: "draft", last_synced_at: new Date().toISOString() })
            .eq("jeweller_id", jewellerId)
            .eq("stone_id", stoneId);
          result.archived++;
        }
      } catch (e) {
        result.errors.push(`Archive ${stoneId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await supabaseAdmin
      .from("shopify_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: result.errors.length ? "partial" : "ok",
        products_synced: stones.length,
      })
      .eq("jeweller_id", jewellerId);

    if (logId) {
      await supabaseAdmin
        .from("shopify_sync_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: result.errors.length ? "partial" : "ok",
          stones_added: result.added,
          stones_updated: result.updated,
          stones_archived: result.archived,
          error_message: result.errors.slice(0, 5).join(" | ") || null,
        })
        .eq("id", logId);
    }

    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (logId) {
      await supabaseAdmin
        .from("shopify_sync_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: "error",
          error_message: msg,
        })
        .eq("id", logId);
    }
    await supabaseAdmin
      .from("shopify_connections")
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: "error" })
      .eq("jeweller_id", jewellerId);
    throw e;
  }
}

async function activeApiKeyIdFor(jewellerId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("id")
    .eq("jeweller_id", jewellerId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? "00000000-0000-0000-0000-000000000000";
}