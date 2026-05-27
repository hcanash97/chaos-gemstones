import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "dealer" | "jeweller" | "admin";
  company_name: string | null;
  country: string | null;
  is_approved: boolean;
  is_verified: boolean;
  created_at: string;
};

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login", replace: true }); return; }
    if (!isAdmin) { navigate({ to: "/", replace: true }); }
  }, [loading, user, isAdmin, navigate]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setError(null);
    let query = supabase
      .from("profiles")
      .select("id, email, full_name, account_type, company_name, country, is_approved, is_verified, created_at")
      .order("created_at", { ascending: false });
    if (tab === "pending") query = query.eq("is_approved", false);
    const { data, error } = await query;
    if (error) { setError(error.message); return; }
    setRows((data as ProfileRow[]) ?? []);
  }, [isAdmin, tab]);

  useEffect(() => { load(); }, [load]);

  async function setApproval(id: string, value: boolean) {
    setBusy(id);
    const { error } = await supabase.from("profiles").update({ is_approved: value }).eq("id", id);
    setBusy(null);
    if (error) { setError(error.message); return; }
    if (tab === "pending" && value) setRows((r) => r.filter((p) => p.id !== id));
    else setRows((r) => r.map((p) => (p.id === id ? { ...p, is_approved: value } : p)));
  }

  async function setVerified(id: string, value: boolean) {
    setBusy(id);
    const { error } = await supabase.from("profiles").update({ is_verified: value }).eq("id", id);
    setBusy(null);
    if (error) { setError(error.message); return; }
    setRows((r) => r.map((p) => (p.id === id ? { ...p, is_verified: value } : p)));
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) return null;

  const pendingCount = tab === "pending" ? rows.length : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-serif text-2xl italic font-medium tracking-tight">Chaos</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-gold-foreground)]">
              Admin
            </span>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Account approvals</h1>
            <p className="text-sm text-muted-foreground">
              Approve new dealers and jewellers so they can access their dashboards.
            </p>
          </div>
          <div className="flex gap-1 rounded-md border border-border p-1 text-sm">
            <button
              onClick={() => setTab("pending")}
              className={`rounded px-3 py-1 ${tab === "pending" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Pending{pendingCount !== null ? ` (${pendingCount})` : ""}
            </button>
            <button
              onClick={() => setTab("all")}
              className={`rounded px-3 py-1 ${tab === "all" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              All accounts
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {tab === "pending" ? "No accounts awaiting approval." : "No accounts yet."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{r.account_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.company_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.country || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs ${
                          r.is_approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {r.is_approved ? "Approved" : "Pending"}
                        </span>
                        {r.is_verified && (
                          <span className="inline-flex w-fit items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                            Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!r.is_approved ? (
                        <Button
                          size="sm"
                          disabled={busy === r.id}
                          onClick={() => setApproval(r.id, true)}
                          className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
                        >
                          Approve
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === r.id}
                          onClick={() => setApproval(r.id, false)}
                          className="text-destructive"
                        >
                          Suspend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === r.id}
                        onClick={() => setVerified(r.id, !r.is_verified)}
                      >
                        {r.is_verified ? "Unverify" : "Verify"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}