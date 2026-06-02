import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller } from "@/lib/auth.utils";
import { supabase } from "@/integrations/supabase/client";

const REPORT_REASONS = [
  "Incorrect certification details",
  "Stone appears to be misrepresented",
  "Pricing appears fraudulent",
  "Duplicate listing",
  "Other",
];

export function ReportListing({ stoneId }: { stoneId: string }) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const isJ = isJeweller(profile);

  useEffect(() => {
    if (!open || !user || !isJeweller) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("reports")
        .select("id")
        .eq("stone_id", stoneId)
        .eq("reporter_id", user.id)
        .maybeSingle();
      setAlreadyReported(!!data);
    })();
  }, [open, user, isJeweller, stoneId]);

  if (!user || !isJeweller) return null;

  async function submit() {
    setBusy(true);
    const { error } = await (supabase as any)
      .from("reports")
      .insert({
        stone_id: stoneId,
        reporter_id: user!.id,
        reason,
        details: details.trim() || null,
      });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Report submitted. We'll review this listing.");
    setOpen(false);
    setDetails("");
    setReason(REPORT_REASONS[0]);
    setAlreadyReported(true);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <Flag className="h-3 w-3" />
          Report listing
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
        </DialogHeader>
        {alreadyReported ? (
          <p className="text-sm text-muted-foreground">
            You've already reported this listing. Our team will review it shortly.
          </p>
        ) : (
          <div className="space-y-3">
            {REPORT_REASONS.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-[var(--color-gold)]"
                />
                {r}
              </label>
            ))}
            <Textarea
              placeholder="Additional details (optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {alreadyReported ? "Close" : "Cancel"}
          </Button>
          {!alreadyReported && (
            <Button
              onClick={submit}
              disabled={busy}
              className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]"
            >
              {busy ? "Submitting…" : "Submit report"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReportListing;