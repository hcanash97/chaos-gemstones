import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCertLabel } from "@/lib/cert.functions";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertPrice } from "@/lib/currency";

type PRule = {
  scope: string;
  stone_id: string | null;
  stone_type: string | null;
  rule_type: string;
  value: number;
  currency: string | null;
};

function PricingRuleWarning({
  dealerId, stoneId, stoneType, wholesale, priceCurrency, rates,
}: {
  dealerId: string;
  stoneId?: string;
  stoneType: string;
  wholesale: number;
  priceCurrency: string;
  rates: Record<string, number>;
}) {
  const [rules, setRules] = useState<PRule[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("pricing_rules")
        .select("scope, stone_id, stone_type, rule_type, value, currency")
        .eq("dealer_id", dealerId)
        .eq("is_active", true);
      if (!cancelled) setRules((data as PRule[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [dealerId]);

  if (!wholesale || rules.length === 0) return null;
  const violated = rules.filter((r) => {
    if (r.scope === "stone" && r.stone_id !== stoneId) return false;
    if (r.scope === "stone_type" && r.stone_type?.toLowerCase() !== stoneType.toLowerCase()) return false;
    if (r.rule_type !== "min_price") return false;
    const ruleCurrency = r.currency || "USD";
    const wholesaleInRuleCurrency = convertPrice(wholesale, priceCurrency, ruleCurrency, rates);
    return wholesaleInRuleCurrency < Number(r.value);
  });
  if (violated.length === 0) return null;
  return (
    <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
      ⚠ This price violates {violated.length === 1 ? "your active pricing rule" : `${violated.length} of your active pricing rules`}.
      The stone will be hidden from jeweller feeds until you raise the price.
    </div>
  );
}

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
  price_currency: string;
  available_qty: string;
  status: "available" | "reserved" | "sold";
  cert_lab: string;
  cert_number: string;
  featured: boolean;
  minimum_order_qty: string;
  bulk_pricing_available: boolean;
  notes_for_buyers: string;
  // Gemological
  polish: string;
  symmetry: string;
  fluorescence: string;
  fluorescence_colour: string;
  // Colour (coloured stones)
  colour_hue: string;
  colour_tone: string;
  colour_saturation: string;
  phenomenon: string;
  // Measurements
  measurements_length: string;
  measurements_width: string;
  measurements_height: string;
  lw_ratio: string;
  depth_pct: string;
  table_pct: string;
  // Inclusions / finish
  girdle: string;
  culet_size: string;
  culet_condition: string;
  shade: string;
  milky: string;
  eye_clean: string;
  black_inclusion: string;
  enhancement: string;
  // Commercial
  listing_type: "single" | "parcel";
  parcel_quantity: string;
  matching_pair: boolean;
  // Media / provenance
  has_video: boolean;
  has_360: boolean;
  provenance_report: string;
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
  price_currency: "USD",
  available_qty: "1",
  status: "available",
  cert_lab: "",
  cert_number: "",
  featured: false,
  minimum_order_qty: "1",
  bulk_pricing_available: false,
  notes_for_buyers: "",
  polish: "",
  symmetry: "",
  fluorescence: "",
  fluorescence_colour: "",
  colour_hue: "",
  colour_tone: "",
  colour_saturation: "",
  phenomenon: "",
  measurements_length: "",
  measurements_width: "",
  measurements_height: "",
  lw_ratio: "",
  depth_pct: "",
  table_pct: "",
  girdle: "",
  culet_size: "",
  culet_condition: "",
  shade: "",
  milky: "",
  eye_clean: "",
  black_inclusion: "",
  enhancement: "",
  listing_type: "single",
  parcel_quantity: "",
  matching_pair: false,
  has_video: false,
  has_360: false,
  provenance_report: "",
};

type Props = {
  initial: StoneFormValues;
  stoneId?: string;
  dealerId: string;
  draftKey?: string;
};

export function StoneForm({ initial, stoneId, dealerId, draftKey }: Props) {
  const [values, setValues] = useState<StoneFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestorable, setDraftRestorable] = useState<{ when: string; values: StoneFormValues } | null>(null);
  const submittedRef = useRef(false);
  const navigate = useNavigate();
  const { rates } = useCurrency();

  // Default the price currency from the dealer's profile (only when not editing an existing stone).
  useEffect(() => {
    if (stoneId) return; // editing — respect stored value
    if (initial.price_currency && initial.price_currency !== "USD") return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("dealer_profiles")
        .select("default_currency")
        .eq("id", dealerId)
        .maybeSingle();
      const def = (data as { default_currency?: string } | null)?.default_currency;
      if (!cancelled && def) {
        setValues((s) => (s.price_currency === "USD" ? { ...s, price_currency: def } : s));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerId, stoneId]);

  // Detect existing draft on mount (only on new-stone form).
  useEffect(() => {
    if (!draftKey || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: string; values: StoneFormValues };
      if (parsed?.values) {
        const when = new Date(parsed.savedAt).toLocaleString();
        setDraftRestorable({ when, values: parsed.values });
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave draft every 30s.
  useEffect(() => {
    if (!draftKey || typeof window === "undefined") return;
    const t = window.setInterval(() => {
      if (submittedRef.current) return;
      try {
        localStorage.setItem(draftKey, JSON.stringify({ savedAt: new Date().toISOString(), values }));
      } catch {
        /* quota */
      }
    }, 30_000);
    return () => window.clearInterval(t);
  }, [draftKey, values]);

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
      price_currency: values.price_currency || "USD",
      available_qty: values.available_qty ? Number(values.available_qty) : 1,
      status: values.status,
      cert_lab: values.cert_lab.trim() || null,
      cert_number: values.cert_number.trim() || null,
      featured: values.featured,
      minimum_order_qty: values.minimum_order_qty ? Number(values.minimum_order_qty) : 1,
      bulk_pricing_available: values.bulk_pricing_available,
      notes_for_buyers: values.notes_for_buyers.trim() || null,
      polish: values.polish.trim() || null,
      symmetry: values.symmetry.trim() || null,
      fluorescence: values.fluorescence.trim() || null,
      fluorescence_colour: values.fluorescence_colour.trim() || null,
      colour_hue: values.colour_hue.trim() || null,
      colour_tone: values.colour_tone.trim() || null,
      colour_saturation: values.colour_saturation.trim() || null,
      phenomenon: values.phenomenon.trim() || null,
      measurements_length: values.measurements_length ? Number(values.measurements_length) : null,
      measurements_width: values.measurements_width ? Number(values.measurements_width) : null,
      measurements_height: values.measurements_height ? Number(values.measurements_height) : null,
      lw_ratio: values.lw_ratio ? Number(values.lw_ratio) : null,
      depth_pct: values.depth_pct ? Number(values.depth_pct) : null,
      table_pct: values.table_pct ? Number(values.table_pct) : null,
      girdle: values.girdle.trim() || null,
      culet_size: values.culet_size.trim() || null,
      culet_condition: values.culet_condition.trim() || null,
      shade: values.shade.trim() || null,
      milky: values.milky.trim() || null,
      eye_clean: values.eye_clean.trim() || null,
      black_inclusion: values.black_inclusion.trim() || null,
      enhancement: values.enhancement.trim() || null,
      listing_type: values.listing_type,
      parcel_quantity: values.parcel_quantity ? Number(values.parcel_quantity) : null,
      matching_pair: values.matching_pair,
      has_video: values.has_video,
      has_360: values.has_360,
      provenance_report: values.provenance_report.trim() || null,
    };
    let resultId = stoneId;
    if (stoneId) {
      const { error } = await supabase.from("stones").update(payload).eq("id", stoneId);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("stones").insert(payload).select("id").single();
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      resultId = data.id;
    }
    setSaving(false);
    if (draftKey && typeof window !== "undefined") {
      submittedRef.current = true;
      localStorage.removeItem(draftKey);
    }
    navigate({ to: "/dashboard/stones/$id", params: { id: resultId! } });
  }

  const field = "block";
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {draftRestorable && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 px-3 py-2 text-sm">
          <span>You have an unsaved draft from {draftRestorable.when}.</span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setValues(draftRestorable.values);
                setDraftRestorable(null);
              }}
            >
              Restore
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (draftKey) localStorage.removeItem(draftKey);
                setDraftRestorable(null);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Section title="Identity">
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
              <option value="rough">Rough / Uncut</option>
              <option value="mineral-specimen">Mineral Specimen</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label>Shape</Label>
            <Input
              className="mt-1"
              value={values.shape}
              onChange={(e) => set("shape", e.target.value)}
              placeholder="round, oval, cushion…"
            />
          </div>
          <div>
            <Label>Carat weight</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={values.carat_weight}
              onChange={(e) => set("carat_weight", e.target.value)}
            />
          </div>
          <div>
            <Label>Wholesale price ({values.price_currency || "USD"})</Label>
            <div className="mt-1 flex gap-2">
              <Input
                type="number"
                step="0.01"
                className="flex-1"
                value={values.wholesale_price_usd}
                onChange={(e) => set("wholesale_price_usd", e.target.value)}
              />
              <select
                className="flex h-10 w-28 rounded-md border border-input bg-background px-2 text-sm"
                value={values.price_currency || "USD"}
                onChange={(e) => set("price_currency", e.target.value)}
                aria-label="Price currency"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
            {values.wholesale_price_usd && values.price_currency && values.price_currency !== "USD" && (() => {
              const n = Number(values.wholesale_price_usd);
              if (!isFinite(n) || !rates) return null;
              // Convert dealer's local price into USD for the sanity-check note.
              const usd = (n / (rates[values.price_currency] ?? 1)) * (rates.USD ?? 1);
              return (
                <p className="mt-1 text-xs text-muted-foreground">
                  ≈ ${Math.round(usd).toLocaleString()} USD at current rates
                </p>
              );
            })()}
            <PricingRuleWarning
              dealerId={dealerId}
              stoneId={stoneId}
              stoneType={values.stone_type}
              wholesale={Number(values.wholesale_price_usd) || 0}
              priceCurrency={values.price_currency || "USD"}
              rates={rates}
            />
          </div>
          <div>
            <Label>Colour grade</Label>
            <Input
              className="mt-1"
              value={values.colour_grade}
              onChange={(e) => set("colour_grade", e.target.value)}
              placeholder="D, E, F or vivid blue…"
            />
          </div>
          <div>
            <Label>Clarity grade</Label>
            <Input
              className="mt-1"
              value={values.clarity_grade}
              onChange={(e) => set("clarity_grade", e.target.value)}
              placeholder="VS1, SI2, eye-clean…"
            />
          </div>
          <div>
            <Label>Cut grade</Label>
            <Input className="mt-1" value={values.cut_grade} onChange={(e) => set("cut_grade", e.target.value)} />
          </div>
          <div>
            <Label>Treatment</Label>
            <Input
              className="mt-1"
              value={values.treatment}
              onChange={(e) => set("treatment", e.target.value)}
              placeholder="none, heated, oiled…"
            />
          </div>
          <div>
            <Label>Origin (region)</Label>
            <Input
              className="mt-1"
              value={values.origin}
              onChange={(e) => set("origin", e.target.value)}
              placeholder="Mogok, Kashmir…"
            />
          </div>
          <div>
            <Label>Country of origin</Label>
            <Input
              className="mt-1"
              value={values.country_of_origin}
              onChange={(e) => set("country_of_origin", e.target.value)}
            />
          </div>
          <div>
            <Label>Certificate lab</Label>
            <Input
              className="mt-1"
              value={values.cert_lab}
              onChange={(e) => set("cert_lab", e.target.value)}
              placeholder="GIA, GRS, SSEF…"
            />
          </div>
          <div>
            <Label>{getCertLabel(values.cert_lab)}</Label>
            <Input className="mt-1" value={values.cert_number} onChange={(e) => set("cert_number", e.target.value)} />
          </div>
          <div>
            <Label>Available quantity</Label>
            <Input
              className="mt-1"
              type="number"
              min="0"
              value={values.available_qty}
              onChange={(e) => set("available_qty", e.target.value)}
            />
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
      </Section>

      <Section title="Gemological grades (diamonds)">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Polish"
            v={values.polish}
            on={(x) => set("polish", x)}
            placeholder="Excellent, Very Good…"
          />
          <TextField
            label="Symmetry"
            v={values.symmetry}
            on={(x) => set("symmetry", x)}
            placeholder="Excellent, Very Good…"
          />
          <TextField
            label="Fluorescence intensity"
            v={values.fluorescence}
            on={(x) => set("fluorescence", x)}
            placeholder="None, Faint, Medium…"
          />
          <TextField
            label="Fluorescence colour"
            v={values.fluorescence_colour}
            on={(x) => set("fluorescence_colour", x)}
            placeholder="Blue, Yellow…"
          />
        </div>
      </Section>

      <Section title="Colour (coloured stones)">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Primary hue"
            v={values.colour_hue}
            on={(x) => set("colour_hue", x)}
            placeholder="Royal Blue, Pigeon Blood…"
          />
          <TextField
            label="Tone"
            v={values.colour_tone}
            on={(x) => set("colour_tone", x)}
            placeholder="Medium, Dark…"
          />
          <TextField
            label="Saturation"
            v={values.colour_saturation}
            on={(x) => set("colour_saturation", x)}
            placeholder="Vivid, Strong…"
          />
          <TextField
            label="Phenomenon"
            v={values.phenomenon}
            on={(x) => set("phenomenon", x)}
            placeholder="Asterism, Colour change…"
          />
        </div>
      </Section>

      <Section title="Clarity & inclusions">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Shade / tinge"
            v={values.shade}
            on={(x) => set("shade", x)}
            placeholder="No BGM, No Brown…"
          />
          <TextField label="Milky" v={values.milky} on={(x) => set("milky", x)} placeholder="None, Light…" />
          <TextField
            label="Eye clean"
            v={values.eye_clean}
            on={(x) => set("eye_clean", x)}
            placeholder="Yes / Borderline / No"
          />
          <TextField
            label="Black inclusion"
            v={values.black_inclusion}
            on={(x) => set("black_inclusion", x)}
            placeholder="None, Light…"
          />
          <TextField
            label="Enhancement"
            v={values.enhancement}
            on={(x) => set("enhancement", x)}
            placeholder="None, Laser drilling…"
          />
        </div>
      </Section>

      <Section title="Measurements">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumField label="Length (mm)" v={values.measurements_length} on={(x) => set("measurements_length", x)} />
          <NumField label="Width (mm)" v={values.measurements_width} on={(x) => set("measurements_width", x)} />
          <NumField label="Height (mm)" v={values.measurements_height} on={(x) => set("measurements_height", x)} />
          <NumField label="L/W ratio" v={values.lw_ratio} on={(x) => set("lw_ratio", x)} />
          <NumField label="Depth %" v={values.depth_pct} on={(x) => set("depth_pct", x)} />
          <NumField label="Table %" v={values.table_pct} on={(x) => set("table_pct", x)} />
          <TextField label="Girdle" v={values.girdle} on={(x) => set("girdle", x)} placeholder="Thin, Medium…" />
          <TextField
            label="Culet size"
            v={values.culet_size}
            on={(x) => set("culet_size", x)}
            placeholder="None, Small…"
          />
          <TextField
            label="Culet condition"
            v={values.culet_condition}
            on={(x) => set("culet_condition", x)}
            placeholder="Pointed, Polished…"
          />
        </div>
      </Section>

      <Section title="Commercial">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Listing type</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={values.listing_type}
              onChange={(e) => set("listing_type", e.target.value as "single" | "parcel")}
            >
              <option value="single">Single stone</option>
              <option value="parcel">Parcel / lot</option>
            </select>
          </div>
          {values.listing_type === "parcel" && (
            <NumField label="Parcel quantity" v={values.parcel_quantity} on={(x) => set("parcel_quantity", x)} />
          )}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.matching_pair}
            onChange={(e) => set("matching_pair", e.target.checked)}
          />
          Matching pair available
        </label>
      </Section>

      <Section title="Media & provenance">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={values.has_video} onChange={(e) => set("has_video", e.target.checked)} />
            Video available
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={values.has_360} onChange={(e) => set("has_360", e.target.checked)} />
            360° view available
          </label>
          <TextField
            label="Provenance / traceability"
            v={values.provenance_report}
            on={(x) => set("provenance_report", x)}
            placeholder="GIA DOR, Tracr, Sarine Journey…"
          />
        </div>
      </Section>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-5">
      <div className="mb-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function TextField({
  label,
  v,
  on,
  placeholder,
}: {
  label: string;
  v: string;
  on: (x: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function NumField({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" type="number" step="0.01" value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
