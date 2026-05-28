import { supabase } from "@/integrations/supabase/client";

const KEY = "chaos_ref_code";

export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) sessionStorage.setItem(KEY, ref.toUpperCase());
}

export function getStoredRef(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function clearStoredRef() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export async function applyStoredRefForUser(userId: string) {
  const code = getStoredRef();
  if (!code) return;
  try {
    await supabase.rpc("apply_referral_code", { _user_id: userId, _code: code });
  } catch (e) {
    console.warn("apply_referral_code failed", e);
  }
  clearStoredRef();
}