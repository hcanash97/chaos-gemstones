import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, RefreshCw, Unlink, XCircle, Eye, Plug } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller as checkJ } from "@/lib/auth.utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  connectShopify,
  disconnectShopify,
  getShopifyStatus,
  setShopifyAutoSync,
  syncShopifyNow,
  testShopifyConnectionFn,
  dryRunShopifySyncFn,
} from "@/lib/shopify.functions";

export const Route = createFileRoute("/dashboard/jeweller/shopify")({
  component: ShopifyPage,
});

function ShopifyPage() {
  const { user, profile } = useAuth();
  const status  = useServerFn(getShopifyStatus);
  const connect    = useServerFn(connectShopify);
  const disconnect = useServerFn(disconnectShopify);
  const sync       = useServerFn(syncShopifyNow);
  const toggleAuto = useServerFn(setShopifyAutoSync);
  const testConn   = useServerFn(testShopifyConnectionFn);
  const dryRun     = useServerFn(dryRunShopifySyncFn);

  const [shop, setShop]               = useState("aviediamonds.myshopify.com");
  const [clientId, setClientId]       = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy]               = useState(false);
  const [banner, setBanner]           = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [testStatus, setTestStatus]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [preview, setPreview]         = useState<{
    wouldAdd: number; wouldUpdate: number; wouldArchive: number;
    feedStoneCount: number; errors: string[];
  } | null>(null);
  const [syncBatchMsg, setSyncBatchMsg] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{
    added: number;
    updated: number;
    archived: number;
    errors: string[];
  } | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const isJeweller = checkJ(profile);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["shopify-status", user?.id],
    enabled: !!user?.id && isJeweller,
    queryFn: () => status(),
    retry: false,
  });

  // Read OAuth callback params from URL (?connected=1 or ?error=...)
  useEffect(() => {
    const p   = new URLSearchParams(window.location.search);
    const ok  = p.get("connected");
    const err = p.get("error");
    if (ok === "1") {
      setBanner({ kind: "ok", msg: "Shopify connected successfully!" });
      refetch();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (err) {
      setBanner({ kind: "err", msg: decodeURIComponent(err) });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!isJeweller) return <p className="p-4 text-sm">Jewellers only.</p>;

  const conn = data?.connection ?? null;
  const logs = data?.logs ?? [];

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleConnect() {
    if (!shop.trim() || !clientId.trim() || !clientSecret.trim()) {
      toast.error("Enter store domain, Client ID and Client Secret.");
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const res = await connect({
        data: { shopDomain: shop.trim(), clientId: clientId.trim(), clientSecret: clientSecret.trim() },
      }) as any;
      if (res?.authorizeUrl) {
        window.location.href = res.authorizeUrl;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not connect";
      setBanner({ kind: "err", msg });
      toast.error(msg);
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    setSyncBatchMsg("Starting sync…");
    setLastSyncResult(null);
    try {
      const r = await sync() as any;
      setSyncBatchMsg(null);
      setLastSyncResult({
        added: r.added ?? 0,
        updated: r.updated ?? 0,
        archived: r.archived ?? 0,
        errors: Array.isArray(r.errors) ? r.errors : [],
      });
      toast.success(`Sync complete — +${r.added} added, ~${r.updated} updated, ↓${r.archived} archived${r.errors?.length ? ` (${r.errors.length} errors)` : ""}`);
      await refetch();
    } catch (e) {
      setSyncBatchMsg(null);
      const msg = e instanceof Error ? e.message : "Sync failed";
      setLastSyncResult({ added: 0, updated: 0, archived: 0, errors: [msg] });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setTestStatus(null);
    try {
      const r = await testConn() as any;
      if (r.ok) {
        setTestStatus({ ok: true, msg: `Connected — ${r.shopName}, ${r.productCount} products` });
      } else {
        setTestStatus({ ok: false, msg: r.error ?? "Test failed" });
      }
    } catch (e) {
      setTestStatus({ ok: false, msg: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview() {
    setBusy(true);
    setPreview(null);
    try {
      const r = await dryRun() as any;
      setPreview(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Shopify? Existing Shopify products will remain untouched.")) return;
    setBusy(true);
    try {
      await disconnect();
      setBanner(null);
      setTestStatus(null);
      setPreview(null);
      setSyncBatchMsg(null);
      await refetch();
      toast.success("Disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect");
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoSync(enabled: boolean) {
    try {
      await toggleAuto({ data: { enabled } });
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update auto-sync");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Shopify Sync</h1>
        <p className="text-sm text-muted-foreground">
          Push your curated catalogue into Shopify as real, buyable products.
        </p>
      </div>

      {banner && (
        <div className={`flex items-start gap-2 rounded-md border p-4 text-sm ${
          banner.kind === "ok"
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-destructive/40 bg-destructive/10"
        }`}>
          {banner.kind === "ok"
            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            : <XCircle       className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
          <span>{banner.msg}</span>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : conn ? (
        <>
          {/* ── Connected panel ── */}
          <div className="rounded-md border border-border bg-card p-5">
            {(!conn.shop_name || !conn.shop_domain) && (
              <div className="mb-4 flex items-center gap-2 rounded border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Connection details incomplete — click Disconnect then Connect again.
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </div>
                <p className="mt-1 font-serif text-xl">{conn.shop_name || conn.shop_domain}</p>
                <p className="text-xs text-muted-foreground">{conn.shop_domain}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleTest} disabled={busy}>
                  <Plug className="mr-1 h-3 w-3" /> Test
                </Button>
                <Button size="sm" variant="outline" onClick={handlePreview} disabled={busy}>
                  <Eye className="mr-1 h-3 w-3" /> Preview
                </Button>
                <Button
                  size="sm" onClick={handleSync} disabled={busy}
                  className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  {busy && syncBatchMsg ? syncBatchMsg : "Sync now"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={busy}>
                  <Unlink className="mr-1 h-3 w-3" /> Disconnect
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Store", conn.shop_domain ?? "—"],
                ["Shop name", conn.shop_name ?? "—"],
                ["Connected", conn.created_at ? new Date(conn.created_at).toLocaleDateString("en-GB") : "—"],
                ["Last sync", conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString("en-GB") : "Never"],
                ["Products synced", String(conn.products_synced ?? 0)],
                ["Last status", conn.last_sync_status ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-border bg-card p-3">
                  <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="mt-0.5 font-medium">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Auto-sync</p>
                <p className="text-xs text-muted-foreground">Sync every 4 hours automatically.</p>
              </div>
              <Switch checked={!!conn.auto_sync} onCheckedChange={handleAutoSync} />
            </div>
          </div>

          {/* ── Test result ── */}
          {testStatus && (
            <div className={`flex items-start gap-2 rounded-md border p-4 text-sm ${
              testStatus.ok
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-destructive/40 bg-destructive/10"
            }`}>
              {testStatus.ok
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                : <XCircle       className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
              <span>{testStatus.msg}</span>
            </div>
          )}

          {/* ── Sync progress ── */}
          {busy && syncBatchMsg && (
            <div className="rounded-md border border-border bg-card p-4 text-sm">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-gold)]" />
                <span>{syncBatchMsg}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--color-gold)]" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Pushing stones to Shopify in batches of 10 — please don't close this page.
              </p>
            </div>
          )}

          {/* ── Diagnostic box — last sync result ── */}
          {lastSyncResult && (
            <div className={`rounded-md border p-5 ${
              lastSyncResult.errors.length
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-emerald-500/40 bg-emerald-500/5"
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {lastSyncResult.errors.length
                    ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                    : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  <p className="font-medium">
                    {lastSyncResult.errors.length
                      ? `Sync finished with ${lastSyncResult.errors.length} issue${lastSyncResult.errors.length === 1 ? "" : "s"}`
                      : "Sync completed successfully"}
                  </p>
                </div>
                <button
                  className="text-xs underline text-muted-foreground"
                  onClick={() => setLastSyncResult(null)}
                >
                  Dismiss
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded border border-border bg-card p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Added</div>
                  <div className="mt-0.5 text-lg font-semibold text-emerald-600">+{lastSyncResult.added}</div>
                </div>
                <div className="rounded border border-border bg-card p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Updated</div>
                  <div className="mt-0.5 text-lg font-semibold">~{lastSyncResult.updated}</div>
                </div>
                <div className="rounded border border-border bg-card p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Archived</div>
                  <div className="mt-0.5 text-lg font-semibold text-muted-foreground">↓{lastSyncResult.archived}</div>
                </div>
              </div>
              {lastSyncResult.errors.length > 0 && (
                <details className="mt-4" open>
                  <summary className="cursor-pointer text-sm font-medium">
                    Error details ({lastSyncResult.errors.length})
                  </summary>
                  <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded border border-border bg-card p-3 text-xs font-mono">
                    {lastSyncResult.errors.map((err, i) => (
                      <li key={i} className="break-words text-destructive">• {err}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Common causes: Shopify API rate limits (will retry next sync), missing required fields on stones, or rejected images. Stones not in this list were synced successfully.
                  </p>
                </details>
              )}
            </div>
          )}

          {/* ── Preview ── */}
          {preview && (
            <div className="rounded-md border border-border bg-card p-5 text-sm">
              <p className="font-medium">Sync preview</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• {preview.feedStoneCount} stones in your feed</li>
                <li>• {preview.wouldAdd} would be created as new Shopify products</li>
                <li>• {preview.wouldUpdate} would be updated</li>
                <li>• {preview.wouldArchive} would be archived (removed from feed)</li>
              </ul>
              {preview.errors.length > 0 && (
                <p className="mt-2 text-destructive">{preview.errors.join(" · ")}</p>
              )}
            </div>
          )}

          {/* ── Recent syncs ── */}
          <div>
            <h2 className="font-serif text-xl">Recent syncs</h2>
            <div className="mt-3 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">When</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Added</th>
                    <th className="px-4 py-2 text-right font-medium">Updated</th>
                    <th className="px-4 py-2 text-right font-medium">Archived</th>
                    <th className="px-4 py-2 text-left font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => (
                    <>
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(l.started_at).toLocaleString("en-GB")}
                        </td>
                        <td className="px-4 py-2 capitalize">
                          <span className={
                            l.status === "ok" ? "text-emerald-600"
                            : l.status === "error" ? "text-destructive"
                            : l.status === "partial" ? "text-amber-600"
                            : ""
                          }>{l.status}</span>
                        </td>
                        <td className="px-4 py-2 text-right">{l.stones_added ?? 0}</td>
                        <td className="px-4 py-2 text-right">{l.stones_updated ?? 0}</td>
                        <td className="px-4 py-2 text-right">{l.stones_archived ?? 0}</td>
                        <td className="px-4 py-2 text-xs">
                          {l.error_message ? (
                            <button
                              className="text-destructive underline"
                              onClick={() => setExpandedLog(expandedLog === l.id ? null : l.id)}
                            >
                              {expandedLog === l.id ? "Hide" : "View"} errors
                            </button>
                          ) : "—"}
                        </td>
                      </tr>
                      {expandedLog === l.id && l.error_message && (
                        <tr className="border-t border-border bg-muted/30">
                          <td colSpan={6} className="px-4 py-3 text-xs font-mono text-destructive">
                            {l.error_message.split(" | ").map((e: string, i: number) => (
                              <div key={i} className="break-words">• {e}</div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No syncs yet — click Sync now to push your stones to Shopify.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ── Connect form ── */
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="font-serif text-xl">Connect your Shopify store</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials from the Shopify Dev Dashboard. Both values are
              encrypted before storage and never exposed to the browser.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="shop">Store domain</Label>
                <Input
                  id="shop" value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  placeholder="aviediamonds.myshopify.com"
                />
              </div>
              <div>
                <Label htmlFor="cid">Client ID</Label>
                <Input
                  id="cid" value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="97aae9603a18bd1e4e0ce703c0206380"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  dev.shopify.com → your app → Settings → Credentials → Client ID
                </p>
              </div>
              <div>
                <Label htmlFor="csec">Client Secret</Label>
                <Input
                  id="csec" type="password" value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="shpss_..."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  dev.shopify.com → your app → Settings → Credentials → Secret (click eye icon)
                </p>
              </div>
              <Button
                onClick={handleConnect} disabled={busy}
                className="w-full bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
              >
                {busy ? "Redirecting to Shopify…" : "Connect store →"}
              </Button>
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-5 text-sm">
            <h2 className="font-serif text-xl">How to connect</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>Go to <a href="https://dev.shopify.com/dashboard" target="_blank" rel="noreferrer" className="underline text-foreground">dev.shopify.com/dashboard</a> and find your <strong>Chaos Gemstones Feed</strong> app.</li>
              <li>Click the app → <strong>Settings</strong> → copy the <strong>Client ID</strong>.</li>
              <li>Click the eye icon next to <strong>Secret</strong> → copy the <code>shpss_...</code> value.</li>
              <li>Paste both above and click <strong>Connect store</strong>.</li>
              <li>You'll be redirected to Shopify to approve — click <strong>Install</strong>.</li>
              <li>You'll land back here showing <strong>Connected</strong>.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
