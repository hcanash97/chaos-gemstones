import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { exportMyData, deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/account")({
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const exportFn = useServerFn(exportMyData);
  const deleteFn = useServerFn(deleteMyAccount);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onExport() {
    setExporting(true);
    try {
      const data = await exportFn({});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chaos-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data has been exported");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteFn({});
      await supabase.auth.signOut();
      toast.success("Your account has been deleted");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Account & privacy</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Export your data or permanently delete your account.
      </p>

      <div className="mt-8 space-y-6">
        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Export my data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Download a JSON file containing your profile, API keys (without secret values), enquiries, and orders.
          </p>
          <Button onClick={onExport} disabled={exporting} className="mt-4">
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Preparing…" : "Export my data"}
          </Button>
        </section>

        <section className="rounded-md border border-destructive/40 bg-destructive/5 p-6">
          <h2 className="font-serif text-xl text-destructive">Delete my account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This permanently removes your account, API keys, and personal data. Stone listings (if a dealer) are
            archived; enquiry messages you've sent are anonymised. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-4" disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your Chaos account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Your profile will be marked deleted, your API keys removed, any stone listings
                  archived, and your enquiry messages anonymised.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting…" : "Yes, delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </div>
  );
}