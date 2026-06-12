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

const API_VERSION = "2025-10";

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

// --- Authorization Code Grant (production stores) -----------------------
// client_credentials only works with dev stores in the same Shopify org.
// For a production store like aviediamonds.myshopify.com, the correct flow
// is the Authorization Code Grant:
//   1. Redirect user to Shopify's OAuth authorize URL
//   2. User approves on Shopify → Shopify redirects back with ?code=
//   3. Exchange code for a permanent offline token (shpat_)
//   4. Store encrypted — this token never expires
//
// The exchange POST goes to the per-store endpoint, NOT api.shopify.com.
// This is standard OAuth and is NOT blocked by Cloudflare (that 403 was
// specific to client_credentials on the old endpoint).

export type ShopifyConnectionRow = {
  id: string;
  shop_domain: string;
  client_id: string | null;
  encrypted_client_secret: string | null;
  encrypted_access_token: string | null;
  token_expires_at: string | null;
};

const REQUIRED_SCOPES = [
  "read_products", "write_products",
  "read_orders",
  "read_inventory", "write_inventory",
].join(",");

/** Step 1: Build the Shopify OAuth authorize URL to redirect the user to. */
export function buildAuthorizeUrl(
  shop: string,
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: REQUIRED_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/** Step 2: Exchange the authorization code for a permanent offline token. */
export async function exchangeCodeForToken(
  shop: string,
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Shopify code exchange failed (${res.status}): ${text.slice(0, 300)}`);
  }
  let json: { access_token?: string };
  try { json = JSON.parse(text); }
  catch { throw new Error(`Shopify returned non-JSON: ${text.slice(0, 200)}`); }
  if (!json.access_token) throw new Error("No access_token in Shopify response.");
  return json.access_token;
}

/** Kept for compatibility — returns the stored permanent token directly. */
export async function getValidAccessToken(conn: ShopifyConnectionRow): Promise<string> {
  if (!conn.encrypted_access_token) {
    throw new Error("No access token stored — please reconnect your Shopify store.");
  }
  return decryptToken(conn.encrypted_access_token);
}

/** mintAccessToken shim — kept so existing code compiles. */
export async function mintAccessToken(
  _shop: string,
  _clientId: string,
  _secret: string,
): Promise<{ token: string; expiresAt: string }> {
  throw new Error("Use the OAuth flow to connect a production store.");
}

// --- Stone -> Shopify product formatting --------------------------------

type StoneRow = {
  id: string;
  stone_type: string;
  shape: string | null;
  carat_weight: number | null;
  colour_grade: string | null;
  colour_hue: string | null;
  colour_tone: string | null;
  colour_saturation: string | null;
  clarity_grade: string | null;
  cut_grade: string | null;
  origin: string | null;
  country_of_origin: string | null;
  treatment: string | null;
  cert_lab: string | null;
  cert_number: string | null;
  cert_url: string | null;
  measurements_length: number | null;
  measurements_width: number | null;
  measurements_height: number | null;
  depth_pct: number | null;
  table_pct: number | null;
  lw_ratio: number | null;
  girdle: string | null;
  culet_size: string | null;
  fluorescence: string | null;
  fluorescence_colour: string | null;
  polish: string | null;
  symmetry: string | null;
  eye_clean: string | null;
  has_video: boolean;
  video_url: string | null;
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

// ── Helpers for À Vie metafield mapping ──────────────────────────────────────

/** Derive diamond_colour_type from stone data.
 *  White = colourless/near-colourless. Fancy = naturally coloured. Treated = colour-enhanced. */
function colourType(s: StoneRow): "White" | "Fancy" | "Treated" | null {
  if (s.stone_type?.toLowerCase() !== "diamond") return null;
  const treatment = (s.treatment ?? "").toLowerCase();
  if (treatment.includes("treated") || treatment.includes("irrad") ||
      treatment.includes("hpht") || treatment.includes("coating")) return "Treated";
  if (s.colour_hue) return "Fancy";
  return "White";
}

/** Combine fluorescence + fluorescence_colour into À Vie's intensity format.
 *  e.g. "Medium" + "Blue" → "Medium Blue". "None" → "None". */
function fluorescenceIntensity(s: StoneRow): string | null {
  const intensity = s.fluorescence?.trim();
  if (!intensity) return null;
  if (intensity.toLowerCase() === "none" || intensity.toLowerCase() === "nil") return "None";
  const colour = s.fluorescence_colour?.trim();
  if (colour) return `${cap(intensity)} ${cap(colour)}`;
  return cap(intensity);
}

/** Map carat weight to À Vie's bucket format. */
function caratRange(ct: number | null): string | null {
  if (!ct) return null;
  if (ct < 0.30) return "0.00–0.29";
  if (ct < 0.40) return "0.30–0.39";
  if (ct < 0.50) return "0.40–0.49";
  if (ct < 0.60) return "0.50–0.59";
  if (ct < 0.70) return "0.60–0.69";
  if (ct < 0.80) return "0.70–0.79";
  if (ct < 0.90) return "0.80–0.89";
  if (ct < 1.00) return "0.90–0.99";
  if (ct < 1.50) return "1.00–1.49";
  if (ct < 2.00) return "1.50–1.99";
  if (ct < 3.00) return "2.00–2.99";
  if (ct < 4.00) return "3.00–3.99";
  if (ct < 5.00) return "4.00–4.99";
  if (ct < 6.00) return "5.00–5.99";
  if (ct < 10.00) return "6.00–9.99";
  return "10.00+";
}

/** Whether the origin indicates lab-grown. */
function isLabGrown(s: StoneRow): boolean {
  const o = (s.origin ?? s.country_of_origin ?? "").toLowerCase();
  return o.includes("lab") || o.includes("cvd") || o.includes("hpht") || o.includes("synthetic");
}

/** Build a single metafield object — skip if value is null/empty. */
function mf(
  key: string,
  value: string | number | boolean | null | undefined,
  type: string = "single_line_text_field",
): { namespace: string; key: string; type: string; value: string } | null {
  if (value === null || value === undefined || value === "") return null;
  return { namespace: "custom", key, type, value: String(value) };
}

function buildProductPayload(
  s: StoneRow,
  images: StoneImageRow[],
  retailPrice: number | null,
) {
  const isDiamond = s.stone_type?.toLowerCase() === "diamond";
  const labGrown = isLabGrown(s);
  const ct = colourType(s);
  const measurements = s.measurements_length && s.measurements_width
    ? `${s.measurements_length} × ${s.measurements_width}${s.measurements_height ? ` × ${s.measurements_height}` : ""} mm`
    : null;

  // ── Tags ───────────────────────────────────────────────────────────────────
  // Normalise to lowercase-hyphenated so they match À Vie's collection conditions.
  const tagSet = new Set<string>();

  // Shape (e.g. "round", "oval") — used for shape filter & future smart collections
  if (s.shape) tagSet.add(s.shape.toLowerCase().replace(/\s+/g, "-"));

  // Origin: these drive the existing smart collections
  if (labGrown) {
    tagSet.add("lab-grown");
    tagSet.add("lab");
  } else {
    tagSet.add("natural");
  }

  // Colour type — drives "fancy-colour" collection
  if (ct === "Fancy") tagSet.add("fancy-colour");
  if (ct === "Treated") tagSet.add("treated-colour");

  // Cert lab (e.g. "gia", "igi")
  if (s.cert_lab) tagSet.add(s.cert_lab.toLowerCase());

  // Treatment (e.g. "unheated")
  if (s.treatment) tagSet.add(s.treatment.toLowerCase().replace(/\s+/g, "-"));

  // Chaos source tag for easy identification
  tagSet.add("chaos-sync");

  // ── Metafields: full À Vie diamond grading schema ─────────────────────────
  const metafields = [
    // Core grading
    mf("diamond_shape",          cap(s.shape)),
    mf("diamond_carat",          s.carat_weight?.toFixed(2), "number_decimal"),
    mf("diamond_carat_range",    caratRange(s.carat_weight)),
    mf("diamond_colour_type",    ct),
    // White diamond colour (D–M scale)
    ct === "White" ? mf("diamond_colour", s.colour_grade?.toUpperCase()) : null,
    mf("diamond_clarity",        s.clarity_grade?.toUpperCase()),
    mf("diamond_cut_grade",      cap(s.cut_grade)),
    // Polish / symmetry / fluorescence
    mf("diamond_polish",         cap(s.polish)),
    mf("diamond_symmetry",       cap(s.symmetry)),
    mf("diamond_fluorescence_intensity", fluorescenceIntensity(s)),
    // Fancy colour fields
    ct === "Fancy" ? mf("fancy_colour_hue",       cap(s.colour_hue)) : null,
    ct === "Fancy" ? mf("fancy_colour_intensity",  cap(s.colour_tone)) : null,
    // Treated colour
    ct === "Treated" ? mf("treated_colour_hue",   cap(s.colour_hue)) : null,
    // Measurements
    mf("diamond_measurements",   measurements),
    mf("diamond_depth",          s.depth_pct, "number_decimal"),
    mf("diamond_table",          s.table_pct, "number_decimal"),
    mf("diamond_length_to_width_ratio_l_w_ratio", s.lw_ratio, "number_decimal"),
    mf("diamond_girdle",         cap(s.girdle)),
    mf("diamond_cutlet",         cap(s.culet_size)),
    // Certification
    mf("diamond_certification_number", s.cert_number),
    mf("diamond_certification_link_url", s.cert_url, "url"),
    // Recommended additions from the metafield reference
    mf("diamond_origin",         labGrown ? "Lab-grown" : "Natural"),
    mf("diamond_certificate_lab", s.cert_lab?.toUpperCase()),
    mf("eye_clean",              s.eye_clean === "yes" || s.eye_clean === "true" ? "true" : null, "boolean"),
    mf("diamond_video_url",      s.has_video && s.video_url ? s.video_url : null, "url"),
    // Chaos internal reference
    { namespace: "chaos", key: "stone_id", type: "single_line_text_field", value: s.id },
  ].filter(Boolean) as { namespace: string; key: string; type: string; value: string }[];

  return {
    product: {
      title: titleFor(s),
      body_html: bodyHtml(s),
      vendor: "À Vie Diamonds",
      product_type: cap(s.stone_type),
      tags: [...tagSet].join(", "),
      status: "active",
      images: images
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
        .slice(0, 10)
        .map((img) => ({ src: img.external_image_url || img.storage_url }))
        .filter((i) => i.src),
      variants: [
        {
          price: retailPrice ? retailPrice.toFixed(2) : "0.00",
          inventory_management: null,
          sku: `AV-CHAOS-${s.id.slice(0, 8).toUpperCase()}`,
          requires_shipping: true,
          taxable: true,
        },
      ],
      metafields,
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

function shopifyErrorManifest(errors: string[]) {
  return errors.slice(0, 100).map((message, index) => ({
    index: index + 1,
    message,
  }));
}

export async function runShopifySync(jewellerId: string): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, archived: 0, errors: [] };
  const syncSessionId = crypto.randomUUID();

  const { data: log } = await supabaseAdmin
    .from("shopify_sync_logs")
    .insert({
      jeweller_id: jewellerId,
      status: "in_progress",
      sync_session_id: syncSessionId,
      triggered_by: "manual_btn",
    } as never)
    .select("id")
    .single();
  const logId = log?.id;

  try {
    const { data: conn } = await supabaseAdmin
      .from("shopify_connections")
      .select("id, shop_domain, client_id, encrypted_client_secret, encrypted_access_token, token_expires_at, is_active")
      .eq("jeweller_id", jewellerId)
      .maybeSingle();

    if (!conn || !conn.is_active) throw new Error("Shopify is not connected.");
    const token = await getValidAccessToken(conn as ShopifyConnectionRow);
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
      "id, stone_type, shape, carat_weight, colour_grade, clarity_grade, cut_grade, " +
      "colour_hue, colour_tone, colour_saturation, " +
      "origin, country_of_origin, treatment, " +
      "cert_lab, cert_number, cert_url, " +
      "measurements_length, measurements_width, measurements_height, " +
      "depth_pct, table_pct, lw_ratio, girdle, culet_size, " +
      "fluorescence, fluorescence_colour, " +
      "polish, symmetry, eye_clean, has_video, video_url, " +
      "notes_for_buyers, wholesale_price_usd, status, dealer_id";

    type FedStone = StoneRow & { dealer_id: string; markup: number };
    const stoneMap = new Map<string, FedStone>();

    if (follows.length) {
      const { data } = await supabaseAdmin
        .from("stones")
        .select(stoneFields)
        .in("dealer_id", follows.map((f: any) => f.dealer_id as string))
        .eq("status", "available")
        .eq("feed_inactive", false);
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
        .eq("status", "available")
        .eq("feed_inactive", false);
      for (const s of data ?? []) {
        const ovr = pins.find((p: any) => p.stone_id === (s as any).id)?.markup_override;
        if (!stoneMap.has((s as any).id)) {
          stoneMap.set((s as any).id, { ...(s as any), markup: ovr != null ? Number(ovr) : globalMarkup });
        }
      }
    }

    const stones = Array.from(stoneMap.values());
    console.log(`[shopify] Sync starting for shop: ${shop}, feed stones: ${stones.length}`);

    if (logId) {
      await supabaseAdmin
        .from("shopify_sync_logs")
        .update({ total_stones_detected: stones.length } as never)
        .eq("id", logId);
    }

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

    // Upsert each stone through a deliberately slow queue. Product writes with
    // images/metafields are expensive enough that large bursts can hit Shopify's
    // leaky-bucket throttle even when individual requests look small.
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const CHUNK = 1;
    const WRITE_DELAY_MS = 750;

    for (let i = 0; i < stones.length; i += CHUNK) {
      const chunk = stones.slice(i, i + CHUNK);

      for (const s of chunk) {
        const retail = s.wholesale_price_usd ? Number(s.wholesale_price_usd) * s.markup : null;
        const images = imagesByStone.get(s.id) ?? [];
        const payload = buildProductPayload(s, images, retail);
        const existingEntry = existingMap.get(s.id);

        try {
          if (existingEntry) {
            const res = await shopifyFetch(
              shop, token, `/products/${existingEntry.id}.json`,
              { method: "PUT", body: JSON.stringify({ product: { id: existingEntry.id, ...payload.product, status: "active" } }) },
            );
            // Back off and retry once on rate limit
            if (res.status === 429) {
              const wait = Number(res.headers.get("Retry-After") ?? "2") * 1000;
              await sleep(wait);
              const retry = await shopifyFetch(shop, token, `/products/${existingEntry.id}.json`,
                { method: "PUT", body: JSON.stringify({ product: { id: existingEntry.id, ...payload.product, status: "active" } }) });
              if (!retry.ok) {
                const t = await retry.text();
                result.errors.push(`Update ${s.id}: ${retry.status} ${t.slice(0, 160)}`);
                continue;
              }
            } else if (!res.ok) {
              const t = await res.text();
              result.errors.push(`Update ${s.id}: ${res.status} ${t.slice(0, 160)}`);
              continue;
            }
            await supabaseAdmin
              .from("shopify_product_map")
              .update({ shopify_product_status: "active", last_synced_at: new Date().toISOString() })
              .eq("jeweller_id", jewellerId).eq("stone_id", s.id);
            result.updated++;
          } else {
            const res = await shopifyFetch(shop, token, "/products.json", {
              method: "POST", body: JSON.stringify(payload),
            });
            if (res.status === 429) {
              const wait = Number(res.headers.get("Retry-After") ?? "2") * 1000;
              await sleep(wait);
              const retry = await shopifyFetch(shop, token, "/products.json",
                { method: "POST", body: JSON.stringify(payload) });
              if (!retry.ok) {
                const t = await retry.text();
                result.errors.push(`Create ${s.id}: ${retry.status} ${t.slice(0, 120)}`); continue;
              }
              const body2 = (await retry.json()) as { product?: { id?: number | string; handle?: string } };
              const pid2 = body2.product?.id ? String(body2.product.id) : null;
              if (pid2) {
                await supabaseAdmin.from("shopify_product_map").insert({ jeweller_id: jewellerId, stone_id: s.id, shopify_product_id: pid2, shopify_handle: body2.product?.handle ?? null, shopify_product_status: "active", last_synced_at: new Date().toISOString() });
                result.added++;
              }
              continue;
            }
            if (!res.ok) {
              const t = await res.text();
              result.errors.push(`Create ${s.id}: ${res.status} ${t.slice(0, 120)}`); continue;
            }
            const body = (await res.json()) as { product?: { id?: number | string; handle?: string } };
            const pid = body.product?.id ? String(body.product.id) : null;
            if (pid) {
              await supabaseAdmin.from("shopify_product_map").insert({ jeweller_id: jewellerId, stone_id: s.id, shopify_product_id: pid, shopify_handle: body.product?.handle ?? null, shopify_product_status: "active", last_synced_at: new Date().toISOString() });
              result.added++;
            }
          }
        } catch (e) {
          result.errors.push(`Stone ${s.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // Inter-batch pause — let the Shopify rate limit bucket recover
      if (i + CHUNK < stones.length) await sleep(WRITE_DELAY_MS);
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
        last_sync_status: result.errors.length ? "failed_partial" : "completed",
        products_synced: stones.length,
      })
      .eq("jeweller_id", jewellerId);

    if (logId) {
      await supabaseAdmin
        .from("shopify_sync_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: result.errors.length ? "failed_partial" : "completed",
          stones_added_successfully: result.added,
          stones_updated_successfully: result.updated,
          stones_failed_count: result.errors.length,
          error_manifest: shopifyErrorManifest(result.errors),
          error_message: result.errors.slice(0, 5).join(" | ") || null,
        } as never)
        .eq("id", logId);
    }

    console.log(`[shopify] Sync complete: ${result.added} added, ${result.updated} updated, ${result.archived} archived, ${result.errors.length} errors`);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (logId) {
      await supabaseAdmin
        .from("shopify_sync_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed_critical",
          stones_failed_count: 1,
          error_manifest: shopifyErrorManifest([msg]),
          error_message: msg,
        } as never)
        .eq("id", logId);
    }
    await supabaseAdmin
      .from("shopify_connections")
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: "failed_critical" })
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

