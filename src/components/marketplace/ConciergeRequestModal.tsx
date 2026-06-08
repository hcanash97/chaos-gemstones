import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller as checkJeweller } from "@/lib/auth.utils";
import { SHAPES, SHAPE_LABELS } from "@/lib/marketplace/filters";

const STONE_TYPE_OPTIONS = [
  "Diamond",
  "Ruby",
  "Sapphire",
  "Emerald",
  "Alexandrite",
  "Spinel",
  "Tourmaline",
  "Tsavorite",
  "Paraiba",
  "Other",
] as const;

type Props = {
  trigger?: ReactNode;
};

export function ConciergeRequestModal({ trigger }: Props) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [stoneType, setStoneType] = useState("Diamond");
  const [shape, setShape] = useState("any");
  const [caratMin, setCaratMin] = useState("");
  const [caratMax, setCaratMax] = useState("");
  const [budget, setBudget] = useState("");
  const [treatment, setTreatment] = useState("any");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isJeweller = checkJeweller(profile);
  const canSubmit = !!user && isJeweller && !!profile?.is_approved;

  async function submit() {
    if (!user || saving) return;
    setSaving(true);
    const payload = {
      jeweller_id: user.id,
      stone_type: stoneType,
      shape: shape === "any" ? [] : [shape],
      min_carat: caratMin ? Number(caratMin) : null,
      max_carat: caratMax ? Number(caratMax) : null,
      max_budget_usd: budget ? Number(budget) : null,
      treatment: treatment === "any" ? null : treatment,
      notes: notes.trim() || null,
      status: "open" as const,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    const { error } = await supabase.from("stone_requests").insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmitted(true);
  }

  function reset() {
    setSubmitted(false);
    setStoneType("Diamond");
    setShape("any");
    setCaratMin("");
    setCaratMax("");
    setBudget("");
    setTreatment("any");
    setNotes("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Can&apos;t find it? Request it</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Concierge stone request</DialogTitle>
        </DialogHeader>

        {!canSubmit ? (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Approved jeweller accounts can submit concierge sourcing requests.
            <div className="mt-3">
              <Button asChild size="sm">
                <Link to="/sign-up/jeweller">Apply as a jeweller</Link>
              </Button>
            </div>
          </div>
        ) : submitted ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
            <div className="font-medium">Request submitted.</div>
            <p className="mt-1">We&apos;ll be in touch within 48 hours.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Stone type</Label>
                <Input
                  className="mt-1.5"
                  list="concierge-stone-types"
                  value={stoneType}
                  onChange={(event) => setStoneType(event.target.value)}
                  placeholder="Diamond, Ruby, Sapphire..."
                />
                <datalist id="concierge-stone-types">
                  {STONE_TYPE_OPTIONS.map((option) => <option key={option} value={option} />)}
                </datalist>
              </div>
              <div>
                <Label>Shape</Label>
                <Select value={shape} onValueChange={setShape}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any shape</SelectItem>
                    {SHAPES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {SHAPE_LABELS[option] ?? option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carat min</Label>
                <Input className="mt-1.5" type="number" step="0.01" min="0" value={caratMin} onChange={(event) => setCaratMin(event.target.value)} />
              </div>
              <div>
                <Label>Carat max</Label>
                <Input className="mt-1.5" type="number" step="0.01" min="0" value={caratMax} onChange={(event) => setCaratMax(event.target.value)} />
              </div>
              <div>
                <Label>Max budget USD</Label>
                <Input className="mt-1.5" type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} />
              </div>
              <div>
                <Label>Treatment preference</Label>
                <Select value={treatment} onValueChange={setTreatment}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unheated">Unheated preferred</SelectItem>
                    <SelectItem value="heated">Heated acceptable</SelectItem>
                    <SelectItem value="any">No preference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Additional notes</Label>
              <Textarea
                className="mt-1.5"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Client deadline, origin preference, lab requirement, colour details..."
              />
            </div>
            <Button onClick={submit} disabled={saving || !stoneType.trim()}>
              {saving ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
