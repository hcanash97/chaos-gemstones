import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  STONE_FIELDS, FIELD_MAP, suggestMapping, validateMappedRow, coerceForInsert,
  buildTemplateCsv, type RowError,
} from "@/lib/import-fields";
import { fetchExternalFeed } from "@/lib/feed-fetch.functions";

export const Route = createFileRoute("/dashboard/import")({
  component: ImportPage,
});

type Stage = "upload" | "map" | "preview" | "done";

type ParsedRow = Record<string, string>;

function flattenJson(input: unknown): ParsedRow[] {
  if (Array.isArray(input)) {
    return input.map((row) => {
      const out: ParsedRow = {};
      if (row && typeof row === "object") {
        for (const [k, v] of Object.entries(row)) {
          out[k] = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        }
      }
      return out;
    });
  }
  if (input && typeof input === "object") {
    // common: { items: [...] } / { stones: [...] }
    for (const key of ["items", "stones", "data", "results"]) {
      if (Array.isArray((input as any)[key])) return flattenJson((input as any)[key]);
    }
  }
  return [];
}

function parseCsvString(text: string): { headers: string[]; rows: ParsedRow[] } {
  const res = Papa.parse<ParsedRow>(text, { header: true, skipEmptyLines: true });
  return { headers: res.meta.fields ?? [], rows: (res.data as ParsedRow[]).filter(Boolean) };
}

