import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DealerKeyContext = {
  apiKeyId: string;
  dealerId: string;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...extraHeaders },
  });
}

// Best-effort, per-worker in-memory rate limiter.
// NOTE: Cloudflare Workers run as many isolated instances; this limiter is
// approximate and resets on cold start. It is documented as such in the API
// docs page. A persistent limiter is out of scope for this iteration.
const RATE_LIMIT_PER_MIN = 120;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(keyId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(keyId);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(keyId, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }
  if (bucket.count >= RATE_LIMIT_PER_MIN) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true };
}

/**
 * Authenticate a request via `Authorization: Bearer <key>` header.
 * Returns either a successful `DealerKeyContext` or a Response to return.
 */
export async function authenticateDealer(request: Request): Promise<
  | { ok: true; ctx: DealerKeyContext }
  | { ok: false; response: Response }
> {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: json({ error: "Missing Authorization Bearer token" }, 401) };
  }
  const raw = header.slice(7).trim();
  if (!raw) return { ok: false, response: json({ error: "Empty API key" }, 401) };

  const keyHash = createHash("sha256").update(raw).digest("hex");
  const { data: apiKey } = await supabaseAdmin
    .from("api_keys")
    .select("id, jeweller_id, is_active, key_type")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!apiKey || !apiKey.is_active) {
    return { ok: false, response: json({ error: "Invalid or inactive API key" }, 401) };
  }
  if (apiKey.key_type !== "write") {
    return { ok: false, response: json({ error: "This endpoint requires a write API key" }, 401) };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("account_type, account_types, is_approved")
    .eq("id", apiKey.jeweller_id)
    .maybeSingle();

  const isDealer =
    profile &&
    (profile.account_type === "dealer" ||
      (Array.isArray((profile as any).account_types) &&
        (profile as any).account_types.includes("dealer")));
  if (!isDealer) {
    return { ok: false, response: json({ error: "API key is not associated with a dealer account" }, 403) };
  }
  if (!profile!.is_approved) {
    return { ok: false, response: json({ error: "Dealer account is not approved" }, 403) };
  }

  // Rate limit
  const rl = rateLimit(apiKey.id);
  if (!rl.ok) {
    return {
      ok: false,
      response: json(
        { error: "Rate limit exceeded", retry_after: rl.retryAfter },
        429,
        { "Retry-After": String(rl.retryAfter) },
      ),
    };
  }

  // Fire-and-forget last_used_at
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  return { ok: true, ctx: { apiKeyId: apiKey.id, dealerId: apiKey.jeweller_id } };
}