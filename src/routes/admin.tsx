import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [tab, setTab] = useState<"pending" | "all" | "reports" | "fees">("pending");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testCount, setTestCount] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login", replace: true }); return; }
    if (!isAdmin) { navigate({ to: "/", replace: true }); }
  }, [loading, user, isAdmin, navigate]);

  const load = useCallback(async () => {
    if (!isAdmin || tab === "reports" || tab === "fees") return;
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

  const loadTestCount = useCallback(async () => {
    if (!isAdmin) return;
    const { count } = await supabase
      .from("stones")
      .select("id", { count: "exact", head: true })
      .eq("is_test", true);
    setTestCount(count ?? 0);
  }, [isAdmin]);

  useEffect(() => { loadTestCount(); }, [loadTestCount]);

  async function seedTestInventory() {
    if (!user) return;
    setSeeding(true);
    const sample = [
      {
        dealer_id: user.id, is_test: true, stone_type: "Diamond", shape: "Round",
        carat_weight: 1.02, colour_grade: "F", clarity_grade: "VS1", cut_grade: "Excellent",
        polish: "Excellent", symmetry: "Excellent", fluorescence: "None",
        cert_lab: "GIA", cert_number: "TEST-1001", wholesale_price_usd: 6800,
        country_of_origin: "Botswana", status: "available" as const, available_qty: 1,
        notes_for_buyers: "Sample test stone — visible to admin only.",
      },
      {
        dealer_id: user.id, is_test: true, stone_type: "Diamond", shape: "Oval",
        carat_weight: 1.51, colour_grade: "G", clarity_grade: "VVS2", cut_grade: "Excellent",
        polish: "Excellent", symmetry: "Very Good", fluorescence: "Faint",
        cert_lab: "GIA", cert_number: "TEST-1002", wholesale_price_usd: 11200,
        country_of_origin: "Canada", status: "available" as const, available_qty: 1,
      },
      {
        dealer_id: user.id, is_test: true, stone_type: "Sapphire", shape: "Cushion",
        carat_weight: 2.34, colour_hue: "Blue", colour_tone: "Medium", colour_saturation: "Vivid",
        treatment: "Heated", cert_lab: "GRS", cert_number: "TEST-2001",
        country_of_origin: "Sri Lanka", wholesale_price_usd: 4500,
        status: "available" as const, available_qty: 1,
      },
      {
        dealer_id: user.id, is_test: true, stone_type: "Emerald", shape: "Emerald",
        carat_weight: 1.87, colour_hue: "Green", colour_tone: "Medium Dark", colour_saturation: "Strong",
        treatment: "Minor oil", cert_lab: "GUBELIN", cert_number: "TEST-3001",
        country_of_origin: "Colombia", wholesale_price_usd: 9800,
        status: "available" as const, available_qty: 1,
      },
    ];
    const { error } = await supabase.from("stones").insert(sample as any);
    setSeeding(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Seeded ${sample.length} test stones`);
    loadTestCount();
  }

  async function wipeTestInventory() {
    if (!confirm("Delete all test stones? This cannot be undone.")) return;
    setSeeding(true);
    const { error } = await supabase.from("stones").delete().eq("is_test", true);
    setSeeding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Test stones wiped");
    loadTestCount();
  }

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
            <Link to="/admin/import-test" className="mt-2 inline-block text-xs text-primary underline">
              → CSV import sandbox (dry run)
            </Link>
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
            <button
              onClick={() => setTab("reports")}
              className={`rounded px-3 py-1 ${tab === "reports" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Reports
            </button>
            <button
              onClick={() => setTab("fees")}
              className={`rounded px-3 py-1 ${tab === "fees" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Fees
            </button>
          </div>
        </div>

        {tab !== "reports" && tab !== "fees" && (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Test inventory</div>
              <p className="text-xs text-muted-foreground">
                Seed sample stones owned by you, flagged <code>is_test=true</code>. Hidden from the public marketplace — only admins see them. Use for Shopify/API trials.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Current test stones in DB: <strong>{testCount ?? "…"}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={seeding} onClick={seedTestInventory}>
                {seeding ? "Working…" : "Seed test inventory"}
              </Button>
              <Button size="sm" variant="outline" disabled={seeding || !testCount} onClick={wipeTestInventory}>
                Wipe test data
              </Button>
            </div>
          </div>
        </div>
        )}

        {error && (
          <div className="mt-4 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {tab === "reports" ? (
          <ReportsPanel />
        ) : tab === "fees" ? (
          <FeesPanel />
        ) : (
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
        )}
      </div>
    </div>
  );
}

type ReportRow = {
  id: string;
  stone_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter?: { full_name: string | null; email: string | null; company_name: string | null } | null;
  stone?: { stone_type: string; shape: string | null; carat_weight: number | null; dealer_id: string } | null;
};

function ReportsPanel() {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("reports")
      .select(
        "id, stone_id, reporter_id, reason, details, status, created_at, reporter:reporter_id(full_name, email, company_name), stone:stone_id(stone_type, shape, carat_weight, dealer_id)",
      )
      .order("created_at", { ascending: false });
    if (filter === "open") q = q.eq("status", "open");
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data as ReportRow[]) ?? []);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: "reviewed" | "dismissed" | "open") {
    setBusy(id);
    const { error } = await (supabase as any).from("reports").update({ status }).eq("id", id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked ${status}`);
    load();
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex gap-1 rounded-md border border-border p-1 text-xs w-fit">
        {(["open", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1 capitalize ${filter === f ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No reports{filter === "open" ? " open" : ""}.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Stone</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border align-top last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <a
                      href={`/stone/${r.stone_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium capitalize text-[var(--color-gold)] hover:underline"
                    >
                      {r.stone?.carat_weight ? `${Number(r.stone.carat_weight).toFixed(2)}ct ` : ""}
                      {r.stone?.shape ?? ""} {r.stone?.stone_type ?? "stone"}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.reason}</div>
                    {r.details && (
                      <div className="mt-1 max-w-md whitespace-pre-line text-xs text-muted-foreground">
                        {r.details}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div>{r.reporter?.full_name || "—"}</div>
                    <div>{r.reporter?.company_name}</div>
                    <div>{r.reporter?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${
                        r.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : r.status === "reviewed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "open" ? (
                      <>
                        <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => setStatus(r.id, "reviewed")}>
                          Mark reviewed
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => setStatus(r.id, "dismissed")} className="text-muted-foreground">
                          Dismiss
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => setStatus(r.id, "open")}>
                        Reopen
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}