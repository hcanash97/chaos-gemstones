import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useServerFn } from "@tanstack/react-start";
import { roleList, isDealer, isJeweller, isDualRole } from "@/lib/auth.utils";
import { setImpersonation } from "@/lib/impersonation";
import { EditRolesDialog } from "@/components/admin/EditRolesDialog";
import { SendEmailDialog } from "@/components/admin/SendEmailDialog";
import { approveWhatsAppStoneFn, rejectWhatsAppStoneFn } from "@/lib/whatsapp-intake.functions";
import { StatsPanel } from "@/components/admin/StatsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adminBulkUpdateAccounts, adminGenerateQuickApproveLink } from "@/lib/admin.functions";
import { adminCreateDealerCorrectionMessage, adminGetDealerHealth, adminGetProfileDataQuality, adminRepairProfileLocations } from "@/lib/admin-dealer.functions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ui/info-tooltip";
import { DEFAULT_SITE_THEME, HOMEPAGE_BLOCK_LABELS, normalizeSiteTheme, type HomepageSectionCopy, type SiteThemeSettings } from "@/lib/site-theme";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  account_type: "dealer" | "jeweller" | "admin";
  account_types: string[] | null;
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
  const [tab, setTab] = useState<"stats" | "pending" | "all" | "reports" | "fees" | "referrals" | "theme" | "intake">("stats");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testCount, setTestCount] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  // All Accounts toolbar state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "dealers" | "jewellers" | "dual" | "suspended" | "pending">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "company">("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editRolesFor, setEditRolesFor] = useState<ProfileRow | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [viewAsFor, setViewAsFor] = useState<ProfileRow | null>(null);
  const bulkFn = useServerFn(adminBulkUpdateAccounts);
  const quickApproveFn = useServerFn(adminGenerateQuickApproveLink);
  const healthFn = useServerFn(adminGetDealerHealth);
  const [dealerHealth, setDealerHealth] = useState<Record<string, { stoneCount: number; lastStoneAt: string | null }>>({});

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login", replace: true }); return; }
    if (!isAdmin) { navigate({ to: "/", replace: true }); }
  }, [loading, user, isAdmin, navigate]);

  const load = useCallback(async () => {
    if (!isAdmin || tab === "reports" || tab === "fees" || tab === "referrals" || tab === "stats" || tab === "theme" || tab === "intake") return;
    setError(null);
    let query = supabase
      .from("profiles")
      .select("id, email, full_name, account_type, account_types, company_name, country, is_approved, is_verified, created_at")
      .order("created_at", { ascending: false });
    if (tab === "pending") query = query.eq("is_approved", false);
    const { data, error } = await query;
    if (error) { setError(error.message); return; }
    setRows((data as ProfileRow[]) ?? []);
    setSelected(new Set());
  }, [isAdmin, tab]);

  useEffect(() => { load(); }, [load]);

  // Load dealer health stats for any dealers visible in the rows.
  useEffect(() => {
    const dealerIds = rows.filter((r) => isDealer(r)).map((r) => r.id);
    if (dealerIds.length === 0) return;
    healthFn({ data: { dealerIds } }).then((r) => setDealerHealth(r.health)).catch(() => {});
  }, [rows, healthFn]);

  const loadTestCount = useCallback(async () => {
    if (!isAdmin) return;
    const { count } = await supabase
      .from("stones")
      .select("id")
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

  // Apply client-side filter/search/sort over the loaded rows for the All tab.
  const visibleRows = (() => {
    if (tab !== "all") return rows;
    const q = search.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter((r) =>
        [r.full_name, r.company_name, r.email].some((v) => v?.toLowerCase().includes(q)),
      );
    }
    if (roleFilter === "dealers") out = out.filter((r) => isDealer(r));
    else if (roleFilter === "jewellers") out = out.filter((r) => isJeweller(r));
    else if (roleFilter === "dual") out = out.filter((r) => isDualRole(r));
    else if (roleFilter === "suspended") out = out.filter((r) => !r.is_approved);
    else if (roleFilter === "pending") out = out.filter((r) => !r.is_approved);
    if (sortBy === "oldest") out = [...out].sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sortBy === "company") out = [...out].sort((a, b) => (a.company_name || "").localeCompare(b.company_name || ""));
    return out;
  })();

  function toggleSel(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllSel() {
    if (selected.size === visibleRows.length) setSelected(new Set());
    else setSelected(new Set(visibleRows.map((r) => r.id)));
  }

  async function bulkAction(action: "approve" | "suspend" | "toggle_verified") {
    if (selected.size === 0) return;
    try {
      await bulkFn({ data: { ids: Array.from(selected), action } });
      toast.success(`${action.replace("_", " ")} applied to ${selected.size} account(s).`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed.");
    }
  }

  async function copyQuickApproveLink(id: string) {
    try {
      const { url } = await quickApproveFn({ data: { userId: id } });
      await navigator.clipboard.writeText(url);
      toast.success("Quick-approve link copied.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate link.");
    }
  }

  function viewAs(r: ProfileRow) {
    const roles = roleList(r);
    const hasDealer = roles.includes("dealer");
    const hasJeweller = roles.includes("jeweller");
    if (hasDealer && hasJeweller) {
      setViewAsFor(r);
      return;
    }
    setImpersonation({ userId: r.id, userName: r.full_name || r.company_name || r.email || r.id.slice(0, 8) });
    navigate({ to: hasJeweller && !hasDealer ? "/dashboard/jeweller" : "/dashboard" });
  }

  function confirmViewAs(target: "dealer" | "jeweller") {
    if (!viewAsFor) return;
    setImpersonation({
      userId: viewAsFor.id,
      userName: viewAsFor.full_name || viewAsFor.company_name || viewAsFor.email || viewAsFor.id.slice(0, 8),
    });
    setViewAsFor(null);
    navigate({ to: target === "jeweller" ? "/dashboard/jeweller" : "/dashboard" });
  }

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

      <div className="mx-auto max-w-7xl overflow-hidden px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl text-foreground">Account approvals</h1>
            <p className="text-sm text-muted-foreground">
              Approve new dealers and jewellers so they can access their dashboards.
            </p>
            <Link to="/admin/import-test" className="mt-2 inline-block text-xs text-primary underline">
              → CSV import sandbox (dry run)
            </Link>
          </div>
          <div className="max-w-full overflow-x-auto rounded-md border border-border p-1 text-sm [-webkit-overflow-scrolling:touch]">
            <div className="flex min-w-max gap-1">
            <button
              onClick={() => setTab("stats")}
              className={`shrink-0 rounded px-3 py-1 ${tab === "stats" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Stats
            </button>
            <button
              onClick={() => setTab("pending")}
              className={`shrink-0 rounded px-3 py-1 ${tab === "pending" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Pending{pendingCount !== null ? ` (${pendingCount})` : ""}
            </button>
            <button
              onClick={() => setTab("all")}
              className={`shrink-0 rounded px-3 py-1 ${tab === "all" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              All accounts
            </button>
            <button
              onClick={() => setTab("reports")}
              className={`shrink-0 rounded px-3 py-1 ${tab === "reports" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Reports
            </button>
            <button
              onClick={() => setTab("fees")}
              className={`shrink-0 rounded px-3 py-1 ${tab === "fees" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Fees
            </button>
            <button
              onClick={() => setTab("referrals")}
              className={`shrink-0 rounded px-3 py-1 ${tab === "referrals" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Referrals
            </button>
            <button
              onClick={() => setTab("theme")}
              className={`shrink-0 rounded px-3 py-1 ${tab === "theme" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Theme
            </button>
            <button
              onClick={() => setTab("intake")}
              className={`shrink-0 rounded px-3 py-1 ${tab === "intake" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              WA Intake
            </button>
            </div>
          </div>
        </div>

        {tab !== "reports" && tab !== "fees" && tab !== "referrals" && tab !== "theme" && tab !== "intake" && (
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
        ) : tab === "theme" ? (
          <ThemeSettingsPanel userId={user.id} />
        ) : tab === "intake" ? (
          <IntakeQueuePanel />
        ) : tab === "stats" ? (
          <>
            <StatsPanel />
            <DataCleanupPanel />
          </>
        ) : (
        <>
          {tab === "all" && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search name, company, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <div className="flex flex-wrap gap-1 rounded-md border border-border p-1 text-xs">
                {(["all","dealers","jewellers","dual","suspended","pending"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setRoleFilter(f)}
                    className={`rounded px-2.5 py-1 capitalize ${roleFilter === f ? "bg-foreground text-background" : "text-muted-foreground"}`}
                  >
                    {f === "dual" ? "Dual role" : f}
                  </button>
                ))}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="company">Company A–Z</option>
              </select>
            </div>
          )}

          {selected.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-2 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <span className="flex-1" />
              <Button size="sm" onClick={() => bulkAction("approve")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("suspend")}>Suspend</Button>
              <Button size="sm" variant="ghost" onClick={() => bulkAction("toggle_verified")}>Toggle verified</Button>
              <Button size="sm" variant="ghost" onClick={() => setEmailOpen(true)}>Send email</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}

        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card [-webkit-overflow-scrolling:touch]">
          {visibleRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {tab === "pending" ? "No accounts awaiting approval." : "No accounts yet."}
            </div>
          ) : (
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 w-8">
                    <Checkbox
                      checked={selected.size > 0 && selected.size === visibleRows.length}
                      onCheckedChange={toggleAllSel}
                    />
                  </th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-3">
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSel(r.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roleList(r).map((role) => (
                          <span key={role} className="inline-flex rounded-full bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider">{role}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {isDealer(r) ? (
                        <Link to="/admin/dealer/$id" params={{ id: r.id }} className="text-primary hover:underline">
                          {r.company_name || r.full_name || "—"}
                        </Link>
                      ) : (
                        r.company_name || "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.country || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge
                          status={r.is_approved ? "approved" : "pending"}
                          className={r.is_approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}
                        >
                          {r.is_approved ? "Approved" : "Pending"}
                        </StatusBadge>
                        {r.is_verified && (
                          <StatusBadge status="verified" className="bg-blue-100 text-blue-800">
                            Verified
                          </StatusBadge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <HealthDot dealer={r} health={dealerHealth[r.id]} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                      {!r.is_approved ? (
                        <>
                        <Button
                          size="sm"
                          disabled={busy === r.id}
                          onClick={() => setApproval(r.id, true)}
                          className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
                        >
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => copyQuickApproveLink(r.id)}>Copy link</Button>
                        </>
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
                      <Button size="sm" variant="ghost" onClick={() => setEditRolesFor(r)}>Edit roles</Button>
                      <Button size="sm" variant="ghost" onClick={() => viewAs(r)}>View as</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </>
        )}
      </div>

      {editRolesFor && (
        <EditRolesDialog
          open={!!editRolesFor}
          onOpenChange={(v) => !v && setEditRolesFor(null)}
          userId={editRolesFor.id}
          userName={editRolesFor.full_name || editRolesFor.company_name || editRolesFor.email || ""}
          initialRoles={roleList(editRolesFor)}
          onSaved={(roles) => {
            setRows((rs) =>
              rs.map((p) =>
                p.id === editRolesFor.id
                  ? { ...p, account_types: roles, account_type: (roles[0] || p.account_type) as ProfileRow["account_type"] }
                  : p,
              ),
            );
          }}
        />
      )}
      <SendEmailDialog open={emailOpen} onOpenChange={setEmailOpen} ids={Array.from(selected)} />
      <Dialog open={!!viewAsFor} onOpenChange={(v) => !v && setViewAsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View this account as…</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This account has both dealer and jeweller roles. Pick which dashboard to open.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => confirmViewAs("dealer")}>Dealer dashboard</Button>
            <Button onClick={() => confirmViewAs("jeweller")}>Jeweller dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function ThemeSettingsPanel({ userId }: { userId: string }) {
  const [configId, setConfigId] = useState<string | null>(null);
  const [form, setForm] = useState<SiteThemeSettings>(DEFAULT_SITE_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Which section copy editors are open
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  // Drag-and-drop state (block id being dragged)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_configurations")
        .select("id, theme_data, is_active")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setConfigId(data.id);
        setForm(normalizeSiteTheme(data.theme_data));
      }
      setLoading(false);
    })();
  }, []);

  function setField<K extends keyof SiteThemeSettings>(key: K, value: SiteThemeSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setCopyField<K extends keyof HomepageSectionCopy>(key: K, value: HomepageSectionCopy[K]) {
    setForm((current) => ({
      ...current,
      homepage_copy: { ...current.homepage_copy, [key]: value },
    }));
  }

  function toggleBlock(index: number) {
    setForm((current) => ({
      ...current,
      homepage_layout: current.homepage_layout.map((block, i) =>
        i === index ? { ...block, enabled: !block.enabled } : block,
      ),
    }));
  }

  function toggleSectionOpen(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ─── Drag-and-drop handlers ───────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    // Firefox requires setting data
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragOverId) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    setForm((current) => {
      const blocks = [...current.homepage_layout];
      const fromIdx = blocks.findIndex((b) => b.id === dragId);
      const toIdx = blocks.findIndex((b) => b.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return current;
      const [moved] = blocks.splice(fromIdx, 1);
      blocks.splice(toIdx, 0, moved);
      return { ...current, homepage_layout: blocks };
    });
    setDragId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  // ─── Image upload ─────────────────────────────────────────────────────────
  async function uploadThemeImage(file: File, target: "logo_url" | "hero_background_image_url") {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be under 5MB.");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/site-config/${target}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("stone-images").upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "31536000",
    });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("stone-images").getPublicUrl(path);
    setField(target, data.publicUrl);
    toast.success(target === "logo_url" ? "Logo uploaded" : "Hero background uploaded");
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function save() {
    setSaving(true);
    const payload = {
      ...(configId ? { id: configId } : {}),
      is_active: true,
      theme_data: normalizeSiteTheme(form) as any,
    };
    const { data, error } = await supabase
      .from("site_configurations")
      .upsert(payload)
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setConfigId(data.id);
    toast.success("Theme settings saved");
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading theme settings...
      </div>
    );
  }

  // Determine which section copy panels exist per block type
  const SECTION_COPY_BLOCKS: Partial<Record<string, () => ReactNode>> = {
    featured_stones: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="copy-fs-eyebrow" className="text-xs">Eyebrow label</Label>
          <Input id="copy-fs-eyebrow" value={form.homepage_copy.featured_stones_eyebrow} onChange={(e) => setCopyField("featured_stones_eyebrow", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="copy-fs-title" className="text-xs">Section title</Label>
          <Input id="copy-fs-title" value={form.homepage_copy.featured_stones_title} onChange={(e) => setCopyField("featured_stones_title", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="copy-fs-link" className="text-xs">Link label</Label>
          <Input id="copy-fs-link" value={form.homepage_copy.featured_stones_link_label} onChange={(e) => setCopyField("featured_stones_link_label", e.target.value)} className="mt-1" />
        </div>
      </div>
    ),
    matched_pairs: () => (
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="copy-mp-eyebrow" className="text-xs">Eyebrow label</Label>
            <Input id="copy-mp-eyebrow" value={form.homepage_copy.matched_pairs_eyebrow} onChange={(e) => setCopyField("matched_pairs_eyebrow", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="copy-mp-link" className="text-xs">Link label</Label>
            <Input id="copy-mp-link" value={form.homepage_copy.matched_pairs_link_label} onChange={(e) => setCopyField("matched_pairs_link_label", e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="copy-mp-title" className="text-xs">Section title</Label>
          <Input id="copy-mp-title" value={form.homepage_copy.matched_pairs_title} onChange={(e) => setCopyField("matched_pairs_title", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="copy-mp-body" className="text-xs">Body copy</Label>
          <Textarea id="copy-mp-body" rows={2} value={form.homepage_copy.matched_pairs_body} onChange={(e) => setCopyField("matched_pairs_body", e.target.value)} className="mt-1" />
        </div>
      </div>
    ),
    featured_vendors: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="copy-fv-eyebrow" className="text-xs">Eyebrow label</Label>
          <Input id="copy-fv-eyebrow" value={form.homepage_copy.featured_vendors_eyebrow} onChange={(e) => setCopyField("featured_vendors_eyebrow", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="copy-fv-title" className="text-xs">Section title</Label>
          <Input id="copy-fv-title" value={form.homepage_copy.featured_vendors_title} onChange={(e) => setCopyField("featured_vendors_title", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="copy-fv-link" className="text-xs">Link label</Label>
          <Input id="copy-fv-link" value={form.homepage_copy.featured_vendors_link_label} onChange={(e) => setCopyField("featured_vendors_link_label", e.target.value)} className="mt-1" />
        </div>
      </div>
    ),
    whatsapp_cta: () => (
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="copy-wa-title" className="text-xs">CTA title</Label>
            <Input id="copy-wa-title" value={form.homepage_copy.whatsapp_cta_title} onChange={(e) => setCopyField("whatsapp_cta_title", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="copy-wa-btn" className="text-xs">Button label</Label>
            <Input id="copy-wa-btn" value={form.homepage_copy.whatsapp_cta_button_label} onChange={(e) => setCopyField("whatsapp_cta_button_label", e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="copy-wa-body" className="text-xs">Body copy</Label>
          <Textarea id="copy-wa-body" rows={2} value={form.homepage_copy.whatsapp_cta_body} onChange={(e) => setCopyField("whatsapp_cta_body", e.target.value)} className="mt-1" />
        </div>
      </div>
    ),
    hero: () => (
      <div className="grid gap-3">
        <div>
          <Label htmlFor="copy-hero-badge" className="text-xs">Badge label</Label>
          <Input id="copy-hero-badge" value={form.hero_badge_label} onChange={(e) => setField("hero_badge_label", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="copy-hero-title" className="text-xs">Headline</Label>
          <Input id="copy-hero-title" value={form.hero_title} onChange={(e) => setField("hero_title", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="copy-hero-sub" className="text-xs">Subtitle</Label>
          <Textarea id="copy-hero-sub" rows={3} value={form.hero_subtitle} onChange={(e) => setField("hero_subtitle", e.target.value)} className="mt-1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="copy-hero-overlay" className="text-xs">Overlay strength</Label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="copy-hero-overlay"
                type="range"
                min="0.15"
                max="0.9"
                step="0.05"
                value={form.hero_overlay_opacity}
                onChange={(e) => setField("hero_overlay_opacity", Number(e.target.value))}
                className="w-full"
              />
              <span className="w-10 text-right font-mono text-xs text-muted-foreground">
                {Math.round(form.hero_overlay_opacity * 100)}%
              </span>
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs">Hero background image</Label>
          <div className="mt-1.5 flex flex-wrap items-start gap-3">
            {form.hero_background_image_url ? (
              <div className="relative flex-shrink-0">
                <img
                  src={form.hero_background_image_url}
                  alt="Hero background preview"
                  className="h-20 w-36 rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setField("hero_background_image_url", "")}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white hover:opacity-90"
                  title="Remove background"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex h-20 w-36 items-center justify-center rounded-md border border-dashed border-border bg-muted text-[10px] text-muted-foreground">
                No image
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent">
                {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && uploadThemeImage(e.target.files[0], "hero_background_image_url")}
                />
              </label>
              <Input
                value={form.hero_background_image_url}
                onChange={(e) => setField("hero_background_image_url", e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-md border border-border bg-card p-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">Site customiser</div>
            <h2 className="mt-2 font-serif text-2xl">Theme settings</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Edit brand, copy, and homepage layout without touching code.
            </p>
          </div>
          <a
            href="/?preview=true"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            Preview site
          </a>
        </div>

        <div className="mt-7 space-y-6">

          {/* ── Brand ── */}
          <div className="space-y-4 rounded-md border border-border p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Brand</div>

            {/* Logo */}
            <div>
              <Label className="text-xs">Logo image</Label>
              <div className="mt-1.5 flex flex-wrap items-start gap-3">
                {form.logo_url ? (
                  <div className="relative flex-shrink-0">
                    <img
                      src={form.logo_url}
                      alt="Logo preview"
                      className="h-16 w-16 rounded-md border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setField("logo_url", "")}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white hover:opacity-90"
                      title="Remove logo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border bg-muted text-[10px] text-muted-foreground">
                    No logo
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent">
                    {uploading ? "Uploading…" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => e.target.files?.[0] && uploadThemeImage(e.target.files[0], "logo_url")}
                    />
                  </label>
                  <Input
                    value={form.logo_url}
                    onChange={(e) => setField("logo_url", e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Accent colour + WhatsApp */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="theme-accent" className="text-xs">Accent colour</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    id="theme-accent"
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => setField("accent_color", e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-border bg-background p-1"
                  />
                  <Input
                    value={form.accent_color}
                    onChange={(e) => setField("accent_color", e.target.value)}
                    placeholder="#E8C97A"
                    className="font-mono"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="theme-whatsapp" className="text-xs">Contact WhatsApp</Label>
                <Input
                  id="theme-whatsapp"
                  value={form.contact_whatsapp}
                  onChange={(e) => setField("contact_whatsapp", e.target.value)}
                  placeholder="+44..."
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* ── Homepage layout blocks ── */}
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Homepage layout</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Toggle sections on/off, drag to reorder, and expand to edit copy.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setField("homepage_layout", DEFAULT_SITE_THEME.homepage_layout)}
                disabled={saving || uploading}
              >
                Reset layout
              </Button>
            </div>

            <div className="mt-3 divide-y divide-border rounded-md border border-border">
              {form.homepage_layout.map((block, index) => {
                const hasCopy = block.type in SECTION_COPY_BLOCKS;
                const isOpen = openSections.has(block.id);
                const isDragging = dragId === block.id;
                const isDragTarget = dragOverId === block.id && dragId !== block.id;

                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragOver={(e) => handleDragOver(e, block.id)}
                    onDrop={(e) => handleDrop(e, block.id)}
                    onDragEnd={handleDragEnd}
                    className={[
                      "transition-colors",
                      isDragging ? "opacity-40" : "",
                      isDragTarget ? "bg-[var(--color-gold)]/10 ring-1 ring-inset ring-[var(--color-gold)]/40" : "",
                    ].join(" ")}
                  >
                    {/* Row header */}
                    <div className="flex flex-wrap items-center gap-3 p-3">
                      {/* Drag handle */}
                      <div
                        className="cursor-grab touch-none select-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                        </svg>
                      </div>

                      <Checkbox
                        checked={block.enabled}
                        onCheckedChange={() => toggleBlock(index)}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{HOMEPAGE_BLOCK_LABELS[block.type]}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{block.type}</div>
                      </div>

                      {hasCopy && (
                        <button
                          type="button"
                          onClick={() => toggleSectionOpen(block.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          Edit copy
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          >
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Collapsible copy editor */}
                    {hasCopy && isOpen && (
                      <div className="border-t border-border bg-muted/30 px-4 pb-4 pt-3">
                        {SECTION_COPY_BLOCKS[block.type]?.()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={save}
              disabled={saving || uploading}
              className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(DEFAULT_SITE_THEME)}
              disabled={saving || uploading}
            >
              Reset to defaults
            </Button>
          </div>
        </div>
      </section>

      {/* ── Live preview sidebar ── */}
      <aside className="rounded-md border border-border bg-card p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live preview</div>
        <div className="relative mt-4 overflow-hidden rounded-md border border-border bg-primary text-primary-foreground">
          {form.hero_background_image_url && (
            <img
              src={form.hero_background_image_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(8, 18, 54, ${form.hero_background_image_url ? form.hero_overlay_opacity : 0})` }}
            aria-hidden="true"
          />
          <div className="relative p-5">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Site logo preview" className="mb-4 h-10 w-10 rounded object-cover" />
            ) : (
              <div className="mb-4 h-10 w-10 rounded bg-white/10" />
            )}
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{ backgroundColor: form.accent_color, color: "#081236" }}
            >
              {form.hero_badge_label}
            </span>
            <h3 className="mt-4 font-serif text-2xl leading-tight">{form.hero_title}</h3>
            <p className="mt-3 line-clamp-4 text-sm opacity-80">{form.hero_subtitle}</p>
            <button
              type="button"
              className="mt-5 rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: form.accent_color, color: "#081236" }}
            >
              Browse marketplace
            </button>
          </div>
        </div>

        {/* Accent colour swatch row */}
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-8 w-8 flex-shrink-0 rounded-full border border-border shadow-sm"
            style={{ backgroundColor: form.accent_color }}
            title={form.accent_color}
          />
          <div>
            <div className="text-xs font-medium">Accent</div>
            <div className="font-mono text-[11px] text-muted-foreground">{form.accent_color}</div>
          </div>
        </div>

        {/* Enabled blocks summary */}
        <div className="mt-4">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Active sections</div>
          <div className="flex flex-wrap gap-1.5">
            {form.homepage_layout.filter((b) => b.enabled).map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {HOMEPAGE_BLOCK_LABELS[b.type]}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Drag blocks to reorder, expand to edit section copy. Changes are live after Save.
        </p>
      </aside>
    </div>
  );
}

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

      <div className="overflow-x-auto rounded-lg border border-border bg-card [-webkit-overflow-scrolling:touch]">
        <div className="border-b border-border p-4 text-sm font-medium">Top referrers</div>
        {leaders.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No referral credits yet.</div>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
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

      <div className="overflow-x-auto rounded-lg border border-border bg-card [-webkit-overflow-scrolling:touch]">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No credits to show.</div>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
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

function HealthDot({
  dealer,
  health,
}: {
  dealer: ProfileRow;
  health: { stoneCount: number; lastStoneAt: string | null } | undefined;
}) {
  if (!isDealer(dealer)) return <span className="text-xs text-muted-foreground">—</span>;
  if (!dealer.is_approved) {
    return (
      <Dot
        color="grey"
        title="Pending approval — account is awaiting admin review"
      />
    );
  }
  if (!health) return <span className="text-xs text-muted-foreground">…</span>;
  if (health.stoneCount === 0) {
    return (
      <Dot
        color="red"
        title="No inventory — this dealer is approved but has zero stones listed. They may need onboarding help."
      />
    );
  }
  const last = health.lastStoneAt ? new Date(health.lastStoneAt).getTime() : 0;
  const days = (Date.now() - last) / 86_400_000;
  if (days <= 30)
    return (
      <Dot
        color="green"
        title={`Active dealer — approved, has stones listed, activity in the last 30 days (last listing ${Math.round(days)}d ago)`}
      />
    );
  return (
    <Dot
      color="amber"
      title={`Inactive dealer — approved and has stones but no new listings in ${Math.round(days)} days. Consider sending a nudge email.`}
    />
  );
}

function Dot({ color, title }: { color: "green" | "amber" | "red" | "grey"; title: string }) {
  const cls =
    color === "green" ? "bg-green-500" :
    color === "amber" ? "bg-amber-500" :
    color === "red" ? "bg-red-500" : "bg-muted-foreground/40";
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={title}
          className={`inline-block h-2.5 w-2.5 cursor-help rounded-full ${cls}`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {title}
      </TooltipContent>
    </Tooltip>
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

      <div className="overflow-x-auto rounded-lg border border-border bg-card [-webkit-overflow-scrolling:touch]">
        <div className="border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
          By jeweller
        </div>
        {byJeweller.size === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No fees recorded yet.</div>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
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

      <div className="overflow-x-auto rounded-lg border border-border bg-card [-webkit-overflow-scrolling:touch]">
        <div className="border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
          All fee-bearing orders
        </div>
        <table className="w-full min-w-[920px] text-sm">
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
      <div className="mb-3 flex w-fit max-w-full gap-1 overflow-x-auto rounded-md border border-border p-1 text-xs [-webkit-overflow-scrolling:touch]">
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
      <div className="overflow-x-auto rounded-lg border border-border bg-card [-webkit-overflow-scrolling:touch]">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No reports{filter === "open" ? " open" : ""}.</div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
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
function DataCleanupPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [scanningProfiles, setScanningProfiles] = useState(false);
  const [repairingProfiles, setRepairingProfiles] = useState(false);
  const [promptingProfileId, setPromptingProfileId] = useState<string | null>(null);
  const [correctionPrompt, setCorrectionPrompt] = useState<{
    email: string;
    subject: string;
    body: string;
    mailto: string;
  } | null>(null);
  const [profileQuality, setProfileQuality] = useState<{
    scanned: number;
    repairable: number;
    bySeverity: { error: number; warning: number };
    byField: Record<string, number>;
    issues: Array<{
      id: string;
      accountType: string | null;
      companyName: string | null;
      fullName: string | null;
      email: string | null;
      city: string | null;
      country: string | null;
      severity: "error" | "warning";
      field: string;
      message: string;
      suggestedCountry: string | null;
      href: string | null;
    }>;
    completeness: Array<{
      id: string;
      accountType: string | null;
      name: string;
      email: string | null;
      city: string | null;
      country: string | null;
      score: number;
      level: "strong" | "good" | "needs_work" | "poor";
      missing: string[];
      recommended: string[];
      stoneCount: number;
      href: string | null;
    }>;
  } | null>(null);
  const scanProfiles = useServerFn(adminGetProfileDataQuality);
  const repairProfileLocations = useServerFn(adminRepairProfileLocations);
  const createCorrectionMessage = useServerFn(adminCreateDealerCorrectionMessage);

  async function runProfileScan() {
    setScanningProfiles(true);
    try {
      const scan = await scanProfiles({});
      setProfileQuality(scan);
      toast.success(`Scanned ${scan.scanned} profiles`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Profile scan failed");
    } finally {
      setScanningProfiles(false);
    }
  }

  async function repairLocations() {
    if (!confirm("Auto-fix obvious city/country mismatches, such as Surat → India?")) return;
    setRepairingProfiles(true);
    try {
      const res = await repairProfileLocations({});
      toast.success(`Repaired ${res.repaired.length} profile location${res.repaired.length === 1 ? "" : "s"}`);
      await runProfileScan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Profile repair failed");
    } finally {
      setRepairingProfiles(false);
    }
  }

  async function buildCorrectionPrompt(profile: NonNullable<typeof profileQuality>["completeness"][number]) {
    if (profile.accountType !== "dealer") {
      toast.error("Correction prompts are currently for dealer profiles.");
      return;
    }
    const issues = [...profile.missing, ...profile.recommended].slice(0, 8);
    if (issues.length === 0) {
      toast.success("This profile already looks complete.");
      return;
    }
    setPromptingProfileId(profile.id);
    try {
      const message = await createCorrectionMessage({
        data: {
          dealerId: profile.id,
          issues,
          note: "You can update these from your Chaos dashboard under Account settings. If any field is unclear, reply here and we can help.",
        },
      });
      setCorrectionPrompt(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create correction message");
    } finally {
      setPromptingProfileId(null);
    }
  }

  async function runCleanup() {
    setRunning(true);
    setResult(null);
    const log: string[] = [];
    try {
      // 1. Clean "nan" values from video_url
      const { data: nanVideos } = await supabase
        .from("stones")
        .update({ video_url: null } as any)
        .or("video_url.ilike.nan,video_url.ilike.null,video_url.ilike.none,video_url.eq.N/A,video_url.eq.-")
        .select("id");
      log.push(`Cleaned ${nanVideos?.length ?? 0} invalid video_url values`);

      // 2. Set has_video/has_360 to false where video_url is now null
      const { data: flagsCleared } = await supabase
        .from("stones")
        .update({ has_video: false, has_360: false } as any)
        .is("video_url", null)
        .or("has_video.eq.true,has_360.eq.true")
        .select("id");
      log.push(`Cleared has_video/has_360 flags on ${flagsCleared?.length ?? 0} stones with no video`);

      // 3. Clean "nan" from text fields
      for (const col of ["shade", "milky", "eye_clean", "black_inclusion", "notes_for_buyers"]) {
        const { data: cleaned } = await supabase
          .from("stones")
          .update({ [col]: null } as any)
          .or(`${col}.ilike.nan,${col}.ilike.null,${col}.ilike.none,${col}.eq.N/A,${col}.eq.-`)
          .select("id");
        if (cleaned && cleaned.length > 0) log.push(`Cleaned ${cleaned.length} invalid ${col} values`);
      }

      // 4. Feature top stones (if none are featured yet)
      const { data: featuredStones } = await supabase
        .from("stones")
        .select("id")
        .eq("featured", true)
        .eq("is_test", false);
      const featuredCount = featuredStones?.length ?? 0;
      if (featuredCount === 0) {
        const { data: topStones } = await supabase
          .from("stones")
          .select("id")
          .eq("status", "available")
          .eq("is_test", false)
          .not("video_url", "is", null)
          .order("wholesale_price_usd", { ascending: false })
          .limit(6);
        if (topStones && topStones.length > 0) {
          const ids = topStones.map((s: any) => s.id);
          await supabase.from("stones").update({ featured: true } as any).in("id", ids);
          log.push(`Featured ${ids.length} top stones on homepage`);
        }
      } else {
        log.push(`${featuredCount} stones already featured — skipped`);
      }

      setResult(log.join("\n"));
      toast.success("Cleanup complete");
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
      toast.error("Cleanup failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-8 space-y-5 rounded-md border border-border bg-card p-5">
      <div>
        <h3 className="font-serif text-lg">Data Cleanup</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cleans imported stone data and scans account profiles for country/city mismatches, missing company names,
          and thin public profile details.
        </p>
      </div>

      <div className="rounded-md border border-border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Profile data quality</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Finds bad country values like Europe, city/country mismatches like Surat + Europe,
              missing company names, and incomplete public profiles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runProfileScan} disabled={scanningProfiles || repairingProfiles} size="sm" variant="outline">
              {scanningProfiles ? "Scanning..." : "Scan profiles"}
            </Button>
            <Button
              onClick={repairLocations}
              disabled={repairingProfiles || scanningProfiles || !profileQuality?.repairable}
              size="sm"
            >
              {repairingProfiles ? "Repairing..." : `Auto-fix ${profileQuality?.repairable ?? 0}`}
            </Button>
          </div>
        </div>

        {profileQuality && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 text-xs sm:grid-cols-4">
              <div className="rounded border border-border bg-muted/30 p-3">
                <div className="uppercase tracking-wider text-muted-foreground">Scanned</div>
                <div className="mt-1 text-lg font-medium">{profileQuality.scanned}</div>
              </div>
              <div className="rounded border border-red-200 bg-red-50 p-3 text-red-900">
                <div className="uppercase tracking-wider">Errors</div>
                <div className="mt-1 text-lg font-medium">{profileQuality.bySeverity.error}</div>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <div className="uppercase tracking-wider">Warnings</div>
                <div className="mt-1 text-lg font-medium">{profileQuality.bySeverity.warning}</div>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                <div className="uppercase tracking-wider">Auto-fixable</div>
                <div className="mt-1 text-lg font-medium">{profileQuality.repairable}</div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">Profile completeness</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Low scores usually mean the account will look less trustworthy to jewellers or will be harder to search.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {profileQuality.completeness.filter((p) => p.score < 70).length} below 70%
                </div>
              </div>
              <div className="mt-3 max-h-80 overflow-auto rounded-md border border-border">
                <table className="w-full min-w-[780px] text-xs">
                  <thead className="border-b border-border bg-muted/30 text-left uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Inventory</th>
                      <th className="px-3 py-2">Needs</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileQuality.completeness.slice(0, 80).map((profile) => (
                      <tr key={profile.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex min-w-14 justify-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                              profile.level === "strong"
                                ? "bg-emerald-100 text-emerald-800"
                                : profile.level === "good"
                                ? "bg-blue-100 text-blue-800"
                                : profile.level === "needs_work"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {profile.score}%
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{profile.name}</div>
                          <div className="text-muted-foreground">{profile.accountType || "account"} · {profile.email || "no email"}</div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {[profile.city, profile.country].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-3 py-2">{profile.stoneCount} stones</td>
                        <td className="px-3 py-2">
                          {[...profile.missing, ...profile.recommended].slice(0, 4).join(", ") || "Looks complete"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {profile.href ? (
                              <a href={profile.href} className="text-primary underline">
                                Edit
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Manual</span>
                            )}
                            {profile.accountType === "dealer" && profile.score < 85 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px]"
                                disabled={promptingProfileId === profile.id}
                                onClick={() => buildCorrectionPrompt(profile)}
                              >
                                {promptingProfileId === profile.id ? "Writing..." : "Prompt"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {profileQuality.issues.length === 0 ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                No profile data issues found.
              </div>
            ) : (
              <div className="max-h-80 overflow-auto rounded-md border border-border">
                <table className="w-full min-w-[720px] text-xs">
                  <thead className="border-b border-border bg-muted/30 text-left uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Severity</th>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Issue</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileQuality.issues.slice(0, 80).map((issue, index) => (
                      <tr key={`${issue.id}-${issue.field}-${index}`} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                            issue.severity === "error"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {issue.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{issue.companyName || issue.fullName || issue.email || issue.id.slice(0, 8)}</div>
                          <div className="text-muted-foreground">{issue.accountType || "account"}</div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {[issue.city, issue.country].filter(Boolean).join(", ") || "—"}
                          {issue.suggestedCountry && (
                            <div className="text-emerald-700">Suggest: {issue.suggestedCountry}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">{issue.message}</td>
                        <td className="px-3 py-2 text-right">
                          {issue.href ? (
                            <a href={issue.href} className="text-primary underline">
                              Edit
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Manual</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!correctionPrompt} onOpenChange={(open) => !open && setCorrectionPrompt(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dealer correction prompt</DialogTitle>
          </DialogHeader>
          {correctionPrompt && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div><span className="font-medium">To:</span> {correctionPrompt.email || "No email on profile"}</div>
                <div className="mt-1"><span className="font-medium">Subject:</span> {correctionPrompt.subject}</div>
              </div>
              <Textarea value={correctionPrompt.body} readOnly rows={12} className="font-mono text-xs" />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(correctionPrompt.body);
                    toast.success("Prompt copied");
                  }}
                >
                  Copy message
                </Button>
                {correctionPrompt.email ? (
                  <Button asChild>
                    <a href={correctionPrompt.mailto}>Open email</a>
                  </Button>
                ) : (
                  <Button type="button" disabled>
                    Open email
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-md border border-border bg-background p-4">
        <div className="text-sm font-medium">Stone import cleanup</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Cleans up invalid values from CSV imports (like &quot;nan&quot; stored as text),
        corrects video/360° flags, and features top stones on the homepage.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={runCleanup} disabled={running} size="sm">
          {running ? "Running…" : "Run Cleanup"}
        </Button>
      </div>
      {result && (
        <pre className="mt-3 whitespace-pre-wrap rounded bg-muted p-3 text-xs">{result}</pre>
      )}
      </div>
    </div>
  );
}

// ─── IntakeQueuePanel ─────────────────────────────────────────────────────────

type IntakeRow = {
  id: string;
  stone_id: string | null;
  raw_message: string;
  confidence: string | null;
  warnings: string[] | null;
  raw_price_text: string | null;
  original_currency: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  stone?: {
    stone_type: string;
    shape: string | null;
    carat_weight: number | null;
    cert_lab: string | null;
    cert_number: string | null;
    wholesale_price_usd: number | null;
    treatment: string | null;
  } | null;
  dealer?: { full_name: string | null; company_name: string | null } | null;
};

function IntakeQueuePanel() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"saved" | "approved" | "rejected" | "all">("saved");

  const approveFn = useServerFn(approveWhatsAppStoneFn);
  const rejectFn  = useServerFn(rejectWhatsAppStoneFn);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("whatsapp_intake_log")
      .select(`
        id, stone_id, raw_message, confidence, warnings,
        raw_price_text, original_currency, status, created_at, processed_at,
        stone:stone_id(stone_type, shape, carat_weight, cert_lab, cert_number, wholesale_price_usd, treatment),
        dealer:dealer_id(full_name, company_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") q = q.eq("status", filter);

    const { data, error } = await q;
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data as IntakeRow[]) ?? []);
  }

  async function approve(row: IntakeRow) {
    if (!row.stone_id) { toast.error("No stone linked to this log entry."); return; }
    setBusyId(row.id);
    try {
      const res = await approveFn({ data: { stoneId: row.stone_id } });
      if (res.ok) {
        toast.success("Stone approved and published to marketplace.");
        setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: "approved" } : r));
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(row: IntakeRow) {
    if (!row.stone_id) { toast.error("No stone linked."); return; }
    setBusyId(row.id);
    try {
      const res = await rejectFn({ data: { stoneId: row.stone_id } });
      if (res.ok) {
        toast.success("Draft rejected and hidden.");
        setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: "rejected" } : r));
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = rows.filter((r) => r.status === "saved").length;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">WhatsApp intake</div>
          <h2 className="mt-1 font-serif text-2xl">Intake queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stones submitted via WhatsApp intake. Approve to publish, reject to discard.
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {(["saved", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1 text-sm capitalize ${filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"}`}
            >
              {f === "saved" ? "Pending" : f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No intake logs {filter !== "all" ? `with status "${filter === "saved" ? "pending" : filter}"` : ""}.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((row) => {
            const s = row.stone;
            const dealer = row.dealer;
            const isPending = row.status === "saved";
            const isBusy = busyId === row.id;

            return (
              <div key={row.id} className={`p-4 ${isPending ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Stone summary */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">
                        {s ? `${s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : ""}${s.shape || ""} ${s.stone_type}` : "Unknown stone"}
                      </span>
                      {row.confidence && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          row.confidence === "high" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
                          row.confidence === "medium" ? "border-amber-200 bg-amber-50 text-amber-800" :
                          "border-red-200 bg-red-50 text-red-800"
                        }`}>
                          {row.confidence} confidence
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        row.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                        row.status === "rejected" ? "bg-red-100 text-red-800" :
                        row.status === "duplicate" ? "bg-purple-100 text-purple-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {row.status === "saved" ? "pending" : row.status}
                      </span>
                    </div>

                    {/* Key fields */}
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {s?.cert_lab && <span>Cert: {s.cert_lab} {s.cert_number}</span>}
                      {s?.treatment && <span>Treatment: {s.treatment}</span>}
                      {s?.wholesale_price_usd && <span>Price: ${s.wholesale_price_usd.toLocaleString()}</span>}
                      {row.raw_price_text && row.original_currency !== "USD" && (
                        <span className="text-amber-700">Original: {row.raw_price_text} {row.original_currency}</span>
                      )}
                      {dealer && <span>Dealer: {dealer.company_name || dealer.full_name || "—"}</span>}
                      <span>{new Date(row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    {/* Warnings */}
                    {row.warnings && row.warnings.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {row.warnings.map((w, i) => (
                          <span key={i} className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] text-amber-800">
                            ⚠ {w}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Raw message preview */}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                        View raw message
                      </summary>
                      <pre className="mt-1.5 whitespace-pre-wrap rounded bg-muted p-2 font-mono text-[11px] leading-relaxed">
                        {row.raw_message}
                      </pre>
                    </details>
                  </div>

                  {/* Actions */}
                  {isPending && row.stone_id && (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      {row.stone_id && (
                        <Link to="/dashboard/stones/$id/edit" params={{ id: row.stone_id }}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                      )}
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => approve(row)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {isBusy ? "…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => reject(row)}
                        className="border-destructive/40 text-destructive hover:bg-destructive/5"
                      >
                        {isBusy ? "…" : "Reject"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
