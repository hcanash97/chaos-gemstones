// Role helpers. Works on any profile-ish object that exposes account_type
// and the new account_types array. Safe to import from both client and
// server code — it has no DOM or Supabase dependencies.

export type RoleProfile = {
  account_type?: string | null;
  account_types?: string[] | null;
} | null | undefined;

function has(profile: RoleProfile, role: "dealer" | "jeweller" | "admin"): boolean {
  if (!profile) return false;
  if (profile.account_type === role) return true;
  if (Array.isArray(profile.account_types) && profile.account_types.includes(role)) return true;
  return false;
}

export function isDealer(profile: RoleProfile): boolean {
  return has(profile, "dealer");
}

export function isJeweller(profile: RoleProfile): boolean {
  return has(profile, "jeweller");
}

export function isAdmin(profile: RoleProfile): boolean {
  return has(profile, "admin");
}

export function isDualRole(profile: RoleProfile): boolean {
  return isDealer(profile) && isJeweller(profile);
}

/**
 * Returns the role-set as an array, deduped. Useful for admin UIs.
 */
export function roleList(profile: RoleProfile): string[] {
  if (!profile) return [];
  const out = new Set<string>();
  if (profile.account_type) out.add(profile.account_type);
  for (const r of profile.account_types ?? []) out.add(r);
  return Array.from(out);
}

/**
 * Where should this user land when they click "Dashboard"? Dealers (incl.
 * dual-role) default to the dealer dashboard; pure jewellers go to the
 * jeweller dashboard.
 */
export function defaultDashboardPath(profile: RoleProfile): "/dashboard" | "/dashboard/jeweller" {
  if (isDealer(profile)) return "/dashboard";
  if (isJeweller(profile)) return "/dashboard/jeweller";
  return "/dashboard";
}