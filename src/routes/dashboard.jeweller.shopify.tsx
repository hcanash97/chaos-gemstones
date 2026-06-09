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
  const [previewStatus, setPreviewStatus] = useState<{
    wouldAdd: number;
    wouldUpdate: number;
    wouldArchive: number;
    feedStoneCount: number;
    errors: string[];
  } | null>(null);

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
      });
      if (res.authorizeUrl) {
        toast.success("Redirecting to Shopify to authorise…");
        window.location.href = res.authorizeUrl;
        return;
      }
      toast.success(`Connected to ${res.shopName}`);
      setConnectStatus({ kind: "success", shopName: res.shopName });
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
    try {
      const r = await sync();
      toast.success(`Sync complete — ${r.added} added, ${r.updated} updated, ${r.archived} archived`);
      await refetch();
    } catch (e) {
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
    <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-md border-2 border-[var(--color-gold)]/60 bg-card p-5 shadow-[0_4px_24px_-12px_var(--color-gold)]">
        <h2 className="font-serif text-xl">Connect your Shopify store</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          As of Shopify's 2026 updates, static <code>shpat_</code> tokens are no longer
          issued. Paste your <strong>Client ID</strong> and <strong>Client Secret</strong>
          from your Shopify Developer Dashboard app — Chaos mints a short-lived access
          token via Client Credentials Exchange on every sync. Your secret is encrypted
          before storage and never exposed to the browser.
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
            <Label htmlFor="client-id">Shopify Client ID / API Key</Label>
            <Input
              id="client-id"
              placeholder="e.g., 4bca..."
              value={props.clientId}
              onChange={(e) => props.setClientId(e.target.value)}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Found in your Shopify Developer Dashboard → App → Settings → Client ID
            </p>
          </div>
          <div>
            <Label htmlFor="client-secret">Shopify Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              placeholder="e.g., shpss_..."
              value={props.clientSecret}
              onChange={(e) => props.setClientSecret(e.target.value)}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Found in App → Settings → Client Secret (click reveal). Stored encrypted at rest.
            </p>
          </div>
          <Button
            onClick={props.onConnect}
            disabled={props.busy}
            className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
          >
            {props.busy ? "Verifying credentials…" : "Connect store"}
          </Button>
        </div>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-5 text-sm">
        <h2 className="font-serif text-xl">Where to find your credentials</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Sign in to <a className="underline" href="https://dev.shopify.com/dashboard" target="_blank" rel="noreferrer">dev.shopify.com/dashboard</a> and open your app.</li>
          <li>Go to <strong>Settings → Configuration</strong>.</li>
          <li>Copy the <strong>Client ID / API Key</strong>.</li>
          <li>Reveal and copy the <strong>Client Secret</strong>.</li>
          <li>Paste both opposite and click <strong>Connect store</strong>.</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Static <code>shpat_</code> tokens were deprecated by Shopify in 2026 and are
          no longer issued. Chaos uses the modern Client Credentials Exchange flow —
          fresh tokens are minted server-side on every sync and never persisted.
        </p>
      </div>
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
  const hasToken = !!conn.has_token;
  const incomplete = !hasToken;
  return (
    <>
      {incomplete && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>
            Connection details incomplete — access token missing. Click
            Disconnect, then Connect store again to complete the Shopify
            authorisation flow.
          </div>
        </div>
      )}
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {hasToken ? (
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Awaiting authorisation
              </div>
            )}
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
            value={hasToken ? "Stored ✓" : "Missing — reconnect"}
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