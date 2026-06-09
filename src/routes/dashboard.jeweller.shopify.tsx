import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { SyncProgress, SyncErrorEntry, SyncResult } from "@/lib/shopify.server";

export const Route = createFileRoute("/dashboard/jeweller/shopify")({
  component: ShopifyPage,
});

function ShopifyPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const status = useServerFn(getShopifyStatus);
  const connect = useServerFn(connectShopify);
  const disconnect = useServerFn(disconnectShopify);
  const sync = useServerFn(syncShopifyNow);
  const toggleAuto = useServerFn(setShopifyAutoSync);
  const testConn = useServerFn(testShopifyConnectionFn);
  const dryRun = useServerFn(dryRunShopifySyncFn);

  const [shop, setShop] = useState("aviediamonds.myshopify.com");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectStatus, setConnectStatus] = useState<
    | { kind: "success"; shopName: string }
    | { kind: "error"; message: string }
    | null
  >(null);
  const [testStatus, setTestStatus] = useState<
    | { kind: "success"; shopName: string; productCount: number }
    | { kind: "error"; message: string }
    | null
  >(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [expandedErrors, setExpandedErrors] = useState(false);

  const isJeweller = checkJ(profile);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["shopify-status", user?.id],
    enabled: !!user?.id && isJeweller,
    queryFn: () => status(),
  });

  // Handle OAuth callback redirect params (?connected=1 or ?error=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const err = params.get("error");
    if (connected === "1") {
      toast.success("Shopify connected successfully!");
      setConnectStatus({ kind: "success", shopName: "your store" });
      refetch();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (err) {
      toast.error(err);
      setConnectStatus({ kind: "error", message: err });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!isJeweller) return <div>Jewellers only.</div>;

  const conn = data?.connection;
  const logs = data?.logs ?? [];

  async function handleConnect() {
    if (!shop.trim() || !clientId.trim() || !clientSecret.trim()) {
      toast.error("Enter your store domain, Client ID and Client Secret.");
      return;
    }
    setBusy(true);
    setConnectStatus(null);
    try {
      const res = await connect({
        data: {
          shopDomain: shop.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        },
      }) as any;
      // OAuth redirect — takes user to Shopify to authorise
      if (res?.authorizeUrl) {
        window.location.href = res.authorizeUrl;
        return;
      }
      toast.success("Connected.");
      await refetch();
      qc.invalidateQueries({ queryKey: ["shopify-status"] });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not connect";
      toast.error(message);
      setConnectStatus({ kind: "error", message });
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    setSyncProgress({ phase: "preparing", batch_current: 0, batch_total: 0, stones_processed: 0, stones_total: 0, added: 0, updated: 0, archived: 0, errors: 0 });
    setLastSyncResult(null);
    try {
      const r = await sync({ data: { triggeredBy: "manual_btn" } }) as SyncResult;
      setLastSyncResult(r);
      setSyncProgress(null);
      if (r.errors.length === 0) {
        toast.success(`Sync complete — ${r.added} added, ${r.updated} updated, ${r.archived} archived`);
      } else {
        toast.warning(`Sync partial — ${r.errors.length} error${r.errors.length > 1 ? "s" : ""}. See diagnostics below.`);
      }
      await refetch();
    } catch (e) {
      setSyncProgress(null);
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setTestStatus(null);
    try {
      const r = await testConn();
      if (r.ok) {
        setTestStatus({ kind: "success", shopName: r.shopName, productCount: r.productCount });
        toast.success(`Connection verified — ${r.shopName}`);
      } else {
        setTestStatus({ kind: "error", message: r.error });
        toast.error(r.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Test failed";
      setTestStatus({ kind: "error", message: msg });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview() {
    setBusy(true);
    setPreviewStatus(null);
    try {
      const r = await dryRun();
      setPreviewStatus(r);
      toast.success("Preview generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Shopify? Existing products in Shopify will remain.")) return;
    setBusy(true);
    try {
      await disconnect();
      toast.success("Disconnected");
      setConnectStatus(null);
      setTestStatus(null);
      setPreviewStatus(null);
      await refetch();
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Shopify Sync</h1>
        <p className="text-sm text-muted-foreground">
          Push your curated catalogue into Shopify as real, buyable products.
        </p>
      </div>

      {connectStatus?.kind === "success" && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
          <div>
            <div className="font-medium">Connected to {connectStatus.shopName}</div>
            <div className="text-muted-foreground">Your store is ready to sync.</div>
          </div>
        </div>
      )}
      {connectStatus?.kind === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>
            <div className="font-medium">Connection failed</div>
            <div className="text-muted-foreground">{connectStatus.message}</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : conn ? (
        <ConnectedView
          conn={conn}
          logs={logs}
          busy={busy}
          onSync={handleSync}
          onDisconnect={handleDisconnect}
          onAutoSync={handleAutoSync}
          onTest={handleTest}
          onPreview={handlePreview}
          testStatus={testStatus}
          previewStatus={previewStatus}
        />
      ) : (
        <ConnectForm
          shop={shop}
          setShop={setShop}
          clientId={clientId}
          setClientId={setClientId}
          clientSecret={clientSecret}
          setClientSecret={setClientSecret}
          busy={busy}
          onConnect={handleConnect}
        />
      )}
    </div>
  );
}

function ConnectForm(props: {
  shop: string;
  setShop: (v: string) => void;
  clientId: string;
  setClientId: (v: string) => void;
  clientSecret: string;
  setClientSecret: (v: string) => void;
  busy: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-xl">Connect your Shopify store</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your store URL and the credentials from your Shopify Dev Dashboard app.
          Both values are encrypted before storage and never exposed to the browser.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="shop">Store domain</Label>
            <Input
              id="shop"
              placeholder="aviediamonds.myshopify.com"
              value={props.shop}
              onChange={(e) => props.setShop(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="client-id">Client ID</Label>
            <Input
              id="client-id"
              placeholder="97aae9603a18bd1e4e0ce703c0206380"
              value={props.clientId}
              onChange={(e) => props.setClientId(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Found in dev.shopify.com → your app → Settings → Credentials → Client ID
            </p>
          </div>
          <div>
            <Label htmlFor="client-secret">Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              placeholder="shpss_..."
              value={props.clientSecret}
              onChange={(e) => props.setClientSecret(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Found in dev.shopify.com → your app → Settings → Credentials → Secret (click the eye icon)
            </p>
          </div>
          <Button
            onClick={props.onConnect}
            disabled={props.busy}
            className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
          >
            {props.busy ? "Connecting…" : "Connect store"}
          </Button>
        </div>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-5 text-sm">
        <h2 className="font-serif text-xl">Where to find your credentials</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Go to <a className="underline" href="https://dev.shopify.com/dashboard" target="_blank" rel="noreferrer">dev.shopify.com/dashboard</a> → find your "Chaos Gemstones Feed" app.</li>
          <li>Click the app → go to <strong>Settings</strong>.</li>
          <li>Copy the <strong>Client ID</strong> (visible on screen).</li>
          <li>Click the eye icon next to <strong>Secret</strong> to reveal it, then copy it.</li>
          <li>Paste both values opposite and click <strong>Connect</strong>.</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Static <code>shpat_</code> tokens were deprecated on 1 Jan 2026. Chaos
          now exchanges your Client ID + Secret for a short-lived token that
          auto-refreshes every sync.
        </p>
      </div>
    </div>
  );
}

function ConnectedView({
  conn,
  logs,
  busy,
  onSync,
  onDisconnect,
  onAutoSync,
  onTest,
  onPreview,
  testStatus,
  previewStatus,
}: {
  conn: any;
  logs: any[];
  busy: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  onAutoSync: (enabled: boolean) => void;
  onTest: () => void;
  onPreview: () => void;
  testStatus:
    | { kind: "success"; shopName: string; productCount: number }
    | { kind: "error"; message: string }
    | null;
  previewStatus: {
    wouldAdd: number;
    wouldUpdate: number;
    wouldArchive: number;
    feedStoneCount: number;
    errors: string[];
  } | null;
}) {
  const tokenValid =
    conn.token_expires_at && new Date(conn.token_expires_at).getTime() > Date.now();
  const incomplete = !conn.shop_name || !conn.shop_domain;
  return (
    <>
      {incomplete && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>Connection details incomplete — try reconnecting.</div>
        </div>
      )}
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </div>
            <div className="mt-1 font-serif text-xl">{conn.shop_name || conn.shop_domain}</div>
            <div className="text-xs text-muted-foreground">{conn.shop_domain}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onTest} disabled={busy}>
              <Plug className="mr-1 h-3 w-3" /> Test connection
            </Button>
            <Button size="sm" variant="outline" onClick={onPreview} disabled={busy}>
              <Eye className="mr-1 h-3 w-3" /> Preview sync
            </Button>
            <Button
              size="sm"
              onClick={onSync}
              disabled={busy}
              className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
            >
              <RefreshCw className="mr-1 h-3 w-3" /> {busy ? "Syncing…" : "Sync now"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDisconnect} disabled={busy}>
              <Unlink className="mr-1 h-3 w-3" /> Disconnect
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Stat label="Store" value={conn.shop_domain ?? "—"} />
          <Stat label="Shop name" value={conn.shop_name ?? "—"} />
          <Stat label="Connected" value={conn.created_at ? new Date(conn.created_at).toLocaleDateString() : "—"} />
          <Stat label="Last sync" value={conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : "Never"} />
          <Stat label="Products synced" value={String(conn.products_synced ?? 0)} />
          <Stat
            label="Token"
            value={
              conn.token_expires_at
                ? tokenValid
                  ? `Valid until ${new Date(conn.token_expires_at).toLocaleTimeString()}`
                  : "Expired (click Sync to refresh)"
                : "—"
            }
          />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
          <div>
            <div className="text-sm font-medium">Auto-sync</div>
            <div className="text-xs text-muted-foreground">Sync every 4 hours automatically.</div>
          </div>
          <Switch checked={!!conn.auto_sync} onCheckedChange={onAutoSync} />
        </div>
      </div>

      {testStatus?.kind === "success" && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
          <div>
            Connection verified — connected to <strong>{testStatus.shopName}</strong>,{" "}
            {testStatus.productCount} existing product
            {testStatus.productCount === 1 ? "" : "s"} in store.
          </div>
        </div>
      )}
      {testStatus?.kind === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>Test failed: {testStatus.message}</div>
        </div>
      )}

      {previewStatus && (
        <div className="rounded-md border border-border bg-card p-5 text-sm">
          <div className="font-medium">Sync preview</div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• {previewStatus.feedStoneCount} stones currently in your feed</li>
            <li>• {previewStatus.wouldAdd} would be created as new Shopify products</li>
            <li>• {previewStatus.wouldUpdate} would be updated</li>
            <li>• {previewStatus.wouldArchive} would be archived (no longer in feed)</li>
            <li>• {previewStatus.errors.length} errors detected</li>
          </ul>
          {previewStatus.errors.length > 0 && (
            <div className="mt-2 text-destructive">{previewStatus.errors.join(" · ")}</div>
          )}
        </div>
      )}

      <div>
        <h2 className="font-serif text-xl">Recent syncs</h2>

        {/* ── Live progress bar (visible while sync is running) ── */}
        {syncProgress && syncProgress.phase !== "done" && (
          <SyncProgressPanel progress={syncProgress} />
        )}

        {/* ── Last sync diagnostic result ── */}
        {lastSyncResult && (
          <SyncDiagnosticPanel
            result={lastSyncResult}
            expanded={expandedErrors}
            onToggle={() => setExpandedErrors((v) => !v)}
          />
        )}

        <div className="mt-3 overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left">When</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Added</th>
                <th className="px-4 py-2 text-right">Updated</th>
                <th className="px-4 py-2 text-right">Archived</th>
                <th className="px-4 py-2 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-2 text-muted-foreground">{new Date(l.started_at).toLocaleString()}</td>
                  <td className="px-4 py-2 capitalize">{l.status}</td>
                  <td className="px-4 py-2 text-right">{l.stones_added}</td>
                  <td className="px-4 py-2 text-right">{l.stones_updated}</td>
                  <td className="px-4 py-2 text-right">{l.stones_archived}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.error_message ?? "—"}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No syncs yet. Click "Sync now" to push your stones to Shopify.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
void timeAgo;

// ── Sync progress bar ─────────────────────────────────────────────────────────

function SyncProgressPanel({ progress }: { progress: SyncProgress }) {
  const pct = progress.stones_total > 0
    ? Math.round((progress.stones_processed / progress.stones_total) * 100)
    : 0;

  const phaseLabel = {
    preparing: "Preparing…",
    upsert:    `Processing batch ${progress.batch_current} of ${progress.batch_total}`,
    archive:   `Archiving removed stones (batch ${progress.batch_current} of ${progress.batch_total})`,
    done:      "Complete",
  }[progress.phase];

  return (
    <div className="mt-4 rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{phaseLabel}</span>
        <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--color-gold)] transition-all duration-300"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>+{progress.added} added</span>
        <span>~{progress.updated} updated</span>
        <span>↓{progress.archived} archived</span>
        {progress.errors > 0 && (
          <span className="text-destructive">✗ {progress.errors} error{progress.errors > 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}

// ── Post-sync diagnostic panel ─────────────────────────────────────────────────

function SyncDiagnosticPanel({
  result,
  expanded,
  onToggle,
}: {
  result: SyncResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasErrors = result.error_manifest.length > 0;
  const statusColour = !hasErrors
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : result.added + result.updated > 0
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-destructive bg-destructive/5 border-destructive/20";

  const statusLabel = !hasErrors
    ? "Completed — all stones synced"
    : result.added + result.updated > 0
      ? `Partial — ${result.error_manifest.length} stone${result.error_manifest.length > 1 ? "s" : ""} failed`
      : "Failed — no stones synced";

  const actionLabel = (a: SyncErrorEntry["action"]) =>
    ({ create: "CREATE", update: "UPDATE", archive: "ARCHIVE" })[a];

  return (
    <div className={`mt-4 rounded-md border p-4 ${statusColour}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium">{statusLabel}</div>
        <div className="flex gap-4 text-xs">
          <span>+{result.added} added</span>
          <span>~{result.updated} updated</span>
          <span>↓{result.archived} archived</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            session {result.session_id.slice(0, 8)}
          </span>
        </div>
      </div>

      {hasErrors && (
        <>
          <button
            onClick={onToggle}
            className="mt-2 text-xs underline underline-offset-2 opacity-70 hover:opacity-100"
          >
            {expanded ? "Hide" : "Show"} error manifest ({result.error_manifest.length} entries)
          </button>
          {expanded && (
            <div className="mt-3 overflow-auto rounded border border-current/20 bg-white/60">
              <table className="w-full text-xs">
                <thead className="bg-black/5">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Action</th>
                    <th className="px-3 py-1.5 text-left font-medium">Cert / Stone ID</th>
                    <th className="px-3 py-1.5 text-left font-medium">HTTP</th>
                    <th className="px-3 py-1.5 text-left font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.error_manifest.map((e, i) => (
                    <tr key={i} className="border-t border-current/10">
                      <td className="px-3 py-1.5">
                        <span className="rounded bg-black/10 px-1.5 py-0.5 font-mono">
                          {actionLabel(e.action)}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {e.cert_number ?? e.stone_id.slice(0, 12)}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {e.http_status ?? "—"}
                      </td>
                      <td className="max-w-xs px-3 py-1.5 break-words">{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}