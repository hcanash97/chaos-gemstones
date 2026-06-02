import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Rule = {
  id: string;
  scope: string;
  stone_id: string | null;
  stone_type: string | null;
  rule_type: string;
  value: number;
  currency: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

type StoneOpt = { id: string; stone_type: string; shape: string | null; carat_weight: number | null };

const RULE_TYPES = [
  { value: "min_price", label: "Minimum price (absolute, per stone)" },
  { value: "min_margin_pct", label: "Minimum margin %" },
  { value: "rap_floor", label: "Rap-style floor (multiplier of declared reference)" },
];

const SCOPES = [
  { value: "catalogue", label: "Entire catalogue" },
  { value: "stone_type", label: "By stone type" },
  { value: "stone", label: "Individual stone" },
];

const STONE_TYPES = ["Diamond", "Sapphire", "Ruby", "Emerald", "Spinel", "Tourmaline", "Tanzanite", "Aquamarine", "Garnet", "Topaz", "Opal", "Other"];

export const Route = createFileRoute("/dashboard/dealer/pricing")({
  component: DealerPricingPage,
});

function DealerPricingPage() {
  const { user, profile } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [stones, setStones] = useState<StoneOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // form state
  const [scope, setScope] = useState<string>("catalogue");
  const [stoneType, setStoneType] = useState("Diamond");
  const [stoneId, setStoneId] = useState<string>("");
  const [ruleType, setRuleType] = useState("min_price");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from("pricing_rules").select("*").eq("dealer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("stones").select("id, stone_type, shape, carat_weight").eq("dealer_id", user.id).order("created_at", { ascending: false }).limit(500),
    ]);
    setRules((r as Rule[]) ?? []);
    setStones((s as StoneOpt[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (profile && !isDealer(profile)) {
    return <div>Dealers only.</div>;
  }

  async function addRule() {
    if (!user) return;
    const v = parseFloat(value);
    if (!isFinite(v) || v <= 0) { toast.error("Enter a positive value"); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      dealer_id: user.id,
      scope,
      rule_type: ruleType,
      value: v,
      currency: ruleType === "min_price" ? currency : null,
      notes: notes || null,
      stone_id: scope === "stone" ? stoneId || null : null,
      stone_type: scope === "stone_type" ? stoneType : null,
    };
    const { error } = await supabase.from("pricing_rules").insert(payload as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Rule added");
    setOpen(false);
    setValue(""); setNotes(""); setStoneId("");
    load();
  }

  async function toggleActive(r: Rule) {
    const { error } = await supabase.from("pricing_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
  }

  async function removeRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from("pricing_rules").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRules((rs) => rs.filter((x) => x.id !== id));
  }

  function describeScope(r: Rule) {
    if (r.scope === "catalogue") return "Entire catalogue";
    if (r.scope === "stone_type") return `All ${r.stone_type}s`;
    const s = stones.find((x) => x.id === r.stone_id);
    return s ? `${s.carat_weight ?? ""}ct ${s.shape ?? ""} ${s.stone_type}` : "One stone";
  }

  function describeRule(r: Rule) {
    if (r.rule_type === "min_price") return `Min price ${r.currency ?? "USD"} ${Number(r.value).toLocaleString()}`;
    if (r.rule_type === "min_margin_pct") return `Min margin ${r.value}%`;
    if (r.rule_type === "rap_floor") return `Floor ${(Number(r.value) * 100).toFixed(0)}% of reference`;
    return r.rule_type;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Pricing rules</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Floors that protect your margins. Stones below your minimum price are silently excluded from jeweller feeds, so they never list below value regardless of the markup.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">+ Add rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New pricing rule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Scope</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {scope === "stone_type" && (
                <div>
                  <Label>Stone type</Label>
                  <Select value={stoneType} onValueChange={setStoneType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STONE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {scope === "stone" && (
                <div>
                  <Label>Stone</Label>
                  <Select value={stoneId} onValueChange={setStoneId}>
                    <SelectTrigger><SelectValue placeholder="Pick a stone" /></SelectTrigger>
                    <SelectContent>
                      {stones.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.carat_weight ?? "—"}ct {s.shape ?? ""} {s.stone_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Rule type</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RULE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={ruleType === "min_margin_pct" ? "e.g. 15" : ruleType === "rap_floor" ? "e.g. 0.85" : "e.g. 1500"}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {ruleType === "min_price" && "Minimum allowed wholesale price for the matching stones."}
                  {ruleType === "min_margin_pct" && "Minimum margin % the wholesale price must exceed your declared cost reference (entered per stone)."}
                  {ruleType === "rap_floor" && "Multiplier of the manually declared reference price — Chaos does not host Rap data."}
                </p>
              </div>
              {ruleType === "min_price" && (
                <div>
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addRule} disabled={saving} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">
                {saving ? "Saving…" : "Add rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No pricing rules yet. Add one to protect your margins on the feed.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 capitalize">{describeScope(r)}</td>
                  <td className="px-4 py-3 font-medium">{describeRule(r)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.notes || "—"}</td>
                  <td className="px-4 py-3"><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeRule(r.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}