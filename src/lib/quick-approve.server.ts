// HMAC-SHA256 signed tokens for the one-click admin quick-approve flow.
// Token format: base64url(userId.expiresAt).base64url(signature)

import { createHmac, timingSafeEqual } from "crypto";

const TTL_HOURS = 72;

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function secret(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("Missing service role key for token signing.");
  return k;
}

export async function quickApproveSign(userId: string): Promise<string> {
  const expiresAt = Date.now() + TTL_HOURS * 3600 * 1000;
  const payload = `${userId}.${expiresAt}`;
  const sig = createHmac("sha256", secret()).update(payload).digest();
  return `${b64url(payload)}.${b64url(sig)}`;
}

export async function quickApproveVerify(token: string): Promise<string> {
  const [pPart, sPart] = token.split(".");
  if (!pPart || !sPart) throw new Error("Malformed token.");
  const payload = b64urlDecode(pPart).toString("utf8");
  const sig = b64urlDecode(sPart);
  const expected = createHmac("sha256", secret()).update(payload).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    throw new Error("Invalid signature.");
  }
  const [userId, expiresAtStr] = payload.split(".");
  if (!userId || !expiresAtStr) throw new Error("Malformed payload.");
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) throw new Error("Token expired.");
  return userId;
}