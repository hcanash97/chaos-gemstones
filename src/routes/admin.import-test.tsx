import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  STONE_FIELDS, suggestMapping, validateMappedRow, coerceForInsert,
  buildTemplateCsv, type RowError,
} from "@/lib/import-fields";

export const Route = createFileRoute("/admin/import-test")({
  component: AdminImportTest,
});

type Row = Record<string, string>;

function AdminImportTest() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/", replace: true });
  }, [loading, isAdmin, navigate]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = res.meta.fields ?? [];
        const rs = (res.data as Row[]).filter(Boolean);
        setHeaders(hs);
        setRows(rs);
        setMapping(suggestMapping(hs) as Record<string, string>);
      },
    });
  }

  function downloadTemplate() {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "chaos-stones-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const preview = useMemo(() => {
    return rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [src, dst] of Object.entries(mapping)) {
        if (!dst || dst === "__skip__") continue;
        mapped[dst] = row[src];
      }
      const errors = validateMappedRow(mapped, new Set());
      return { mapped, errors, coerced: coerceForInsert(mapped) };
    });
  }, [rows, mapping]);

  const valid = preview.filter((r) => r.errors.length === 0).length;
  const invalid = preview.length - valid;

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Back to admin</Link>
      <h1 className="mt-2 font-serif text-3xl">CSV import sandbox</h1>
      <p className="text-sm text-muted-foreground">
        Admin-only dry run. Parses, maps, and validates a CSV against the stones schema without writing anything to the database.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input type="file" accept=".csv,text/csv" onChange={onFile} className="max-w-sm" />
        <Button variant="outline" onClick={downloadTemplate}>Download template CSV</Button>
        {rows.length > 0 && (
          <Button variant="ghost" onClick={() => { setHeaders([]); setRows([]); setMapping({}); }}>Clear</Button>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-md bg-muted px-3 py-1">{rows.length} rows · {headers.length} columns</span>
            <span className="rounded-md bg-green-500/10 px-3 py-1 text-green-700">{valid} valid</span>
            <span className="rounded-md bg-destructive/10 px-3 py-1 text-destructive">{invalid} with errors</span>
          </div>

          <h2 className="mt-6 font-serif text-xl">Column mapping (auto-suggested)</h2>
          <div className="mt-3 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">CSV column</th>
                  <th className="px-3 py-2 text-left">Sample value</th>
                  <th className="px-3 py-2 text-left">Mapped to field</th>
                </tr>
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
                        <option value="__skip__">— Skip —</option>
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

          <h2 className="mt-8 font-serif text-xl">Row-by-row validation</h2>
          <div className="mt-3 space-y-3">
            {preview.slice(0, 50).map((r, i) => (
              <div key={i} className={`rounded-md border p-4 text-sm ${r.errors.length ? "border-destructive/40 bg-destructive/5" : "border-green-500/30 bg-green-500/5"}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">Row {i + 1}</span>
                  <span className={r.errors.length ? "text-destructive" : "text-green-700"}>
                    {r.errors.length ? `${r.errors.length} error(s)` : "Would insert ✓"}
                  </span>
                </div>
                {r.errors.length > 0 ? (
                  <ul className="space-y-1">
                    {r.errors.map((e: RowError, j) => (
                      <li key={j} className="text-destructive">
                        <span className="font-mono">{e.field}</span>: {e.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <pre className="overflow-x-auto rounded bg-background/60 p-2 text-xs">{JSON.stringify(r.coerced, null, 2)}</pre>
                )}
              </div>
            ))}
            {preview.length > 50 && (
              <p className="text-xs text-muted-foreground">Showing first 50 of {preview.length} rows.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}