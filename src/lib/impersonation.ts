// Client-only impersonation helper. Persists in sessionStorage so the
// flag dies when the tab closes (safer than localStorage).

const KEY = "chaos_impersonating";

export type ImpersonationState = {
  userId: string;
  userName: string;
};

export function getImpersonation(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    return null;
  }
}

export function setImpersonation(state: ImpersonationState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(state));
  // Fire a storage-like event so listeners in the same tab can react.
  window.dispatchEvent(new CustomEvent("chaos:impersonation-changed"));
}

export function clearImpersonation() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("chaos:impersonation-changed"));
}

export function onImpersonationChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("chaos:impersonation-changed", handler);
  return () => window.removeEventListener("chaos:impersonation-changed", handler);
}