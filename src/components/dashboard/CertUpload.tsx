import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Uploads a cert PDF to the private `cert-scans` bucket under
 * `<dealerId>/<stoneId>/<uuid>.pdf` and stores the storage path on
 * `stones.cert_url`. The public stone page fetches a short-lived signed
 * URL via a server function.
 */
export function CertUpload({ stoneId, dealerId }: { stoneId: string; dealerId: string }) {
  const [certPath, setCertPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("stones")
        .select("cert_url")
        .eq("id", stoneId)
        .maybeSingle();
      setCertPath(data?.cert_url ?? null);
    })();
  }, [stoneId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Cert must be a PDF.");
      return;
    }
    setBusy(true);
    try {
      const path = `${dealerId}/${stoneId}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("cert-scans")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      // Delete previous file if it was a stored path
      if (certPath && !/^https?:\/\//i.test(certPath)) {
        await supabase.storage.from("cert-scans").remove([certPath]);
      }
      const { error: updErr } = await supabase
        .from("stones")
        .update({ cert_url: path })
        .eq("id", stoneId);
      if (updErr) throw updErr;
      setCertPath(path);
      toast.success("Certificate uploaded.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!certPath) return;
    if (!confirm("Remove the uploaded certificate?")) return;
    setBusy(true);
    try {
      if (!/^https?:\/\//i.test(certPath)) {
        await supabase.storage.from("cert-scans").remove([certPath]);
      }
      await supabase.from("stones").update({ cert_url: null }).eq("id", stoneId);
      setCertPath(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Certificate PDF</h2>
        <label className="cursor-pointer">
          <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} disabled={busy} />
          <span className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {busy ? "Uploading…" : certPath ? "Replace PDF" : "Upload PDF"}
          </span>
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Stored privately. Jewellers see it through a short-lived signed link.
      </p>
      {certPath && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--color-gold)]" />
            <span className="font-mono text-xs text-muted-foreground">
              {certPath.split("/").pop()}
            </span>
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={remove} disabled={busy}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}