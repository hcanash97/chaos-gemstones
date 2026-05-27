import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/jeweller/markup")({
  component: MarkupPage,
});

function MarkupPage() {
  const { user, profile } = useAuth();
  const [global, setGlobal] = useState("2.0");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (profile?.account_type !== "jeweller") return <div>Jewellers only.</div>;

  const { data, refetch } = useQuery({
    queryKey: ["markup-data", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [j, sels] = await Promise.all([
        supabase.from("jeweller_profiles").select("markup_global").eq("id", user!.id).maybeSingle(),
        supabase.from("feed_selections").select("id, dealer_id, markup_override").eq("selection_type", "dealer_follow"),
      ]);
      const dealerIds = (sels.data ?? []).map((s: any) => s.dealer_id).filter(Boolean);
      const { data: dealers } = dealerIds.length
        ? await supabase.from("profiles").select("id, company_name").in("id", dealerIds)
        : { data: [] as any };
      return {
        global: j.data?.markup_global ?? 2,
        followed: (sels.data ?? []).map((s: any) => ({
          selectionId: s.id,
          dealerId: s.dealer_id,
          name: dealers?.find((d: any) => d.id === s.dealer_id)?.company_name ?? "Unknown",
          markup_override: s.markup_override,
        })),
      };
    },
  });

  useEffect(() => {
    if (!data) return;
    setGlobal(String(data.global));
    const o: Record<string, string> = {};
    data.followed.forEach((f: any) => {
      o[f.selectionId] = f.markup_override != null ? String(f.markup_override) : "";
    });
    setOverrides(o);
  }, [data]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const g = parseFloat(global);
    if (!isFinite(g) || g <= 0) {
      toast.error("Global markup must be a positive number");
      setSaving(false);
      return;
    }
    await supabase.from("jeweller_profiles").update({ markup_global: g }).eq("id", user.id);
    for (const [selId, val] of Object.entries(overrides)) {
      const num = val.trim() === "" ? null : parseFloat(val);
      await supabase.from("feed_selections").update({ markup_override: num }).eq("id", selId);
    }
    setSaving(false);
    toast.success("Markup saved");
    refetch();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Markup Settings</h1>
      <p className="text-sm text-muted-foreground">Retail price = wholesale × multiplier.</p>

      <div className="mt-6 max-w-md rounded-md border border-border bg-card p-5">
        <Label>Global multiplier</Label>
        <Input
          type="number"
          step="0.01"
          min="0.1"
          value={global}
          onChange={(e) => setGlobal(e.target.value)}
          className="mt-1 font-mono"
        />
        <p className="mt-1 text-xs text-muted-foreground">e.g. 2.5 means retail = 2.5× wholesale</p>
      </div>

      <h2 className="mt-8 font-serif text-xl">Per-vendor override</h2>
      <p className="text-xs text-muted-foreground">Leave blank to use the global multiplier.</p>
      <div className="mt-3 space-y-2">
        {(data?.followed ?? []).map((f: any) => (
          <div key={f.selectionId} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
            <span>{f.name}</span>
            <Input
              type="number"
              step="0.01"
              placeholder={`Default (${global})`}
              value={overrides[f.selectionId] ?? ""}
              onChange={(e) => setOverrides({ ...overrides, [f.selectionId]: e.target.value })}
              className="w-32 font-mono"
            />
          </div>
        ))}
        {!data?.followed.length && (
          <div className="text-sm text-muted-foreground">Follow vendors first to set per-vendor markups.</div>
        )}
      </div>

      <Button
        onClick={save}
        disabled={saving}
        className="mt-6 bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
      >
        {saving ? "Saving…" : "Save markup settings"}
      </Button>
    </div>
  );
}