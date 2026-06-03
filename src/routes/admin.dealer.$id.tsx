import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminGetDealerDetail, adminRunDealerSyncFor } from "@/lib/admin-dealer.functions";
import { adminSetUserRoles, adminBulkUpdateAccounts } from "@/lib/admin.functions";
import { setImpersonation } from "@/lib/impersonation";
import { EditRolesDialog } from "@/components/admin/EditRolesDialog";
import { SendEmailDialog } from "@/components/admin/SendEmailDialog";
import { roleList } from "@/lib/auth.utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dealer/$id")({
  component: DealerDetailPage,
});

function DealerDetailPage() {
  const { id } = Route.useParams();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(adminGetDealerDetail);
  const runSync = useServerFn(adminRunDealerSyncFor);
  const bulk = useServerFn(adminBulkUpdateAccounts);

  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-dealer", id],
    queryFn: () => fetchDetail({ data: { dealerId: id } }),
    enabled: !!isAdmin && !loading,
    staleTime: 30_000,
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) { navigate({ to: "/login", replace: true }); return null; }
  if (!isAdmin) { navigate({ to: "/", replace: true }); return null; }
  if (isLoading || !data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading dealer…</div>;

  const { profile, dealerProfile, stones, counts, syncLogs, apiKey, enquiries, orders, enquiryCounts, analytics } = data;
  if (!profile) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Dealer not found.</div>;

  async function triggerSync() {
    setSyncing(true);
    try {
      const r = await runSync({ data: { dealerId: id } });
      toast.success(`Sync complete: +${r.created} added, ${r.updated} updated, ${r.markedInactive} marked inactive.`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function setApproved(value: boolean) {
    const { error } = await supabase.from("profiles").update({ is_approved: value }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(value ? "Approved" : "Suspended");
    await refetch();
  }

  async function toggleVerified() {
    const { error } = await supabase.from("profiles").update({ is_verified: !profile!.is_verified }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await refetch();
  }

  function viewAs() {
    setImpersonation({
      userId: id,
      userName: profile!.full_name || profile!.company_name || profile!.email || id.slice(0, 8),
    });
    navigate({ to: "/dashboard" });
  }

  // Silence unused-var warning for the alternative bulk path
  void bulk; void qc;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-serif text-2xl italic font-medium tracking-tight">Chaos</Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/admin" className="rounded-md border border-white/20 px-3 py-1 text-xs">← Back to admin</Link>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10" onClick={() => signOut()}>Sign out</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* 1. Account overview */}
        <Section title="Account overview">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
            <Field label="Full name" value={profile.full_name} />
            <Field label="Company" value={profile.company_name} />
            <Field label="Email" value={profile.email} />
            <Field label="Country" value={profile.country} />
            <Field label="Roles" value={roleList(profile).join(", ") || "—"} />
            <Field label="Approved" value={profile.is_approved ? "Yes" : "No"} />
            <Field label="Verified" value={profile.is_verified ? "Yes" : "No"} />
            <Field label="Referral code" value={profile.referral_code} />
            <Field label="Member since" value={new Date(profile.created_at).toLocaleDateString()} />
            <Field label="Referred by" value={profile.referred_by ? String(profile.referred_by).slice(0, 8) : "—"} />
          </div>
        </Section>

        {/* 2. Stone inventory */}
        <Section title="Stone inventory">
          <div className="mb-3 flex flex-wrap gap-4 text-sm">
            <Pill label="Total" value={counts.total} />
            <Pill label="Available" value={counts.available} accent="green" />
            <Pill label="Reserved" value={counts.reserved} accent="amber" />
            <Pill label="Sold" value={counts.sold} />
            <Pill label="Feed inactive" value={counts.feed_inactive} accent="muted" />
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {stones.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No stones listed.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/30 text-left uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Shape</th>
                    <th className="px-3 py-2">Carat</th>
                    <th className="px-3 py-2">Cert</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Listed</th>
                    <th className="px-3 py-2">Views</th>
                    <th className="px-3 py-2">Shares</th>
                    <th className="px-3 py-2">Img</th>
                    <th className="px-3 py-2 text-right">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {stones.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2">{s.stone_type}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.shape ?? "—"}</td>
                      <td className="px-3 py-2">{s.carat_weight ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.cert_lab ? `${s.cert_lab} ${s.cert_number ?? ""}` : "—"}</td>
                      <td className="px-3 py-2 capitalize">{s.status}{s.feed_inactive ? " · inactive" : ""}</td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{s.view_count}</td>
                      <td className="px-3 py-2">{s.share_count}</td>
                      <td className="px-3 py-2">{s.hasImage ? "✓" : "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <Link to="/stone/$id" params={{ id: s.id }} className="text-primary underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>

        {/* 3. Feed sync */}
        <Section title="Feed sync status">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
              <div><span className="text-muted-foreground">URL:</span> <span className="break-all">{dealerProfile?.external_feed_url || "—"}</span></div>
              <div><span className="text-muted-foreground">Method:</span> {dealerProfile?.external_feed_method || "GET"}</div>
              <div><span className="text-muted-foreground">Auto-sync:</span> {dealerProfile?.auto_sync_enabled ? "On" : "Off"}</div>
              <div><span className="text-muted-foreground">Last synced:</span> {dealerProfile?.last_synced_at ? new Date(dealerProfile.last_synced_at).toLocaleString() : "Never"}</div>
              <Button size="sm" disabled={syncing || !dealerProfile?.external_feed_url} onClick={triggerSync}>
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">Last 10 sync runs</div>
              {syncLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No sync history.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-muted/20 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Added</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((l: any) => (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{new Date(l.started_at).toLocaleString()}</td>
                        <td className="px-3 py-2 capitalize">{l.status}</td>
                        <td className="px-3 py-2">{l.stones_added}</td>
                        <td className="px-3 py-2">{l.stones_updated}</td>
                        <td className="px-3 py-2">{Array.isArray(l.errors) ? l.errors.length : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Section>

        {/* 4. API key */}
        <Section title="API key">
          {apiKey ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
              <Field label="Prefix" value={apiKey.key_prefix} />
              <Field label="Active" value={apiKey.is_active ? "Yes" : "No"} />
              <Field label="Created" value={new Date(apiKey.created_at).toLocaleDateString()} />
              <Field label="Last used" value={apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleString() : "Never"} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No write API key issued.</p>
          )}
        </Section>

        {/* 5. Enquiries */}
        <Section title="Enquiries">
          <div className="mb-3 flex flex-wrap gap-4 text-sm">
            <Pill label="Total" value={enquiryCounts.total} />
            <Pill label="Open" value={enquiryCounts.open} accent="amber" />
            <Pill label="Replied" value={enquiryCounts.replied} accent="green" />
            <Pill label="Closed" value={enquiryCounts.closed} />
          </div>
          {enquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enquiries.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
              {enquiries.map((e: any) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-2">
                  <div>
                    <div className="font-medium">{e.jeweller?.company_name || e.jeweller?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.stone ? `${e.stone.carat_weight ?? ""}ct ${e.stone.stone_type}` : "—"} · {new Date(e.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs capitalize">{e.status}</span>
                </li>
              ))}
            </ul>
          )}
          {orders.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-card text-sm">
              <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground">Recent orders</div>
              <ul className="divide-y divide-border">
                {orders.map((o: any) => (
                  <li key={o.id} className="flex items-center justify-between px-4 py-2">
                    <div>{o.jeweller?.company_name || o.jeweller?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.wholesale_price_usd ? `$${Number(o.wholesale_price_usd).toLocaleString()}` : "—"} · {new Date(o.sale_date).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* 6. Analytics */}
        <Section title="Analytics">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 text-sm">
            <Pill label="Total views" value={analytics.totalViews} />
            <Pill label="Total shares" value={analytics.totalShares} />
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Most viewed stone</div>
              {analytics.mostViewed ? (
                <div className="mt-2 flex items-center gap-3">
                  {analytics.mostViewed.imageUrl ? (
                    <img src={analytics.mostViewed.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted" />
                  )}
                  <div>
                    <div className="font-medium">{analytics.mostViewed.carat_weight ?? ""}ct {analytics.mostViewed.stone_type}</div>
                    <div className="text-xs text-muted-foreground">{analytics.mostViewed.view_count} views</div>
                  </div>
                </div>
              ) : <p className="mt-2 text-xs text-muted-foreground">No views yet.</p>}
            </div>
          </div>
        </Section>

        {/* 7. Admin actions */}
        <Section title="Admin actions">
          <div className="flex flex-wrap gap-2">
            {profile.is_approved ? (
              <Button variant="outline" onClick={() => setApproved(false)} className="text-destructive">Suspend</Button>
            ) : (
              <Button onClick={() => setApproved(true)}>Approve</Button>
            )}
            <Button variant="ghost" onClick={toggleVerified}>{profile.is_verified ? "Unverify" : "Verify"}</Button>
            <Button variant="ghost" onClick={() => setEditRolesOpen(true)}>Edit roles</Button>
            <Button variant="ghost" onClick={viewAs}>View as this dealer</Button>
            <Button variant="ghost" onClick={() => setEmailOpen(true)}>Send email</Button>
            <Button variant="ghost" disabled={syncing} onClick={triggerSync}>{syncing ? "Syncing…" : "Trigger feed sync"}</Button>
          </div>
        </Section>
      </div>

      <EditRolesDialog
        open={editRolesOpen}
        onOpenChange={setEditRolesOpen}
        userId={id}
        userName={profile.full_name || profile.company_name || profile.email || ""}
        initialRoles={roleList(profile)}
        onSaved={() => { refetch(); }}
      />
      <SendEmailDialog open={emailOpen} onOpenChange={setEmailOpen} ids={[id]} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-xl text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value || "—"}</div>
    </div>
  );
}

function Pill({ label, value, accent }: { label: string; value: number; accent?: "green" | "amber" | "muted" }) {
  const cls =
    accent === "green" ? "bg-green-50 text-green-800 border-green-200" :
    accent === "amber" ? "bg-amber-50 text-amber-800 border-amber-200" :
    accent === "muted" ? "bg-muted/30 text-muted-foreground border-border" :
    "bg-card text-foreground border-border";
  return (
    <div className={`rounded-md border px-3 py-1.5 text-xs ${cls}`}>
      <span className="uppercase tracking-wider opacity-70">{label}</span> <span className="font-mono ml-1">{value}</span>
    </div>
  );
}