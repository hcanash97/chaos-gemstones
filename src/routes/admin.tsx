import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
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
import { StatsPanel } from "@/components/admin/StatsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adminBulkUpdateAccounts, adminGenerateQuickApproveLink } from "@/lib/admin.functions";
import { adminGetDealerHealth } from "@/lib/admin-dealer.functions";
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
  const [tab, setTab] = useState<"stats" | "pending" | "all" | "reports" | "fees" | "referrals" | "theme">("stats");
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
    if (!isAdmin || tab === "reports" || tab === "fees" || tab === "referrals" || tab === "stats" || tab === "theme") return;
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
            </div>
          </div>
        </div>

        {tab !== "reports" && tab !== "fees" && tab !== "referrals" && tab !== "theme" && (
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

const THEME_EDITOR_TABS: Array<{
  id: "presets" | "brand" | "hero" | "seo" | "modules" | "layout" | "copy" | "preview";
  label: string;
  description: string;
}> = [
  {
    id: "presets",
    label: "Presets",
    description: "Apply a curated visual direction, then fine tune it before saving.",
  },
  {
    id: "brand",
    label: "Brand",
    description: "Logo, colours, contact links and footer wording.",
  },
  {
    id: "hero",
    label: "Hero",
    description: "Homepage headline, background media, motion style and main buttons.",
  },
  {
    id: "seo",
    label: "SEO",
    description: "Default search result text and social sharing image.",
  },
  {
    id: "modules",
    label: "Modules",
    description: "Ticker strip and visual shape discovery settings.",
  },
  {
    id: "layout",
    label: "Layout",
    description: "Toggle and reorder homepage sections.",
  },
  {
    id: "copy",
    label: "Copy",
    description: "Edit homepage section headings and CTA wording.",
  },
  {
    id: "preview",
    label: "Preview",
    description: "Review how the current settings will feel before saving.",
  },
];

const THEME_PRESETS: Array<{
  id: string;
  name: string;
  strapline: string;
  description: string;
  swatches: string[];
  apply: (current: SiteThemeSettings) => SiteThemeSettings;
}> = [
  {
    id: "trade-classic",
    name: "Trade Classic",
    strapline: "Quiet B2B trust",
    description: "Balanced navy, champagne gold and restrained motion for a credible trade marketplace.",
    swatches: ["#E8C97A", "#0F1B3D", "#F8F6F0"],
    apply: (current) =>
      normalizeSiteTheme({
        ...current,
        accent_color: "#E8C97A",
        primary_glow_color: "#E8C97A",
        animation_preset: "classic-fade",
        enable_parallax: true,
        hero_media_type: "image",
        hero_overlay_opacity: 0.62,
        ticker_enabled: true,
        shape_grid_enabled: true,
        shape_grid_mode: "grid",
        hero_badge_label: "B2B · For the trade",
        hero_primary_cta_label: "Browse marketplace",
        hero_primary_cta_url: "/marketplace",
        hero_secondary_cta_label: "Sign up",
        hero_secondary_cta_url: "/sign-up",
      }),
  },
  {
    id: "luxury-editorial",
    name: "Luxury Editorial",
    strapline: "Magazine-like launch page",
    description: "Warmer glow, slower reveal and stronger storytelling for a premium jewellery-house feel.",
    swatches: ["#D6B35A", "#111827", "#F5EFE3"],
    apply: (current) =>
      normalizeSiteTheme({
        ...current,
        accent_color: "#D6B35A",
        primary_glow_color: "#F2D184",
        animation_preset: "luxury-fade",
        enable_parallax: true,
        hero_media_type: "image",
        hero_overlay_opacity: 0.68,
        ticker_enabled: true,
        ticker_speed_seconds: 46,
        shape_grid_enabled: true,
        shape_grid_mode: "carousel",
        hero_badge_label: "Curated trade sourcing",
        hero_primary_cta_label: "Explore stones",
        hero_primary_cta_url: "/marketplace",
        hero_secondary_cta_label: "Learn how Chaos works",
        hero_secondary_cta_url: "/about",
      }),
  },
  {
    id: "dark-cinema",
    name: "Dark Cinema",
    strapline: "Video-first drama",
    description: "Designed for a cinematic hero video with spring motion, high contrast and a showroom mood.",
    swatches: ["#C7A74A", "#050814", "#111827"],
    apply: (current) =>
      normalizeSiteTheme({
        ...current,
        accent_color: "#C7A74A",
        primary_glow_color: "#C7A74A",
        animation_preset: "spring-slide",
        enable_parallax: true,
        hero_media_type: "video",
        hero_overlay_opacity: 0.74,
        ticker_enabled: true,
        ticker_speed_seconds: 32,
        shape_grid_enabled: true,
        shape_grid_mode: "carousel",
        hero_badge_label: "Live inventory · Global dealers",
        hero_primary_cta_label: "Enter marketplace",
        hero_primary_cta_url: "/marketplace",
        hero_secondary_cta_label: "Retail showroom",
        hero_secondary_cta_url: "/retail",
      }),
  },
  {
    id: "clean-retail",
    name: "Clean Retail",
    strapline: "Client-friendly clarity",
    description: "More minimal motion and direct CTAs for retail showroom or client-facing browsing.",
    swatches: ["#A88F4B", "#FFFFFF", "#1F2937"],
    apply: (current) =>
      normalizeSiteTheme({
        ...current,
        accent_color: "#A88F4B",
        primary_glow_color: "#C8B46A",
        animation_preset: "classic-fade",
        enable_parallax: false,
        hero_media_type: "image",
        hero_overlay_opacity: 0.48,
        ticker_enabled: false,
        shape_grid_enabled: true,
        shape_grid_mode: "grid",
        hero_badge_label: "Retail-ready sourcing",
        hero_primary_cta_label: "Browse retail showroom",
        hero_primary_cta_url: "/retail",
        hero_secondary_cta_label: "Request a stone",
        hero_secondary_cta_url: "/requests",
      }),
  },
];

function ThemeSettingsPanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [configId, setConfigId] = useState<string | null>(null);
  const [form, setForm] = useState<SiteThemeSettings>(DEFAULT_SITE_THEME);
  const [lastSavedTheme, setLastSavedTheme] = useState<SiteThemeSettings>(DEFAULT_SITE_THEME);
  const [editorTab, setEditorTab] = useState<"presets" | "brand" | "hero" | "seo" | "modules" | "layout" | "copy" | "preview">("presets");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [checkingSaved, setCheckingSaved] = useState(false);

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
        const theme = normalizeSiteTheme(data.theme_data);
        setForm(theme);
        setLastSavedTheme(theme);
        setLastSavedAt(new Date().toISOString());
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

  function applyPreset(preset: (typeof THEME_PRESETS)[number]) {
    setForm((current) => preset.apply(current));
    toast.message(`${preset.name} preset applied`, {
      description: "Preview the changes, then press Save changes to publish them.",
    });
  }

  const hasUnsavedChanges = JSON.stringify(normalizeSiteTheme(form)) !== JSON.stringify(normalizeSiteTheme(lastSavedTheme));

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  async function reloadSavedTheme() {
    setCheckingSaved(true);
    const { data, error } = await supabase
      .from("site_configurations")
      .select("id, theme_data, is_active")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    setCheckingSaved(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("No active site configuration was found.");
      return;
    }
    const theme = normalizeSiteTheme(data.theme_data);
    setConfigId(data.id);
    setForm(theme);
    setLastSavedTheme(theme);
    setLastSavedAt(new Date().toISOString());
    queryClient.setQueryData(["site-theme"], theme);
    await queryClient.invalidateQueries({ queryKey: ["site-theme"] });
    toast.success("Reloaded the saved theme from Supabase");
  }

  function toggleBlock(index: number) {
    setForm((current) => ({
      ...current,
      homepage_layout: current.homepage_layout.map((block, i) =>
        i === index ? { ...block, enabled: !block.enabled } : block,
      ),
    }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.homepage_layout.length) return current;
      const next = [...current.homepage_layout];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return { ...current, homepage_layout: next };
    });
  }

  async function persistTheme(nextTheme: SiteThemeSettings, options?: { silent?: boolean }) {
    setSaving(true);
    const normalizedTheme = normalizeSiteTheme(nextTheme);
    const payload = {
      ...(configId ? { id: configId } : {}),
      is_active: true,
      theme_data: normalizedTheme as any,
    };
    const { data, error } = await supabase
      .from("site_configurations")
      .upsert(payload)
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setConfigId(data.id);
    setForm(normalizedTheme);
    setLastSavedTheme(normalizedTheme);
    setLastSavedAt(new Date().toISOString());
    queryClient.setQueryData(["site-theme"], normalizedTheme);
    await queryClient.invalidateQueries({ queryKey: ["site-theme"] });
    if (!options?.silent) toast.success("Theme settings saved and applied");
    return true;
  }

  async function uploadThemeImage(file: File, target: "logo_url" | "hero_background_image_url" | "seo_image_url") {
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
    const nextTheme = normalizeSiteTheme({ ...form, [target]: data.publicUrl });
    setForm(nextTheme);
    const saved = await persistTheme(nextTheme, { silent: true });
    if (!saved) return;
    toast.success(
      target === "logo_url"
        ? "Logo uploaded and applied"
        : target === "seo_image_url"
        ? "Social sharing image uploaded and applied"
        : "Hero background uploaded and applied",
    );
  }

  async function save() {
    await persistTheme(form);
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading theme settings...
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-md border border-border bg-card p-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">Site customiser</div>
          <h2 className="mt-2 font-serif text-2xl">Theme settings</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Edit the homepage hero copy, accent colour and contact details without changing code.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto rounded-md border border-border bg-muted/20 p-1 [-webkit-overflow-scrolling:touch]">
          <div className="flex min-w-max gap-1">
            {THEME_EDITOR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEditorTab(tab.id)}
                className={`rounded px-3 py-2 text-xs font-medium transition-colors ${
                  editorTab === tab.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-md border border-[var(--gold-border)] bg-[var(--color-gold)]/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
                {THEME_EDITOR_TABS.find((tab) => tab.id === editorTab)?.label}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {THEME_EDITOR_TABS.find((tab) => tab.id === editorTab)?.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-full px-2.5 py-1 font-medium ${
                  hasUnsavedChanges
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {hasUnsavedChanges ? "Unsaved changes" : "Saved"}
              </span>
              {lastSavedAt && (
                <span className="text-muted-foreground">
                  Last checked {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {editorTab === "presets" && (
            <div className="grid gap-4 md:grid-cols-2">
              {THEME_PRESETS.map((preset) => (
                <div key={preset.id} className="rounded-md border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-xl">{preset.name}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-gold)]">
                        {preset.strapline}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {preset.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className="h-5 w-5 rounded-full border border-border"
                          style={{ backgroundColor: swatch }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{preset.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" onClick={() => applyPreset(preset)}>
                      Apply preset
                    </Button>
                    <span className="text-xs text-muted-foreground">Does not publish until saved</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editorTab === "brand" && (
          <>
          <div>
            <Label htmlFor="theme-site-name">Site name</Label>
            <Input
              id="theme-site-name"
              value={form.site_name}
              onChange={(e) => setField("site_name", e.target.value)}
              placeholder="Chaos"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="theme-logo">Logo URL</Label>
            <Input
              id="theme-logo"
              value={form.logo_url}
              onChange={(e) => setField("logo_url", e.target.value)}
              placeholder="https://..."
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Uploads auto-save and apply to the public header. Manual URL edits still need Save changes.
            </p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
              {uploading ? "Uploading..." : "Upload logo image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && uploadThemeImage(e.target.files[0], "logo_url")}
              />
            </label>
          </div>
          </>
          )}

          {editorTab === "hero" && (
          <>
          <div className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="theme-badge">Hero badge label</Label>
              <Input
                id="theme-badge"
                value={form.hero_badge_label}
                onChange={(e) => setField("hero_badge_label", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="theme-hero-media-type">Hero media type</Label>
              <select
                id="theme-hero-media-type"
                value={form.hero_media_type}
                onChange={(e) => setField("hero_media_type", e.target.value as SiteThemeSettings["hero_media_type"])}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <Label htmlFor="theme-animation">Animation preset</Label>
              <select
                id="theme-animation"
                value={form.animation_preset}
                onChange={(e) => setField("animation_preset", e.target.value as SiteThemeSettings["animation_preset"])}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="luxury-fade">Luxury reveal</option>
                <option value="spring-slide">Spring slide</option>
                <option value="classic-fade">Classic fade</option>
              </select>
            </div>
            <div>
              <Label htmlFor="theme-overlay">Hero overlay strength</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  id="theme-overlay"
                  type="range"
                  min="0.15"
                  max="0.9"
                  step="0.05"
                  value={form.hero_overlay_opacity}
                  onChange={(e) => setField("hero_overlay_opacity", Number(e.target.value))}
                  className="w-full"
                />
                <span className="w-12 text-right font-mono text-xs text-muted-foreground">
                  {Math.round(form.hero_overlay_opacity * 100)}%
                </span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="theme-hero-bg">Hero background image URL</Label>
              <Input
                id="theme-hero-bg"
                value={form.hero_background_image_url}
                onChange={(e) => setField("hero_background_image_url", e.target.value)}
                placeholder="https://..."
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Uploaded hero images auto-save. Pasted URLs need Save changes.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                  {uploading ? "Uploading..." : "Upload hero background"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && uploadThemeImage(e.target.files[0], "hero_background_image_url")}
                  />
                </label>
                {form.hero_background_image_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setField("hero_background_image_url", "")}
                    disabled={saving || uploading}
                  >
                    Remove background
                  </Button>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="theme-hero-video">Hero background video URL</Label>
              <Input
                id="theme-hero-video"
                value={form.hero_video_url}
                onChange={(e) => setField("hero_video_url", e.target.value)}
                placeholder="https://.../hero.mp4"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use a short, muted MP4/WebM URL for the cleanest mobile performance.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="theme-title">Homepage headline</Label>
            <Input
              id="theme-title"
              value={form.hero_title}
              onChange={(e) => setField("hero_title", e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="theme-subtitle">Homepage subtitle</Label>
            <Textarea
              id="theme-subtitle"
              rows={4}
              value={form.hero_subtitle}
              onChange={(e) => setField("hero_subtitle", e.target.value)}
              className="mt-1.5"
            />
          </div>
          </>
          )}

          {editorTab === "seo" && (
          <div className="grid gap-4 rounded-md border border-border p-4">
            <div>
              <Label>SEO &amp; sharing</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Control the default browser title, Google description and social preview image for the site.
              </p>
            </div>
            <div>
              <Label htmlFor="theme-seo-title">Default SEO title</Label>
              <Input
                id="theme-seo-title"
                value={form.seo_title}
                onChange={(e) => setField("seo_title", e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">{form.seo_title.length} characters</p>
            </div>
            <div>
              <Label htmlFor="theme-seo-description">Default meta description</Label>
              <Textarea
                id="theme-seo-description"
                rows={3}
                value={form.seo_description}
                onChange={(e) => setField("seo_description", e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">{form.seo_description.length} characters</p>
            </div>
            <div>
              <Label htmlFor="theme-seo-image">Social sharing image URL</Label>
              <Input
                id="theme-seo-image"
                value={form.seo_image_url}
                onChange={(e) => setField("seo_image_url", e.target.value)}
                placeholder="https://..."
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Uploaded sharing images auto-save. Pasted URLs need Save changes.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                  {uploading ? "Uploading..." : "Upload sharing image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && uploadThemeImage(e.target.files[0], "seo_image_url")}
                  />
                </label>
                {form.seo_image_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setField("seo_image_url", DEFAULT_SITE_THEME.seo_image_url)}
                    disabled={saving || uploading}
                  >
                    Use default image
                  </Button>
                )}
              </div>
            </div>
          </div>
          )}

          {editorTab === "hero" && (
          <div className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Hero buttons</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Control the main calls to action in the homepage hero.
              </p>
            </div>
            <div>
              <Label htmlFor="theme-primary-cta-label">Primary button label</Label>
              <Input
                id="theme-primary-cta-label"
                value={form.hero_primary_cta_label}
                onChange={(e) => setField("hero_primary_cta_label", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="theme-primary-cta-url">Primary button URL</Label>
              <Input
                id="theme-primary-cta-url"
                value={form.hero_primary_cta_url}
                onChange={(e) => setField("hero_primary_cta_url", e.target.value)}
                placeholder="/marketplace"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="theme-secondary-cta-label">Secondary button label</Label>
              <Input
                id="theme-secondary-cta-label"
                value={form.hero_secondary_cta_label}
                onChange={(e) => setField("hero_secondary_cta_label", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="theme-secondary-cta-url">Secondary button URL</Label>
              <Input
                id="theme-secondary-cta-url"
                value={form.hero_secondary_cta_url}
                onChange={(e) => setField("hero_secondary_cta_url", e.target.value)}
                placeholder="/sign-up"
                className="mt-1.5"
              />
            </div>
          </div>
          )}

          {editorTab === "brand" && (
          <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="theme-accent">Accent colour</Label>
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
              <Label htmlFor="theme-glow">Glow colour</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  id="theme-glow"
                  type="color"
                  value={form.primary_glow_color}
                  onChange={(e) => setField("primary_glow_color", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-md border border-border bg-background p-1"
                />
                <Input
                  value={form.primary_glow_color}
                  onChange={(e) => setField("primary_glow_color", e.target.value)}
                  placeholder="#E8C97A"
                  className="font-mono"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
              <Checkbox
                checked={form.enable_parallax}
                onCheckedChange={(checked) => setField("enable_parallax", checked === true)}
              />
              Enable parallax accents
            </label>
            <div>
              <Label htmlFor="theme-whatsapp">Contact WhatsApp</Label>
              <Input
                id="theme-whatsapp"
                value={form.contact_whatsapp}
                onChange={(e) => setField("contact_whatsapp", e.target.value)}
                placeholder="+44..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="theme-email">Contact email</Label>
              <Input
                id="theme-email"
                value={form.contact_email}
                onChange={(e) => setField("contact_email", e.target.value)}
                placeholder="hello@chaosgemstones.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="theme-instagram">Instagram URL or handle</Label>
              <Input
                id="theme-instagram"
                value={form.instagram_url}
                onChange={(e) => setField("instagram_url", e.target.value)}
                placeholder="https://www.instagram.com/chaosgemstonemarket"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid gap-4 rounded-md border border-border p-4">
            <div>
              <Label htmlFor="theme-footer-tagline">Footer tagline</Label>
              <Textarea
                id="theme-footer-tagline"
                rows={2}
                value={form.footer_tagline}
                onChange={(e) => setField("footer_tagline", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="theme-footer-notice">Footer notice</Label>
              <Textarea
                id="theme-footer-notice"
                rows={2}
                value={form.footer_notice}
                onChange={(e) => setField("footer_notice", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          </>
          )}

          {editorTab === "layout" && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label>Homepage layout blocks</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Toggle sections on or off and reorder the homepage without editing code.
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
              {form.homepage_layout.map((block, index) => (
                <div key={block.id} className="flex flex-wrap items-center gap-3 p-3">
                  <Checkbox checked={block.enabled} onCheckedChange={() => toggleBlock(index)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{HOMEPAGE_BLOCK_LABELS[block.type]}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{block.type}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0 || saving || uploading}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === form.homepage_layout.length - 1 || saving || uploading}
                    >
                      Down
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {editorTab === "modules" && (
          <div className="grid gap-4 rounded-md border border-border p-4">
            <div>
              <Label>Landing modules</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure the visual discovery strips that make the homepage feel more editorial and interactive.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                <Checkbox
                  checked={form.ticker_enabled}
                  onCheckedChange={(checked) => setField("ticker_enabled", checked === true)}
                />
                Show ticker strip
              </label>
              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                <Checkbox
                  checked={form.shape_grid_enabled}
                  onCheckedChange={(checked) => setField("shape_grid_enabled", checked === true)}
                />
                Show shape grid
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="theme-ticker-speed">Ticker speed</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    id="theme-ticker-speed"
                    type="range"
                    min="12"
                    max="90"
                    step="2"
                    value={form.ticker_speed_seconds}
                    onChange={(e) => setField("ticker_speed_seconds", Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="w-12 text-right font-mono text-xs text-muted-foreground">{form.ticker_speed_seconds}s</span>
                </div>
              </div>
              <div>
                <Label htmlFor="theme-shape-mode">Shape grid mode</Label>
                <select
                  id="theme-shape-mode"
                  value={form.shape_grid_mode}
                  onChange={(e) => setField("shape_grid_mode", e.target.value as SiteThemeSettings["shape_grid_mode"])}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="grid">Grid</option>
                  <option value="carousel">Horizontal carousel</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="theme-shape-title">Shape grid title</Label>
              <Input
                id="theme-shape-title"
                value={form.shape_grid_title}
                onChange={(e) => setField("shape_grid_title", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="theme-ticker-items">Ticker announcements</Label>
              <Textarea
                id="theme-ticker-items"
                rows={4}
                value={form.ticker_items.join("\n")}
                onChange={(e) =>
                  setField(
                    "ticker_items",
                    e.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  )
                }
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">One ticker item per line. Keep each item short.</p>
            </div>
          </div>
          )}

          {editorTab === "copy" && (
          <div>
            <Label>Section copy</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Edit the headings and CTA text for the homepage blocks.
            </p>
            <div className="mt-3 grid gap-4 rounded-md border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="copy-featured-stones-eyebrow">Featured stones eyebrow</Label>
                  <Input
                    id="copy-featured-stones-eyebrow"
                    value={form.homepage_copy.featured_stones_eyebrow}
                    onChange={(e) => setCopyField("featured_stones_eyebrow", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="copy-featured-stones-title">Featured stones title</Label>
                  <Input
                    id="copy-featured-stones-title"
                    value={form.homepage_copy.featured_stones_title}
                    onChange={(e) => setCopyField("featured_stones_title", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="copy-vendors-eyebrow">Vendors eyebrow</Label>
                  <Input
                    id="copy-vendors-eyebrow"
                    value={form.homepage_copy.featured_vendors_eyebrow}
                    onChange={(e) => setCopyField("featured_vendors_eyebrow", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="copy-vendors-title">Vendors title</Label>
                  <Input
                    id="copy-vendors-title"
                    value={form.homepage_copy.featured_vendors_title}
                    onChange={(e) => setCopyField("featured_vendors_title", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="copy-matched-title">Matched pairs title</Label>
                <Input
                  id="copy-matched-title"
                  value={form.homepage_copy.matched_pairs_title}
                  onChange={(e) => setCopyField("matched_pairs_title", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="copy-matched-body">Matched pairs body</Label>
                <Textarea
                  id="copy-matched-body"
                  rows={3}
                  value={form.homepage_copy.matched_pairs_body}
                  onChange={(e) => setCopyField("matched_pairs_body", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="copy-whatsapp-title">WhatsApp CTA title</Label>
                  <Input
                    id="copy-whatsapp-title"
                    value={form.homepage_copy.whatsapp_cta_title}
                    onChange={(e) => setCopyField("whatsapp_cta_title", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="copy-whatsapp-button">WhatsApp button label</Label>
                  <Input
                    id="copy-whatsapp-button"
                    value={form.homepage_copy.whatsapp_cta_button_label}
                    onChange={(e) => setCopyField("whatsapp_cta_button_label", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="copy-whatsapp-body">WhatsApp CTA body</Label>
                <Textarea
                  id="copy-whatsapp-body"
                  rows={3}
                  value={form.homepage_copy.whatsapp_cta_body}
                  onChange={(e) => setCopyField("whatsapp_cta_body", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
          )}

          {editorTab === "preview" && (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground lg:hidden">
              The live preview is shown below on mobile and beside the editor on desktop.
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save} disabled={saving || uploading || !hasUnsavedChanges} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
              {saving ? "Saving..." : hasUnsavedChanges ? "Save changes" : "Saved"}
            </Button>
            <Button type="button" variant="outline" onClick={reloadSavedTheme} disabled={saving || uploading || checkingSaved}>
              {checkingSaved ? "Checking..." : "Reload saved theme"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(DEFAULT_SITE_THEME)} disabled={saving || uploading}>
              Reset to defaults
            </Button>
          </div>
          {hasUnsavedChanges && (
            <p className="text-xs text-amber-700">
              These edits are only in this editor until you press Save changes. Uploaded images save automatically.
            </p>
          )}
        </div>
      </section>

      <aside className={`rounded-md border border-border bg-card p-5 ${editorTab === "preview" ? "lg:col-span-2" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live preview</div>
          {hasUnsavedChanges && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
              Draft preview
            </span>
          )}
        </div>
        <div className="relative mt-4 overflow-hidden rounded-md border border-border bg-primary text-primary-foreground">
          {form.hero_media_type === "image" && form.hero_background_image_url && (
            <img
              src={form.hero_background_image_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {form.hero_media_type === "video" && form.hero_video_url && (
            <video
              src={form.hero_video_url}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(8, 18, 54, ${
                form.hero_background_image_url || form.hero_video_url ? form.hero_overlay_opacity : 0
              })`,
            }}
            aria-hidden="true"
          />
          <div className="relative p-5">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Site logo preview" className="mb-4 h-10 w-10 rounded object-cover" />
            ) : (
              <div className="mb-4 h-10 w-10 rounded bg-white/10" />
            )}
            <div className="mb-4 font-serif text-xl italic tracking-tight">{form.site_name.toUpperCase()}</div>
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{ backgroundColor: form.accent_color, color: readableAccentText(form.accent_color) }}
            >
              {form.hero_badge_label}
            </span>
            <h3 className="mt-4 font-serif text-2xl leading-tight">{form.hero_title}</h3>
            <p className="mt-3 line-clamp-4 text-sm opacity-80">{form.hero_subtitle}</p>
            <button
              type="button"
              className="mt-5 rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: form.accent_color, color: readableAccentText(form.accent_color) }}
            >
              {form.hero_primary_cta_label}
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          This is now a lightweight Shopify-style customiser: editable brand controls plus a modular homepage section order.
        </p>
        <div className="mt-5 rounded-md border border-border bg-background p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Search preview</div>
          <div className="mt-3 text-[11px] text-green-700">chaosgemstones.com</div>
          <div className="mt-1 line-clamp-2 text-sm font-medium text-blue-700">{form.seo_title}</div>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{form.seo_description}</p>
        </div>
        <div className="mt-4 overflow-hidden rounded-md border border-border bg-background">
          {form.seo_image_url ? (
            <img
              src={form.seo_image_url}
              alt=""
              aria-hidden="true"
              className="aspect-[1.91/1] w-full object-cover"
            />
          ) : (
            <div className="aspect-[1.91/1] bg-muted" />
          )}
          <div className="p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Social share</div>
            <div className="mt-1 line-clamp-2 text-sm font-medium">{form.seo_title}</div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{form.seo_description}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function readableAccentText(hex: string): "#081236" | "#FFFFFF" {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return "#081236";
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#081236" : "#FFFFFF";
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
    <div className="mt-8 rounded-md border border-border bg-card p-5">
      <h3 className="font-serif text-lg">Data Cleanup</h3>
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
  );
}
