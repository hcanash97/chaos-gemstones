import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Unlink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

  const [shop, setShop] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const isJeweller = profile?.account_type === "jeweller";

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["shopify-status", user?.id],
    enabled: !!user?.id && isJeweller,
    queryFn: () => status(),
  });

  if (!isJeweller) return <div>Jewellers only.</div>;

  const conn = data?.connection;
  const logs = data?.logs ?? [];

  async function handleConnect() {
    if (!shop.trim() || !token.trim()) {
      toast.error("Enter both your store domain and Admin API token.");
      return;
    }
    setBusy(true);
    try {
      const res = await connect({ data: { shopDomain: shop.trim(), accessToken: token.trim() } });
      toast.success(`Connected to ${res.shopName}`);
      setShop("");
      setToken("");
      await refetch();
      qc.invalidateQueries({ queryKey: ["shopify-status"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect");
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

  async function handleDisconnect() {
    if (!confirm("Disconnect Shopify? Existing products in Shopify will remain.")) return;
    setBusy(true);
    try {
      await disconnect();
      toast.success("Disconnected");
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
        />
      ) : (
        <ConnectForm
          shop={shop}
          setShop={setShop}
          token={token}
          setToken={setToken}
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
  token: string;
  setToken: (v: string) => void;
  busy: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-xl">Connect your Shopify store</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your store URL and an Admin API access token. Your token is
          encrypted before storage.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="shop">Store domain</Label>
            <Input
              id="shop"
              placeholder="your-store.myshopify.com"
              value={props.shop}
              onChange={(e) => props.setShop(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="token">Admin API access token</Label>
            <Input
              id="token"
              type="password"
              placeholder="shpat_..."
              value={props.token}
              onChange={(e) => props.setToken(e.target.value)}
            />
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
        <h2 className="font-serif text-xl">How to get your Admin API token</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>In Shopify admin, open <strong>Settings → Apps and sales channels</strong>.</li>
          <li>Click <strong>Develop apps</strong> → <strong>Create an app</strong>. Name it "Chaos Sync".</li>
          <li>Open <strong>Configuration → Admin API scopes</strong> and enable <code>write_products</code> and <code>read_products</code>.</li>
          <li>Click <strong>Install app</strong>, then copy the <strong>Admin API access token</strong> (starts with <code>shpat_</code>).</li>
          <li>Paste your <code>myshopify.com</code> domain and the token here.</li>
        </ol>
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
}: {
  conn: any;
  logs: any[];
  busy: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  onAutoSync: (enabled: boolean) => void;
}) {
  return (
    <>
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Connected store</div>
            <div className="mt-1 font-serif text-xl">{conn.shop_name || conn.shop_domain}</div>
            <div className="text-xs text-muted-foreground">{conn.shop_domain}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          <Stat label="Last sync" value={conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : "Never"} />
          <Stat label="Status" value={conn.last_sync_status ?? "—"} />
          <Stat label="Products synced" value={String(conn.products_synced ?? 0)} />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
          <div>
            <div className="text-sm font-medium">Auto-sync</div>
            <div className="text-xs text-muted-foreground">Sync every 4 hours automatically.</div>
          </div>
          <Switch checked={!!conn.auto_sync} onCheckedChange={onAutoSync} />
        </div>
      </div>

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