// --- Test connection (used by dashboard "Test connection" button) -------

export async function testConnectionForJeweller(
  jewellerId: string,
): Promise<
  | { ok: true; shopName: string; productCount: number }
  | { ok: false; error: string }
> {
  const { data: conn } = await supabaseAdmin
    .from("shopify_connections")
    .select("id, shop_domain, client_id, encrypted_client_secret, encrypted_access_token, token_expires_at, is_active")
    .eq("jeweller_id", jewellerId)
    .maybeSingle();
  if (!conn) return { ok: false, error: "No Shopify connection saved." };
  try {
    const token = await getValidAccessToken(conn as ShopifyConnectionRow);
    const shopRes = await shopifyFetch(conn.shop_domain, token, "/shop.json");
    if (!shopRes.ok) {
      const t = await shopRes.text();
      return { ok: false, error: `Shopify ${shopRes.status}: ${t.slice(0, 200)}` };
    }
    const shopJson = (await shopRes.json()) as { shop?: { name?: string } };
    const countRes = await shopifyFetch(conn.shop_domain, token, "/products/count.json");
    let productCount = 0;
    if (countRes.ok) {
      const j = (await countRes.json()) as { count?: number };
      productCount = j.count ?? 0;
    }
    return { ok: true, shopName: shopJson.shop?.name ?? conn.shop_domain, productCount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- Dry-run sync preview ----------------------------------------------

export type DryRunResult = {
  wouldAdd: number;
  wouldUpdate: number;
  wouldArchive: number;
  feedStoneCount: number;
  errors: string[];
};

export async function dryRunShopifySync(jewellerId: string): Promise<DryRunResult> {
  const result: DryRunResult = {
    wouldAdd: 0,
    wouldUpdate: 0,
    wouldArchive: 0,
    feedStoneCount: 0,
    errors: [],
  };
  const { data: conn } = await supabaseAdmin
    .from("shopify_connections")
    .select("id, shop_domain, is_active")
    .eq("jeweller_id", jewellerId)
    .maybeSingle();
  if (!conn || !conn.is_active) {
    result.errors.push("Shopify is not connected.");
    return result;
  }

  const { data: sels } = await supabaseAdmin
    .from("feed_selections")
    .select("selection_type, dealer_id, stone_id")
    .eq("api_key_id", await activeApiKeyIdFor(jewellerId));

  const follows = (sels ?? []).filter((s: any) => s.selection_type === "dealer_follow");
  const pins = (sels ?? []).filter((s: any) => s.selection_type === "stone_pin");

  const stoneIds = new Set<string>();
  if (follows.length) {
    const { data } = await supabaseAdmin
      .from("stones")
      .select("id")
      .in("dealer_id", follows.map((f: any) => f.dealer_id as string))
      .eq("status", "available")
      .eq("feed_inactive", false);
    (data ?? []).forEach((s: any) => stoneIds.add(s.id));
  }
  if (pins.length) {
    const { data } = await supabaseAdmin
      .from("stones")
      .select("id")
      .in("id", pins.map((p: any) => p.stone_id as string))
      .eq("status", "available")
      .eq("feed_inactive", false);
    (data ?? []).forEach((s: any) => stoneIds.add(s.id));
  }

  result.feedStoneCount = stoneIds.size;

  const { data: existing } = await supabaseAdmin
    .from("shopify_product_map")
    .select("stone_id, shopify_product_status")
    .eq("jeweller_id", jewellerId);

  const existingActive = new Set(
    (existing ?? [])
      .filter((e: any) => e.shopify_product_status !== "draft")
      .map((e: any) => e.stone_id as string),
  );
  const existingAll = new Set((existing ?? []).map((e: any) => e.stone_id as string));

  for (const id of stoneIds) {
    if (existingAll.has(id)) result.wouldUpdate++;
    else result.wouldAdd++;
  }
  for (const id of existingActive) {
    if (!stoneIds.has(id)) result.wouldArchive++;
  }
  return result;
}