function ImportPage() {
  const { user, profile, loading } = useAuth();
  const fetchFeed = useServerFn(fetchExternalFeed);

  const [stage, setStage] = useState<Stage>("upload");
  const [source, setSource] = useState<"csv" | "feed">("csv");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [existingCerts, setExistingCerts] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ imported: number; skipped: number; errorBreakdown: Record<string, number> } | null>(null);
  const [feedUrl, setFeedUrl] = useState("");
  const [savedFeedUrl, setSavedFeedUrl] = useState<string | null>(null);
  const [feedMethod, setFeedMethod] = useState<"GET" | "POST">("GET");
  const [feedBody, setFeedBody] = useState<string>("");
  const [fetching, setFetching] = useState(false);
  const [originalSource, setOriginalSource] = useState<"csv" | "feed">("csv");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [certs, dealer] = await Promise.all([
        supabase.from("stones").select("cert_number").eq("dealer_id", user.id).not("cert_number", "is", null),
        supabase.from("dealer_profiles").select("external_feed_url, external_feed_method, external_feed_body").eq("id", user.id).maybeSingle(),
      ]);
      const set = new Set<string>();
      (certs.data ?? []).forEach((r: any) => r.cert_number && set.add(String(r.cert_number).trim()));
      setExistingCerts(set);
      const dp: any = dealer.data ?? {};
      setSavedFeedUrl(dp.external_feed_url ?? null);
      if (dp.external_feed_url) setFeedUrl(dp.external_feed_url);
      if (dp.external_feed_method === "POST" || dp.external_feed_method === "GET") {
        setFeedMethod(dp.external_feed_method);
      }
      setFeedBody(dp.external_feed_body ?? "");
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (!user) {
    return <div className="py-12 text-center text-muted-foreground">Please sign in to access this page.</div>;
  }
  if (!profile?.is_approved) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="font-serif text-2xl">Import not available</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Your account must be approved before you can import stones. You can check
          your status or update your details from account settings.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard/account">Go to account settings</Link>
        </Button>
      </div>
    );
  }

  function ingestParsed(parsed: { headers: string[]; rows: ParsedRow[] }) {
    if (parsed.rows.length === 0) { toast.error("No rows found"); return; }
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(suggestMapping(parsed.headers) as Record<string, string>);
    setStage("map");
  }

  function onCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalSource("csv");
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => ingestParsed({ headers: res.meta.fields ?? [], rows: (res.data as ParsedRow[]).filter(Boolean) }),
      error: (err) => toast.error(err.message),
    });
  }

  async function loadFeed(url: string) {
    if (!url) return;
    setFetching(true);
    setOriginalSource("feed");
    try {
      const res = await fetchFeed({
        data: { url, method: feedMethod, body: feedBody || undefined },
      });
      if (res.format === "json") {
        try {
          const parsed = flattenJson(JSON.parse(res.body));
          if (parsed.length === 0) throw new Error("No items found in JSON feed");
          const allKeys = new Set<string>();
          parsed.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));
          ingestParsed({ headers: [...allKeys], rows: parsed });
        } catch (err) { toast.error((err as Error).message); }
      } else {
        ingestParsed(parseCsvString(res.body));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setFetching(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chaos-stones-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build mapped rows + validation for preview.
  const mappedPreview = useMemo(() => {
    return rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [src, dst] of Object.entries(mapping)) {
        if (!dst || dst === "__skip__") continue;
        mapped[dst] = row[src];
      }
      const errors = validateMappedRow(mapped, existingCerts);
      return { row, mapped, errors };
    });
  }, [rows, mapping, existingCerts]);

  const validCount = mappedPreview.filter((r) => r.errors.length === 0).length;
  const errorCount = mappedPreview.length - validCount;

  async function runImport(validOnly: boolean) {
    if (!user) return;
    const toImport = mappedPreview
      .filter((r) => validOnly ? r.errors.length === 0 : true)
      .map((r) => ({ ...coerceForInsert(r.mapped), dealer_id: user.id }));
    if (toImport.length === 0) { toast.error("Nothing to import"); return; }
    setImporting(true);
    const errorBreakdown: Record<string, number> = {};
    mappedPreview.filter((r) => r.errors.length > 0).forEach((r) => {
      r.errors.forEach((e) => { errorBreakdown[e.field] = (errorBreakdown[e.field] ?? 0) + 1; });
    });
    // Insert in chunks of 100.
    let imported = 0;
    for (let i = 0; i < toImport.length; i += 100) {
      const chunk = toImport.slice(i, i + 100);
      const { error } = await supabase.from("stones").insert(chunk as any);
      if (error) {
        toast.error(error.message);
        break;
      }
      imported += chunk.length;
    }
    setImporting(false);
    setSummary({ imported, skipped: mappedPreview.length - imported, errorBreakdown });
    setStage("done");

    // After a feed import succeeds, offer to save URL.
    if (originalSource === "feed" && feedUrl && feedUrl !== savedFeedUrl) {
      if (confirm("Save this feed URL for future syncs?")) {
        await supabase.from("dealer_profiles").update({ external_feed_url: feedUrl }).eq("id", user.id);
        setSavedFeedUrl(feedUrl);
        toast.success("Feed URL saved");
      }
    }
  }

  async function syncFeed() {
    if (!savedFeedUrl || !user) return;
    setFetching(true);
    setOriginalSource("feed");
    try {
      const res = await fetchFeed({
        data: { url: savedFeedUrl, method: feedMethod, body: feedBody || undefined },
      });
      const parsed = res.format === "json"
        ? (() => { const x = flattenJson(JSON.parse(res.body)); const keys = new Set<string>(); x.forEach((r) => Object.keys(r).forEach((k) => keys.add(k))); return { headers: [...keys], rows: x }; })()
        : parseCsvString(res.body);
      // Apply existing mapping if headers match, otherwise prompt.
      ingestParsed(parsed);
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setFetching(false); }
  }

  function reset() {
    setStage("upload"); setHeaders([]); setRows([]); setMapping({}); setSummary(null);
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Bulk import</h1>
      <p className="text-sm text-muted-foreground">Upload a CSV or pull from an external inventory feed.</p>

      {stage === "upload" && (
        <Tabs value={source} onValueChange={(v) => setSource(v as "csv" | "feed")} className="mt-6">
          <TabsList>
            <TabsTrigger value="csv">CSV upload</TabsTrigger>
            <TabsTrigger value="feed">Import from feed URL</TabsTrigger>
          </TabsList>
          <TabsContent value="csv" className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input type="file" accept=".csv,text/csv" onChange={onCsvFile} className="max-w-sm" />
              <Button variant="outline" onClick={downloadTemplate}>Download template CSV</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Template includes every supported field with one example row. Column headers don’t need to match exactly — you’ll map them in the next step.</p>
          </TabsContent>
          <TabsContent value="feed" className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="url"
                placeholder="https://your-system.example.com/feed.csv"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                className="max-w-xl"
              />
              <Button onClick={() => loadFeed(feedUrl)} disabled={!feedUrl || fetching}>
                {fetching ? "Fetching…" : "Fetch feed"}
              </Button>
              {savedFeedUrl && (
                <Button variant="outline" onClick={syncFeed} disabled={fetching}>Sync saved feed</Button>
              )}
            </div>
            {savedFeedUrl && <p className="mt-2 text-xs text-muted-foreground">Saved feed: <span className="font-mono">{savedFeedUrl}</span></p>}
            <p className="mt-2 text-xs text-muted-foreground">Works with any publicly reachable CSV or JSON URL. We auto-detect format and let you map columns next.</p>
          </TabsContent>
        </Tabs>
      )}

      {stage === "map" && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Map columns</h2>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset}>Start over</Button>
              <Button onClick={() => setStage("preview")}>Preview & validate →</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{headers.length} columns detected · {rows.length} rows. Map each column from your file to a Chaos field, or skip it.</p>
          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs">
                <tr><th className="px-3 py-2 text-left">Your column</th><th className="px-3 py-2 text-left">Sample value</th><th className="px-3 py-2 text-left">Maps to</th></tr>
              </thead>
              <tbody>
                {headers.map((h) => (
                  <tr key={h} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{h}</td>
                    <td className="px-3 py-2 text-muted-foreground">{rows[0]?.[h] ?? ""}</td>
                    <td className="px-3 py-2">
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={mapping[h] ?? "__skip__"}
                        onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                      >
                        <option value="__skip__">— Skip this column —</option>
                        {STONE_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>{f.label} ({f.key}){f.required ? " *" : ""}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stage === "preview" && (
        <PreviewTable
          mappedPreview={mappedPreview}
          validCount={validCount}
          errorCount={errorCount}
          importing={importing}
          onBack={() => setStage("map")}
          onImportValid={() => runImport(true)}
        />
      )}

      {stage === "done" && summary && (
        <div className="mt-6 rounded-md border border-border bg-card p-6">
          <h2 className="font-serif text-2xl">Import complete</h2>
          <p className="mt-2 text-sm">{summary.imported} stone{summary.imported === 1 ? "" : "s"} imported successfully. {summary.skipped} row{summary.skipped === 1 ? "" : "s"} skipped due to errors.</p>
          {Object.keys(summary.errorBreakdown).length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Errors by field</div>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(summary.errorBreakdown).map(([k, v]) => (
                  <li key={k}><span className="font-mono">{k}</span>: {v}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <Link to="/dashboard/stones"><Button>Go to inventory</Button></Link>
            <Button variant="outline" onClick={reset}>Import more</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewTable({
  mappedPreview, validCount, errorCount, importing, onBack, onImportValid,
}: {
  mappedPreview: Array<{ row: ParsedRow; mapped: Record<string, unknown>; errors: RowError[] }>;
  validCount: number; errorCount: number; importing: boolean;
  onBack: () => void; onImportValid: () => void;
}) {
  const cols = STONE_FIELDS.filter((f) =>
    mappedPreview.some((r) => r.mapped[f.key] !== undefined && r.mapped[f.key] !== "")
    || f.required,
  );
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-green-500/10 px-3 py-1 text-sm text-green-700">{validCount} valid</span>
        <span className="rounded-md bg-destructive/10 px-3 py-1 text-sm text-destructive">{errorCount} with errors</span>
        <Button variant="ghost" onClick={onBack}>← Back to mapping</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={importing}>Fix errors first</Button>
          <Button onClick={onImportValid} disabled={importing || validCount === 0}>
            {importing ? "Importing…" : `Import ${validCount} valid row${validCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
      <TooltipProvider delayDuration={150}>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="w-1 px-1 py-2"></th>
                {cols.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-left font-medium">{c.label}{c.required && <span className="text-destructive"> *</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mappedPreview.slice(0, 200).map(({ mapped, errors }, i) => {
                const errByField = new Map(errors.map((e) => [e.field, e.message]));
                const bad = errors.length > 0;
                return (
                  <tr key={i} className={`border-t border-border ${bad ? "border-l-4 border-l-destructive" : "border-l-4 border-l-green-500"}`}>
                    <td className="px-1"></td>
                    {cols.map((c) => {
                      const msg = errByField.get(c.key);
                      const val = mapped[c.key];
                      return (
                        <td key={c.key} className={`px-3 py-1.5 ${msg ? "bg-destructive/15 text-destructive" : ""}`}>
                          {msg ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dotted">{String(val ?? "missing")}</span>
                              </TooltipTrigger>
                              <TooltipContent>{msg}</TooltipContent>
                            </Tooltip>
                          ) : (
                            String(val ?? "")
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {mappedPreview.length > 200 && (
            <div className="p-3 text-xs text-muted-foreground">Showing first 200 of {mappedPreview.length} rows.</div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}

// Reference suppression — keep FIELD_MAP used in tooling later.
void FIELD_MAP;