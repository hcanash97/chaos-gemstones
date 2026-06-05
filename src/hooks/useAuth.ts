import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "dealer" | "jeweller" | "admin";
  account_types: string[] | null;
  company_name: string | null;
  is_approved: boolean;
  is_verified: boolean;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user!.id), 0);
        setTimeout(() => loadRole(s.user!.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        Promise.all([loadProfile(s.user.id), loadRole(s.user.id)]).finally(() => setLoading(false));
      } else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, account_type, account_types, company_name, is_approved, is_verified")
      .eq("id", uid)
      .maybeSingle();
    if (!data) {
      setProfile(null);
      return;
    }
    // email comes from the auth session (auth.users), not the profiles table,
    // because the email column on profiles is no longer readable client-side.
    const { data: authData } = await supabase.auth.getUser();
    setProfile({ ...(data as Omit<AppProfile, "email">), email: authData.user?.email ?? null });
  }

  async function loadRole(uid: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  }

  return { session, user, profile, isAdmin, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
}