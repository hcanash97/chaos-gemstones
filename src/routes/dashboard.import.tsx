import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/import")({
  component: ImportPage,
});

const REQUIRED = ["stone_type", "shape", "carat_weight", "wholesale_price_usd"];
const COLUMNS = [
  "stone_type", "shape", "carat_weight", "wholesale_price_usd",
  "origin", "country_of_origin", "treatment",
  "colour_grade", "clarity_grade", "cut_grade",
  "cert_lab", "cert_number", "available_qty",
];

function validateRow(row: any): string[] {
  const errors: string[] = [];
  REQUIRED.forEach((f) => {
    if (!row[f] || String(row[f]).trim() === "") errors.push(f);
  });
  if (row.carat_weight && isNaN(Number(row.carat_weight))) errors.push("carat_weight");
  if (row.wholesale_price_usd && isNaN(Number(row.wholesale_price_usd))) errors.push("wholesale_price_usd");
  return errors;
}

function ImportPage() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);

  if (profile?.account_type !== "dealer" && profile?.account_type !== "admin") {
    return <div>Dealers only.</div>;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as any[];
        setRows(data);
        setErrors(data.map(validateRow));
      },
    });
  }

  async function importValid() {
    if (!user) return;
    setImporting(true);
    const valid = rows
      .map((r, i) => ({ r, errs: errors[i] }))
      .filter((x) => x.errs.length === 0)
      .map(({ r }) => ({
        dealer_id: user.id,
        stone_type: r.stone_type,
        shape: r.shape,
        carat_weight: Number(r.carat_weight),
        wholesale_price_usd: Number(r.wholesale_price_usd),
        origin: r.origin || null,
        country_of_origin: r.country_of_origin || null,
        treatment: r.treatment || null,
        colour_grade: r.colour_grade || null,
        clarity_grade: r.clarity_grade || null,
        cut_grade: r.cut_grade || null,
        cert_lab: r.cert_lab || null,
        cert_number: r.cert_number || null,
        available_qty: r.available_qty ? Number(r.available_qty) : 1,
      }));
    if (!valid.length) {
      setImporting(false);
      return toast.error("No valid rows to import");
    }
    const { error } = await supabase.from("stones").insert(valid);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${valid.length} stone${valid.length === 1 ? "" : "s"}`);
    setRows([]);
    setErrors([]);
  }

  function downloadTemplate() {
    const csv = COLUMNS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chaos-stones-template.csv";
    a.click();
  }

  const validCount = errors.filter((e) => e.length === 0).length;
  const errorCount = errors.filter((e) => e.length > 0).length;

  return (
    <div>
      <h1 className="font-serif text-3xl">CSV Import</h1>
      <p className="text-sm text-muted-foreground">Bulk-upload your inventory.</p>

      <div className="mt-6 flex gap-3">
        <Input type="file" accept=".csv" onChange={handleFile} className="max-w-sm" />
        <Button variant="outline" onClick={downloadTemplate}>Download template</Button>
      </div>

      {rows.length > 0 && (
        <>
          <div className="mt-6 flex items-center gap-4 text-sm">
            <span className="rounded-md bg-green-500/10 px-3 py-1 text-green-700">{validCount} valid</span>
            <span className="rounded-md bg-destructive/10 px-3 py-1 text-destructive">{errorCount} with errors</span>
            <Button
              onClick={importValid}
              disabled={importing || validCount === 0}
              className="ml-auto bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
            >
              {importing ? "Importing…" : `Import ${validCount} valid row${validCount === 1 ? "" : "s"}`}
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {COLUMNS.map((c) => {
                      const bad = errors[i]?.includes(c);
                      return (
                        <td key={c} className={`px-3 py-1.5 ${bad ? "bg-destructive/15 text-destructive" : ""}`}>
                          {r[c] || (bad ? "missing" : "")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && <div className="p-3 text-xs text-muted-foreground">Showing first 100 of {rows.length} rows.</div>}
          </div>
        </>
      )}
    </div>
  );
}