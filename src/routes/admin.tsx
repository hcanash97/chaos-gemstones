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
  const [tab, setTab] = useState<"pending" | "all" | "reports" | "fees" | "referrals">("pending");
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
    if (!isAdmin || tab === "reports" || tab === "fees" || tab === "referrals") return;
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
            <button
              onClick={() => setTab("referrals")}
              className={`rounded px-3 py-1 ${tab === "referrals" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Referrals
            </button>
          </div>
        </div>

        {tab !== "reports" && tab !== "fees" && tab !== "referrals" && (
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
        ) : tab === "referrals" ? (
          <ReferralsPanel />
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

type ReferralCreditRow = {
  id: string;
  beneficiary_id: string;
  referral_id: string | null;
  credit_type: string;
  credit_months: number;
  credit_gbp: number;
  reason: string;
  status: string;
  qualifying_event: string;
  cross_side: boolean;
  created_at: string;
  beneficiary?: { full_name: string | null; company_name: string | null; email: string | null } | null;
};

function ReferralsPanel() {
  const [rows, setRows] = useState<ReferralCreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "applied" | "expired">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("referral_credits")
        .select("*, beneficiary:profiles!referral_credits_beneficiary_id_fkey(full_name, company_name, email)")
        .order("created_at", { ascending: false });
      setRows((data ?? []) as unknown as ReferralCreditRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const totalMonths = rows.filter((r) => r.credit_type === "free_months").reduce((t, r) => t + r.credit_months, 0);
  const totalGbp = rows.filter((r) => r.credit_type === "credit_gbp").reduce((t, r) => t + Number(r.credit_gbp), 0);
  const totalReferrals = rows.filter((r) => r.qualifying_event !== "referred_signup").length;

  // Leaderboard by beneficiary
  const board = new Map<string, { name: string; months: number; gbp: number; count: number }>();
  for (const r of rows) {
    const name = r.beneficiary?.company_name || r.beneficiary?.full_name || r.beneficiary?.email || "—";
    const e = board.get(r.beneficiary_id) || { name, months: 0, gbp: 0, count: 0 };
    e.months += r.credit_months;
    e.gbp += Number(r.credit_gbp);
    e.count += 1;
    board.set(r.beneficiary_id, e);
  }
  const leaders = Array.from(board.values()).sort((a, b) => b.months + b.gbp / 50 - (a.months + a.gbp / 50)).slice(0, 10);

  async function markApplied(id: string) {
    await supabase.from("referral_credits").update({ status: "applied" }).eq("id", id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "applied" } : r)));
  }

  if (loading) return <div className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading referrals…</div>;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total referrals" value={totalReferrals} />
        <Stat label="Months free issued" value={totalMonths} />
        <Stat label="GBP credits issued" value={`£${totalGbp.toLocaleString()}`} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4 text-sm font-medium">Top referrers</div>
        {leaders.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No referral credits yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Credits</th>
                <th className="px-4 py-2">Months</th>
                <th className="px-4 py-2">GBP</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((l, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{l.name}</td>
                  <td className="px-4 py-2">{l.count}</td>
                  <td className="px-4 py-2">{l.months}</td>
                  <td className="px-4 py-2">£{l.gbp.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex gap-2 text-xs">
        {(["all", "pending", "active", "applied", "expired"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1 capitalize ${filter === f ? "bg-foreground text-background" : "border border-border"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No credits to show.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Beneficiary</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.beneficiary?.company_name || r.beneficiary?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.beneficiary?.email}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{r.reason}{r.cross_side ? " (cross-side)" : ""}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.qualifying_event}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.credit_months > 0 && <div>{r.credit_months}mo</div>}
                    {Number(r.credit_gbp) > 0 && <div>£{Number(r.credit_gbp).toLocaleString()}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs capitalize">{r.status}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    {r.status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => markApplied(r.id)}>
                        Mark applied
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl">{value}</div>
    </div>
  );
}

type FeeOrderRow = {
  id: string;
  jeweller_id: string;
  dealer_id: string;
  platform_fee_usd: number | null;
  fee_invoiced_at: string | null;
  fee_paid_at: string | null;
  received_at: string | null;
  wholesale_price_usd: number | null;
  sale_date: string;
  jeweller?: { full_name: string | null; company_name: string | null; email: string | null } | null;
  dealer?: { full_name: string | null; company_name: string | null } | null;
};

function FeesPanel() {
  const [rows, setRows] = useState<FeeOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("orders")
      .select(
        "id, jeweller_id, dealer_id, platform_fee_usd, fee_invoiced_at, fee_paid_at, received_at, wholesale_price_usd, sale_date, jeweller:jeweller_id(full_name, company_name, email), dealer:dealer_id(full_name, company_name)",
      )
      .not("platform_fee_usd", "is", null)
      .order("received_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data as FeeOrderRow[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const accrued = rows.filter((r) => !r.fee_invoiced_at && !r.fee_paid_at);
  const invoiced = rows.filter((r) => r.fee_invoiced_at && !r.fee_paid_at);
  const paid = rows.filter((r) => r.fee_paid_at);
  const sum = (xs: FeeOrderRow[]) => xs.reduce((t, r) => t + Number(r.platform_fee_usd ?? 0), 0);

  const byJeweller = new Map<
    string,
    { name: string; email: string | null; accrued: number; invoiced: number; paid: number; count: number }
  >();
  for (const r of rows) {
    const key = r.jeweller_id;
    const name = r.jeweller?.company_name || r.jeweller?.full_name || r.jeweller?.email || key.slice(0, 8);
    const entry = byJeweller.get(key) ?? {
      name,
      email: r.jeweller?.email ?? null,
      accrued: 0,
      invoiced: 0,
      paid: 0,
      count: 0,
    };
    const fee = Number(r.platform_fee_usd ?? 0);
    entry.count += 1;
    if (r.fee_paid_at) entry.paid += fee;
    else if (r.fee_invoiced_at) entry.invoiced += fee;
    else entry.accrued += fee;
    byJeweller.set(key, entry);
  }

  async function markInvoiced(id: string) {
    setBusy(id);
    const { error } = await (supabase as any)
      .from("orders")
      .update({ fee_invoiced_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked invoiced");
    load();
  }

  async function markPaid(id: string) {
    setBusy(id);
    const { error } = await (supabase as any)
      .from("orders")
      .update({ fee_paid_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked paid");
    load();
  }

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

  if (loading) {
    return <div className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading fees…</div>;
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Accrued (uninvoiced)" value={fmt(sum(accrued))} sub={`${accrued.length} orders`} />
        <SummaryCard label="Invoiced, unpaid" value={fmt(sum(invoiced))} sub={`${invoiced.length} orders`} />
        <SummaryCard label="Paid" value={fmt(sum(paid))} sub={`${paid.length} orders`} />
        <SummaryCard label="Total all-time" value={fmt(sum(rows))} sub={`${rows.length} orders`} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
          By jeweller
        </div>
        {byJeweller.size === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No fees recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Jeweller</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Accrued</th>
                <th className="px-4 py-3 text-right">Invoiced</th>
                <th className="px-4 py-3 text-right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byJeweller.entries()).map(([id, e]) => (
                <tr key={id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{e.name}</div>
                    {e.email && <div className="text-xs text-muted-foreground">{e.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{e.count}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(e.accrued)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(e.invoiced)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(e.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
          All fee-bearing orders
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Jeweller</th>
              <th className="px-4 py-3">Dealer</th>
              <th className="px-4 py-3 text-right">Sale (USD)</th>
              <th className="px-4 py-3 text-right">Fee (USD)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = r.fee_paid_at ? "paid" : r.fee_invoiced_at ? "invoiced" : "accrued";
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.received_at ? new Date(r.received_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.jeweller?.company_name || r.jeweller?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.dealer?.company_name || r.dealer?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {r.wholesale_price_usd ? fmt(Number(r.wholesale_price_usd)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {fmt(Number(r.platform_fee_usd ?? 0))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${
                        status === "paid"
                          ? "bg-green-100 text-green-800"
                          : status === "invoiced"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {status === "accrued" && (
                      <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => markInvoiced(r.id)}>
                        Mark invoiced
                      </Button>
                    )}
                    {status === "invoiced" && (
                      <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => markPaid(r.id)}>
                        Mark paid
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif text-2xl text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
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