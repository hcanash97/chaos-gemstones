import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Copy, Eye, EyeOff, RefreshCw, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getDealerApiStatus, generateDealerApiKey, updateDealerSyncSettings, runDealerSync,
} from "@/lib/dealer-api.functions";

export const Route = createFileRoute("/dashboard/dealer/api")({ component: DealerApiPage });

function DealerApiPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getDealerApiStatus);
  const createKey = useServerFn(generateDealerApiKey);
  const saveSync = useServerFn(updateDealerSyncSettings);
  const triggerSync = useServerFn(runDealerSync);

  const [revealed, setRevealed] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [autoSync, setAutoSync] = useState(false);

  const isDealer = profile?.account_type === "dealer";

  const { data: status, refetch } = useQuery({
    queryKey: ["dealer-api-status", user?.id],
    enabled: !!user?.id && isDealer,
    queryFn: () => fetchStatus(),
  });

  useEffect(() => {
    if (status?.dealerProfile) {
      setFeedUrl(status.dealerProfile.external_feed_url ?? "");
      setAutoSync(!!status.dealerProfile.auto_sync_enabled);
    }
  }, [status?.dealerProfile]);

  if (!isDealer) return <div>Dealers only.</div>;

  const activeKey = status?.key ?? null;

  async function generate() {
    setGenerating(true);
    try {
      const result = await createKey();
      setRevealed(result.rawKey);
      await refetch();
      qc.invalidateQueries({ queryKey: ["dealer-api-status"] });
      toast.success("Write API key generated. Copy it now — it cannot be retrieved later.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate key");
    } finally {
      setGenerating(false);
    }
  }

  async function saveSettings() {
    try {
      await saveSync({
        data: {
          external_feed_url: feedUrl.trim() || null,
          auto_sync_enabled: autoSync,
        },
      });
      toast.success("Sync settings saved");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const result = await triggerSync();
      toast.success(`Synced — ${result.created} added, ${result.updated} updated, ${result.markedInactive} marked inactive`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Developer API</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your own inventory system to Chaos. Use our API to create, update,
          and remove stone listings automatically without logging in to the dashboard.
        </p>
        <Link to="/docs/dealer-api" className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--color-gold)] hover:underline">
          <BookOpen className="h-3.5 w-3.5" /> Read the full API docs
        </Link>
      </div>

      <section className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your write API key</div>
            <div className="mt-1 break-all font-mono text-sm">
              {revealed ?? (activeKey ? `${activeKey.key_prefix ?? "chaos_"}${"•".repeat(40)}` : "No key yet")}
            </div>
            {activeKey?.last_used_at && (
              <div className="mt-1 text-xs text-muted-foreground">
                Last used {new Date(activeKey.last_used_at).toLocaleString()}
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {revealed && (
              <>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(revealed); toast.success("Copied"); }}>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRevealed(null)}>
                  <EyeOff className="mr-1 h-3 w-3" />
                </Button>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                  <RefreshCw className="mr-1 h-3 w-3" /> {activeKey ? "Regenerate" : "Generate"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{activeKey ? "Regenerate API key?" : "Generate API key?"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {activeKey
                      ? "Your existing key will be deactivated immediately. Any external integrations using it will stop working until you update them."
                      : "A new key will be generated. Copy it immediately — it cannot be retrieved later."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={generate} disabled={generating}>
                    {generating ? "Generating…" : "Generate"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {revealed && (
          <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            Store this key securely. It allows full write access to your Chaos inventory.
            Do not share it publicly or commit it to a repository.
          </div>
        )}
      </section>

      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-xl">Sync URL</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional: paste a URL that returns your inventory as JSON or CSV. Chaos will fetch
          and upsert stones by <code>cert_number</code>.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="feedUrl">Feed URL</Label>
            <Input
              id="feedUrl"
              type="url"
              placeholder="https://your-system.example.com/inventory.json"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="autoSync" checked={autoSync} onCheckedChange={setAutoSync} />
            <Label htmlFor="autoSync" className="text-sm">Auto-sync every 24 hours</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={saveSettings}>Save settings</Button>
            <Button size="sm" onClick={sync} disabled={syncing || !feedUrl.trim()}>
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
          {status?.dealerProfile?.last_synced_at && (
            <div className="text-xs text-muted-foreground">
              Last synced {new Date(status.dealerProfile.last_synced_at).toLocaleString()}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl">Recent sync log</h2>
        <div className="mt-3 overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Added</th>
                <th className="px-3 py-2 text-right">Updated</th>
                <th className="px-3 py-2 text-right">Marked inactive</th>
                <th className="px-3 py-2 text-right">Errors</th>
              </tr>
            </thead>
            <tbody>
              {(status?.syncLogs ?? []).map((log: any) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-3 py-2">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 capitalize">{log.status}</td>
                  <td className="px-3 py-2 text-right">{log.stones_added}</td>
                  <td className="px-3 py-2 text-right">{log.stones_updated}</td>
                  <td className="px-3 py-2 text-right">{log.stones_marked_inactive}</td>
                  <td className="px-3 py-2 text-right">{Array.isArray(log.errors) ? log.errors.length : 0}</td>
                </tr>
              ))}
              {!status?.syncLogs?.length && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No sync runs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}