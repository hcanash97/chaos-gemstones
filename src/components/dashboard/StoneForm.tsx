import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type StoneFormValues = {
  stone_type: string;
  shape: string;
  carat_weight: string;
  colour_grade: string;
  clarity_grade: string;
  cut_grade: string;
  origin: string;
  country_of_origin: string;
  treatment: string;
  wholesale_price_usd: string;
  available_qty: string;
  status: "available" | "reserved" | "sold";
  cert_lab: string;
  cert_number: string;
  featured: boolean;
  minimum_order_qty: string;
  bulk_pricing_available: boolean;
  notes_for_buyers: string;
};

export const emptyStone: StoneFormValues = {
  stone_type: "diamond",
  shape: "",
  carat_weight: "",
  colour_grade: "",
  clarity_grade: "",
  cut_grade: "",
  origin: "",
  country_of_origin: "",
  treatment: "",
  wholesale_price_usd: "",
  available_qty: "1",
  status: "available",
  cert_lab: "",
  cert_number: "",
  featured: false,
  minimum_order_qty: "1",
  bulk_pricing_available: false,
  notes_for_buyers: "",
};

type Props = {
  initial: StoneFormValues;
  stoneId?: string;
  dealerId: string;
};

export function StoneForm({ initial, stoneId, dealerId }: Props) {
  const [values, setValues] = useState<StoneFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function set<K extends keyof StoneFormValues>(key: K, v: StoneFormValues[K]) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      dealer_id: dealerId,
      stone_type: values.stone_type.trim(),
      shape: values.shape.trim() || null,
      carat_weight: values.carat_weight ? Number(values.carat_weight) : null,
      colour_grade: values.colour_grade.trim() || null,
      clarity_grade: values.clarity_grade.trim() || null,
      cut_grade: values.cut_grade.trim() || null,
      origin: values.origin.trim() || null,
      country_of_origin: values.country_of_origin.trim() || null,
      treatment: values.treatment.trim() || null,
      wholesale_price_usd: values.wholesale_price_usd ? Number(values.wholesale_price_usd) : null,
      available_qty: values.available_qty ? Number(values.available_qty) : 1,
      status: values.status,
      cert_lab: values.cert_lab.trim() || null,
      cert_number: values.cert_number.trim() || null,
      featured: values.featured,
      minimum_order_qty: values.minimum_order_qty ? Number(values.minimum_order_qty) : 1,
      bulk_pricing_available: values.bulk_pricing_available,
      notes_for_buyers: values.notes_for_buyers.trim() || null,
    };
    let resultId = stoneId;
    if (stoneId) {
      const { error } = await supabase.from("stones").update(payload).eq("id", stoneId);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("stones").insert(payload).select("id").single();
      if (error) { setError(error.message); setSaving(false); return; }
      resultId = data.id;
    }
    setSaving(false);
    navigate({ to: "/dashboard/stones/$id", params: { id: resultId! } });
  }

  const field = "block";
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={field}>
          <Label>Stone type *</Label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.stone_type}
            onChange={(e) => set("stone_type", e.target.value)}
            required
          >
            <option value="diamond">Diamond</option>
            <option value="sapphire">Sapphire</option>
            <option value="ruby">Ruby</option>
            <option value="emerald">Emerald</option>
            <option value="spinel">Spinel</option>
            <option value="tourmaline">Tourmaline</option>
            <option value="garnet">Garnet</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Label>Shape</Label>
          <Input className="mt-1" value={values.shape} onChange={(e) => set("shape", e.target.value)} placeholder="round, oval, cushion…" />
        </div>
        <div>
          <Label>Carat weight</Label>
          <Input className="mt-1" type="number" step="0.01" value={values.carat_weight} onChange={(e) => set("carat_weight", e.target.value)} />
        </div>
        <div>
          <Label>Wholesale price (USD)</Label>
          <Input className="mt-1" type="number" step="0.01" value={values.wholesale_price_usd} onChange={(e) => set("wholesale_price_usd", e.target.value)} />
        </div>
        <div>
          <Label>Colour grade</Label>
          <Input className="mt-1" value={values.colour_grade} onChange={(e) => set("colour_grade", e.target.value)} placeholder="D, E, F or vivid blue…" />
        </div>
        <div>
          <Label>Clarity grade</Label>
          <Input className="mt-1" value={values.clarity_grade} onChange={(e) => set("clarity_grade", e.target.value)} placeholder="VS1, SI2, eye-clean…" />
        </div>
        <div>
          <Label>Cut grade</Label>
          <Input className="mt-1" value={values.cut_grade} onChange={(e) => set("cut_grade", e.target.value)} />
        </div>
        <div>
          <Label>Treatment</Label>
          <Input className="mt-1" value={values.treatment} onChange={(e) => set("treatment", e.target.value)} placeholder="none, heated, oiled…" />
        </div>
        <div>
          <Label>Origin (region)</Label>
          <Input className="mt-1" value={values.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Mogok, Kashmir…" />
        </div>
        <div>
          <Label>Country of origin</Label>
          <Input className="mt-1" value={values.country_of_origin} onChange={(e) => set("country_of_origin", e.target.value)} />
        </div>
        <div>
          <Label>Certificate lab</Label>
          <Input className="mt-1" value={values.cert_lab} onChange={(e) => set("cert_lab", e.target.value)} placeholder="GIA, GRS, SSEF…" />
        </div>
        <div>
          <Label>Certificate number</Label>
          <Input className="mt-1" value={values.cert_number} onChange={(e) => set("cert_number", e.target.value)} />
        </div>
        <div>
          <Label>Available quantity</Label>
          <Input className="mt-1" type="number" min="0" value={values.available_qty} onChange={(e) => set("available_qty", e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.status}
            onChange={(e) => set("status", e.target.value as StoneFormValues["status"])}
          >
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.featured} onChange={(e) => set("featured", e.target.checked)} />
        Feature this stone on the homepage and vendor page
      </label>
      <div className="space-y-4 rounded-md border border-border bg-secondary/30 p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Bulk & buyer notes</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Minimum order quantity</Label>
            <Input
              className="mt-1"
              type="number"
              min="1"
              value={values.minimum_order_qty}
              onChange={(e) => set("minimum_order_qty", e.target.value)}
            />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.bulk_pricing_available}
              onChange={(e) => set("bulk_pricing_available", e.target.checked)}
            />
            Bulk pricing available on request
          </label>
        </div>
        <div>
          <Label>Notes for buyers</Label>
          <Textarea
            className="mt-1"
            rows={3}
            value={values.notes_for_buyers}
            onChange={(e) => set("notes_for_buyers", e.target.value)}
            placeholder="e.g. Available in matched pairs, parcels of 10+, custom cuts to order."
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Shown publicly on the stone page.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
          {saving ? "Saving…" : stoneId ? "Save changes" : "Create stone"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/dashboard/stones" })}>
          Cancel
        </Button>
      </div>
    </form>
  );
}