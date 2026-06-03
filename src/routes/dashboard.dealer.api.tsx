import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Copy, Eye, EyeOff, RefreshCw, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { isDealer as checkD } from "@/lib/auth.utils";
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
import { fetchExternalFeed } from "@/lib/feed-fetch.functions";
import { detectPreset } from "@/lib/dealer-feed-mappings";

export const Route = createFileRoute("/dashboard/dealer/api")({ component: DealerApiPage });

function DealerApiPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getDealerApiStatus);
  const createKey = useServerFn(generateDealerApiKey);
  const saveSync = useServerFn(updateDealerSyncSettings);
  const triggerSync = useServerFn(runDealerSync);
  const fetchFeed = useServerFn(fetchExternalFeed);

  const [revealed, setRevealed] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [body, setBody] = useState("");
  const [lastPreset, setLastPreset] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: true; rowCount: number; preset: string; sample: string }
    | { ok: false; error: string }
    | null
  >(null);

  const isDealer = checkD(profile);

  const { data: status, refetch } = useQuery({
    queryKey: ["dealer-api-status", user?.id],
    enabled: !!user?.id && isDealer,
    queryFn: () => fetchStatus(),
  });

  useEffect(() => {
    if (status?.dealerProfile) {
      const dp = status.dealerProfile as any;
      setFeedUrl(dp.external_feed_url ?? "");
      setAutoSync(!!dp.auto_sync_enabled);
      setMethod((dp.external_feed_method as "GET" | "POST") ?? "GET");
      setBody(dp.external_feed_body ?? "");
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
          external_feed_method: method,
          external_feed_body: method === "POST" ? body.trim() || null : null,
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
      setLastPreset(result.preset?.label ?? "Custom mapping");
      const errCount = Array.isArray(result.errors) ? result.errors.length : 0;
      if (errCount > 0) {
        toast.warning(
          `Sync completed with issues: ${result.created} added, ${result.updated} updated, ${errCount} error${errCount === 1 ? "" : "s"}`,
        );
      } else {
        toast.success(`Sync complete: ${result.created} added, ${result.updated} updated, ${result.markedInactive} marked inactive`);
      }
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Sync failed: ${msg}`);
      console.error("Sync error:", e);
    } finally {
      setSyncing(false);
    }
  }

  async function testFeed() {
    if (!feedUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetchFeed({
        data: {
          url: feedUrl.trim(),
          method,
          body: method === "POST" ? body.trim() || undefined : undefined,
        },
      });
      let rows: Array<Record<string, unknown>> = [];
      if (res.format === "json") {
        const data = JSON.parse(res.body);
        rows = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.stones) ? (data as any).stones
          : Array.isArray((data as any)?.data) ? (data as any).data
          : Array.isArray((data as any)?.result) ? (data as any).result
          : [];
      } else {
        // crude CSV row count for the preview
        const lines = res.body.split(/\r?\n/).filter((l) => l.trim());
        const headers = (lines[0] ?? "").split(",");
        rows = lines.slice(1).map((line) => {
          const cells = line.split(",");
          const row: Record<string, unknown> = {};
          headers.forEach((h, i) => { row[h.trim()] = cells[i]; });
          return row;
        });
      }
      const preset = detectPreset(rows);
      const sample = rows[0] ? JSON.stringify(rows[0], null, 2).slice(0, 1200) : "(no rows)";
      setTestResult({
        ok: true,
        rowCount: rows.length,
        preset: preset ? preset.label : "Custom mapping (no preset detected)",
        sample,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setTestResult({ ok: false, error: msg });
    } finally {
      setTesting(false);
    }
  }

  const lastLog: any = (status?.syncLogs ?? [])[0] ?? null;
  const lastLogErrors: any[] = Array.isArray(lastLog?.errors) ? lastLog.errors : [];

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
          <div>
            <Label>Request method</Label>
            <div className="mt-1 flex gap-2">
              {(["GET", "POST"] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={method === m ? "default" : "outline"}
                  onClick={() => setMethod(m)}
                  type="button"
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>
          {method === "POST" && (
            <div>
              <Label htmlFor="feedBody">Request body (JSON, optional)</Label>
              <textarea
                id="feedBody"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                rows={3}
                placeholder='{"filter":"all"}'
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch id="autoSync" checked={autoSync} onCheckedChange={setAutoSync} />
            <Label htmlFor="autoSync" className="text-sm">Auto-sync every 24 hours</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={saveSettings}>Save settings</Button>
            <Button size="sm" variant="outline" onClick={testFeed} disabled={testing || !feedUrl.trim()}>
              {testing ? "Testing…" : "Test feed URL"}
            </Button>
            <Button size="sm" onClick={sync} disabled={syncing || !feedUrl.trim()}>
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
          {testResult && testResult.ok && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs space-y-1">
              <div>✓ Feed reachable — <strong>{testResult.rowCount}</strong> row{testResult.rowCount === 1 ? "" : "s"} found.</div>
              <div>Preset detected: <span className="font-medium">{testResult.preset}</span></div>
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground">First row preview</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded bg-background p-2 font-mono">{testResult.sample}</pre>
              </details>
            </div>
          )}
          {testResult && !testResult.ok && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              Test failed: {testResult.error}
            </div>
          )}
          {lastPreset && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              Detected format: <span className="font-medium">{lastPreset}</span>
            </div>
          )}
          {lastLog && (
            <div className="rounded-md border border-border bg-card/60 p-3 text-xs space-y-1">
              <div className="text-muted-foreground">
                Last sync: <span className="text-foreground">{new Date(lastLog.created_at).toLocaleString()}</span>
                {" · "}status: <span className="font-medium capitalize">{lastLog.status}</span>
              </div>
              <div>
                Result: {lastLog.stones_added} added · {lastLog.stones_updated} updated ·{" "}
                {lastLog.stones_marked_inactive} marked inactive · {lastLogErrors.length} error
                {lastLogErrors.length === 1 ? "" : "s"}
              </div>
              {lastLog.status === "failed" && lastLogErrors[0]?.message && (
                <div className="mt-2 rounded border border-destructive/40 bg-destructive/10 p-2 text-destructive">
                  {lastLogErrors[0].message}
                </div>
              )}
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