import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchMarketplace, PAGE_SIZE } from "@/lib/marketplace.functions";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { StoneCard } from "@/components/site/StoneCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Save, LayoutGrid, List } from "lucide-react";
import { StaggerGroup } from "@/components/anim/Motion";
import { useAuth } from "@/hooks/useAuth";
import {
  defaultFilters,
  activeFilterCount,
  hasDiamondSelection,
  hasColouredSelection,
  STONE_TYPES,
  STONE_TYPE_LABELS,
  SHAPES,
  SHAPE_LABELS,
  CARAT_BANDS,
  CARAT_MIN,
  CARAT_MAX,
  PRICE_BANDS,
  PRICE_MIN,
  PRICE_MAX,
  CERT_LABS,
  COUNTRIES,
  DIAMOND_COLOURS,
  FANCY_HUES,
  FANCY_INTENSITIES,
  CLARITIES,
  CUT_GRADES,
  FLUOR_INTENSITY,
  FLUOR_COLOUR,
  GIRDLE,
  CULET_SIZE,
  CULET_CONDITION,
  SHADE_OPTIONS,
  MILKY,
  EYE_CLEAN,
  BLACK_INCLUSION,
  PROVENANCE,
  TONES,
  SATURATIONS,
  TREATMENTS,
  CLARITY_TYPES,
  PHENOMENA,
  PRIMARY_COLOURS,
  type FilterState,
} from "@/lib/marketplace/filters";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
  head: () => ({
    meta: [
      { title: "Browse Certified Gemstones & Diamonds — Chaos" },
      {
        name: "description",
        content:
          "Search certified natural and lab-grown diamonds, sapphires, rubies, emeralds and rare coloured gemstones from verified dealers worldwide.",
      },
      { property: "og:title", content: "Browse Certified Gemstones & Diamonds — Chaos" },
      {
        property: "og:description",
        content:
          "Search certified natural and lab-grown diamonds and coloured gemstones from verified dealers worldwide.",
      },
      { property: "og:url", content: "/marketplace" },
    ],
    links: [{ rel: "canonical", href: "/marketplace" }],
  }),
});

type Action =
  | { type: "set"; patch: Partial<FilterState> }
  | { type: "toggle"; key: keyof FilterState; value: string }
  | { type: "reset" };
function reducer(s: FilterState, a: Action): FilterState {
  if (a.type === "reset") return { ...defaultFilters };
  if (a.type === "set") return { ...s, ...a.patch };
  const arr = (s[a.key] as unknown as string[]) ?? [];
  const next = arr.includes(a.value) ? arr.filter((x) => x !== a.value) : [...arr, a.value];
  return { ...s, [a.key]: next } as FilterState;
}

function Marketplace() {
  const [f, dispatch] = useReducer(reducer, defaultFilters);
  const { user, profile } = useAuth();
  const [page, setPage] = useState(1);
  const [debouncedF, setDebouncedF] = useState<FilterState>(defaultFilters);
  const set = (patch: Partial<FilterState>) => dispatch({ type: "set", patch });
  const toggle = (key: keyof FilterState, value: string) => dispatch({ type: "toggle", key, value });

  // Debounce filter changes (300ms) so rapid interactions trigger a single query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedF(f), 300);
    return () => clearTimeout(t);
  }, [f]);

  // Reset to page 1 whenever the (debounced) filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedF]);

  const search = useServerFn(searchMarketplace);
  const { data: result, isFetching } = useQuery({
    queryKey: ["marketplace-search", debouncedF, page],
    queryFn: () => search({ data: { filters: debouncedF, page } }),
    placeholderData: keepPreviousData,
  });

  const rawStones = result?.stones ?? [];
  const total = result?.total ?? 0;
  const isLoading = isFetching && !result;

  // Per-carat price mode: server filters per_stone; refine current page client-side.
  const visible = useMemo(() => {
    if (debouncedF.priceMode !== "per_carat") return rawStones;
    return rawStones.filter((s: any) => {
      const price = Number(s.wholesale_price_usd ?? 0);
      const c = Number(s.carat_weight ?? 1) || 1;
      const v = price / c;
      return v >= debouncedF.priceMin && v <= debouncedF.priceMax;
    });
  }, [rawStones, debouncedF.priceMode, debouncedF.priceMin, debouncedF.priceMax]);

  const { data: dealers } = useQuery({
    queryKey: ["marketplace-dealers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dealer_profiles")
        .select("id, profiles!inner(company_name, is_approved)")
        .filter("profiles.is_approved", "eq", true);
      return (data ?? [])
        .map((d: any) => ({ id: d.id, name: d.profiles?.company_name as string }))
        .filter((d) => d.name)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const filterCount = activeFilterCount(f);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showDiamond = hasDiamondSelection(f.types);
  const showColoured = hasColouredSelection(f.types);
  const isJeweller = checkJ(profile);

  // Derive primary-colour swatches from the first matching coloured stone type
  const colouredType = f.types.find((t) => PRIMARY_COLOURS[t]) ?? "sapphire";
  const primarySwatches = PRIMARY_COLOURS[colouredType] ?? PRIMARY_COLOURS.sapphire;

  const Filters = (
    <div className="space-y-3">
      <CollapsibleSection title="Search" defaultOpen>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
        <Input
          value={f.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="ruby, oval, Sri Lanka…"
          className="mt-2"
        />
        <Label className="mt-3 block text-xs uppercase tracking-wider text-muted-foreground">Certificate number</Label>
        <Input
          value={f.certNumber}
          onChange={(e) => set({ certNumber: e.target.value })}
          placeholder="e.g. 2235681432"
          className="mt-2"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Stone type">
        <CheckGrid
          options={STONE_TYPES}
          selected={f.types}
          onToggle={(v) => toggle("types", v)}
          labels={STONE_TYPE_LABELS}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill
            active={f.matchingPairOnly}
            onClick={() => set({ matchingPairOnly: !f.matchingPairOnly })}
          >
            ★ Matched Pairs only
          </Pill>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Shape">
        <CheckGrid options={SHAPES} selected={f.shapes} onToggle={(v) => toggle("shapes", v)} labels={SHAPE_LABELS} />
      </CollapsibleSection>

      <CollapsibleSection title={`Carat: ${f.caratMin} – ${f.caratMax}`}>
        <Slider
          min={CARAT_MIN}
          max={CARAT_MAX}
          step={0.1}
          value={[f.caratMin, f.caratMax]}
          onValueChange={(v) => set({ caratMin: v[0], caratMax: v[1] })}
        />
        <PillRow className="mt-3">
          {CARAT_BANDS.map((b) => (
            <Pill
              key={b.label}
              active={f.caratMin === b.min && f.caratMax === b.max}
              onClick={() => set({ caratMin: b.min, caratMax: b.max })}
            >
              {b.label}
            </Pill>
          ))}
        </PillRow>
      </CollapsibleSection>

      <CollapsibleSection
        title={`Price (${f.priceMode === "per_carat" ? "/ct" : "/stone"}): $${f.priceMin.toLocaleString()} – $${f.priceMax.toLocaleString()}`}
      >
        <Slider
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={500}
          value={[f.priceMin, f.priceMax]}
          onValueChange={(v) => set({ priceMin: v[0], priceMax: v[1] })}
        />
        <PillRow className="mt-3">
          {PRICE_BANDS.map((b) => (
            <Pill
              key={b.label}
              active={f.priceMin === b.min && f.priceMax === b.max}
              onClick={() => set({ priceMin: b.min, priceMax: b.max })}
            >
              {b.label}
            </Pill>
          ))}
        </PillRow>
        <div className="mt-3 flex gap-2 text-xs">
          {(["per_stone", "per_carat"] as const).map((m) => (
            <Pill key={m} active={f.priceMode === m} onClick={() => set({ priceMode: m })}>
              {m === "per_stone" ? "Per stone" : "Per carat"}
            </Pill>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Origin">
        <PillRow>
          {(["all", "natural", "lab-grown"] as const).map((o) => (
            <Pill key={o} active={f.origin === o} onClick={() => set({ origin: o })}>
              {o.replace("-", " ")}
            </Pill>
          ))}
        </PillRow>
      </CollapsibleSection>

      <CollapsibleSection title="Country of origin">
        <CheckGrid options={COUNTRIES} selected={f.countries} onToggle={(v) => toggle("countries", v)} />
      </CollapsibleSection>

      <CollapsibleSection title="Cert lab">
        <PillRow>
          {CERT_LABS.map((t) => (
            <Pill key={t} active={f.labs.includes(t)} onClick={() => toggle("labs", t)}>
              {t}
            </Pill>
          ))}
        </PillRow>
      </CollapsibleSection>

      <CollapsibleSection title="Availability & listing">
        <PillRow>
          {(["available", "reserved", "sold"] as const).map((s) => (
            <Pill key={s} active={f.availability.includes(s)} onClick={() => toggle("availability", s)}>
              {s}
            </Pill>
          ))}
        </PillRow>
        <PillRow className="mt-3">
          {(["all", "single", "parcel"] as const).map((s) => (
            <Pill key={s} active={f.listingType === s} onClick={() => set({ listingType: s })}>
              {s === "all" ? "All listings" : s}
            </Pill>
          ))}
        </PillRow>
        <label className="mt-3 flex items-center gap-2 text-xs">
          <Checkbox checked={f.bulkPricingOnly} onCheckedChange={(v) => set({ bulkPricingOnly: !!v })} />
          Bulk pricing only
        </label>
      </CollapsibleSection>

      <CollapsibleSection title="Dealer">
        <Select value={f.dealerId} onValueChange={(v) => set({ dealerId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="All dealers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dealers</SelectItem>
            {(dealers ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CollapsibleSection>

      <CollapsibleSection title="New listings">
        <PillRow>
          {[0, 1, 3, 7, 30].map((d) => (
            <Pill key={d} active={f.newWithin === d} onClick={() => set({ newWithin: d as any })}>
              {d === 0 ? "Any time" : `Last ${d}d`}
            </Pill>
          ))}
        </PillRow>
      </CollapsibleSection>

      {showDiamond && (
        <>
          <CollapsibleSection title="Diamond colour">
            <div className="mb-2 flex gap-2 text-xs">
              <Pill active={!f.fancyColourMode} onClick={() => set({ fancyColourMode: false })}>
                White (D–Z)
              </Pill>
              <Pill active={f.fancyColourMode} onClick={() => set({ fancyColourMode: true })}>
                Fancy colour
              </Pill>
            </div>
            {!f.fancyColourMode ? (
              <PillRow>
                {DIAMOND_COLOURS.map((c) => (
                  <Pill key={c} active={f.colourGrades.includes(c)} onClick={() => toggle("colourGrades", c)}>
                    {c}
                  </Pill>
                ))}
              </PillRow>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Hue</div>
                  <PillRow>
                    {FANCY_HUES.map((c) => (
                      <Pill key={c} active={f.fancyHues.includes(c)} onClick={() => toggle("fancyHues", c)}>
                        {c}
                      </Pill>
                    ))}
                  </PillRow>
                </div>
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Intensity</div>
                  <PillRow>
                    {FANCY_INTENSITIES.map((c) => (
                      <Pill
                        key={c}
                        active={f.fancyIntensities.includes(c)}
                        onClick={() => toggle("fancyIntensities", c)}
                      >
                        {c}
                      </Pill>
                    ))}
                  </PillRow>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox checked={f.treatedColour} onCheckedChange={(v) => set({ treatedColour: !!v })} />
                  Include treated colour
                </label>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Clarity">
            <PillRow>
              {CLARITIES.map((c) => (
                <Pill key={c} active={f.clarities.includes(c)} onClick={() => toggle("clarities", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
          </CollapsibleSection>

          <CollapsibleSection title="Cut / polish / symmetry">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Cut</div>
            <PillRow>
              {CUT_GRADES.map((c) => (
                <Pill key={c} active={f.cutGrades.includes(c)} onClick={() => toggle("cutGrades", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Polish</div>
            <PillRow>
              {CUT_GRADES.map((c) => (
                <Pill key={c} active={f.polish.includes(c)} onClick={() => toggle("polish", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Symmetry</div>
            <PillRow>
              {CUT_GRADES.map((c) => (
                <Pill key={c} active={f.symmetry.includes(c)} onClick={() => toggle("symmetry", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
          </CollapsibleSection>

          <CollapsibleSection title="Fluorescence">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Intensity</div>
            <PillRow>
              {FLUOR_INTENSITY.map((c) => (
                <Pill
                  key={c}
                  active={f.fluorescenceIntensity.includes(c)}
                  onClick={() => toggle("fluorescenceIntensity", c)}
                >
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Colour</div>
            <PillRow>
              {FLUOR_COLOUR.map((c) => (
                <Pill key={c} active={f.fluorescenceColour.includes(c)} onClick={() => toggle("fluorescenceColour", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
          </CollapsibleSection>

          <CollapsibleSection title="Measurements (mm)">
            <RangeInputs
              label="Length"
              mn={f.lengthMin}
              mx={f.lengthMax}
              onMn={(v) => set({ lengthMin: v })}
              onMx={(v) => set({ lengthMax: v })}
            />
            <RangeInputs
              label="Width"
              mn={f.widthMin}
              mx={f.widthMax}
              onMn={(v) => set({ widthMin: v })}
              onMx={(v) => set({ widthMax: v })}
            />
            <RangeInputs
              label="Height"
              mn={f.heightMin}
              mx={f.heightMax}
              onMn={(v) => set({ heightMin: v })}
              onMx={(v) => set({ heightMax: v })}
            />
            <RangeInputs
              label="L/W ratio"
              mn={f.lwRatioMin}
              mx={f.lwRatioMax}
              onMn={(v) => set({ lwRatioMin: v })}
              onMx={(v) => set({ lwRatioMax: v })}
            />
            <RangeInputs
              label="Depth %"
              mn={f.depthPctMin}
              mx={f.depthPctMax}
              onMn={(v) => set({ depthPctMin: v })}
              onMx={(v) => set({ depthPctMax: v })}
            />
            <RangeInputs
              label="Table %"
              mn={f.tablePctMin}
              mx={f.tablePctMax}
              onMn={(v) => set({ tablePctMin: v })}
              onMx={(v) => set({ tablePctMax: v })}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Girdle & culet">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Girdle</div>
            <PillRow>
              {GIRDLE.map((c) => (
                <Pill key={c} active={f.girdle.includes(c)} onClick={() => toggle("girdle", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Culet size</div>
            <PillRow>
              {CULET_SIZE.map((c) => (
                <Pill key={c} active={f.culetSize.includes(c)} onClick={() => toggle("culetSize", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Culet condition</div>
            <PillRow>
              {CULET_CONDITION.map((c) => (
                <Pill key={c} active={f.culetCondition.includes(c)} onClick={() => toggle("culetCondition", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
          </CollapsibleSection>

          <CollapsibleSection title="Tinge & inclusions">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Shade</div>
            <PillRow>
              {SHADE_OPTIONS.map((c) => (
                <Pill key={c} active={f.shade.includes(c)} onClick={() => toggle("shade", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Milky</div>
            <PillRow>
              {MILKY.map((c) => (
                <Pill key={c} active={f.milky.includes(c)} onClick={() => toggle("milky", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Eye clean</div>
            <PillRow>
              {EYE_CLEAN.map((c) => (
                <Pill key={c} active={f.eyeClean.includes(c)} onClick={() => toggle("eyeClean", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Black inclusion</div>
            <PillRow>
              {BLACK_INCLUSION.map((c) => (
                <Pill key={c} active={f.blackInclusion.includes(c)} onClick={() => toggle("blackInclusion", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
          </CollapsibleSection>

          <CollapsibleSection title="Enhancement & provenance">
            <PillRow>
              {(["any", "include", "only", "exclude"] as const).map((e) => (
                <Pill key={e} active={f.enhancement === e} onClick={() => set({ enhancement: e })}>
                  {e === "any" ? "Any" : e}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Provenance</div>
            <PillRow>
              {PROVENANCE.map((c) => (
                <Pill key={c} active={f.provenance.includes(c)} onClick={() => toggle("provenance", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
          </CollapsibleSection>
        </>
      )}

      {showColoured && (
        <>
          <CollapsibleSection title={`Primary colour (${colouredType})`}>
            <div className="grid grid-cols-3 gap-2">
              {primarySwatches.map((sw) => {
                const active = f.primaryColours.includes(sw.label);
                return (
                  <button
                    key={sw.label}
                    onClick={() => toggle("primaryColours", sw.label)}
                    className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs ${active ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-border"}`}
                  >
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: sw.hex }} />
                    <span className="truncate">{sw.label}</span>
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Tone & saturation">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Tone</div>
            <PillRow>
              {TONES.map((c) => (
                <Pill key={c} active={f.tones.includes(c)} onClick={() => toggle("tones", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Saturation</div>
            <PillRow>
              {SATURATIONS.map((c) => (
                <Pill key={c} active={f.saturations.includes(c)} onClick={() => toggle("saturations", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
          </CollapsibleSection>

          <CollapsibleSection title="Treatment">
            <CheckGrid options={TREATMENTS} selected={f.treatments} onToggle={(v) => toggle("treatments", v)} />
            <p className="mt-2 text-[11px] text-[var(--color-gold)]">
              Unheated stones command a premium — filter for "None (unheated)" to find untreated.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Clarity & phenomenon">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Clarity</div>
            <PillRow>
              {CLARITY_TYPES.map((c) => (
                <Pill key={c} active={f.clarityTypes.includes(c)} onClick={() => toggle("clarityTypes", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
            <div className="mt-3 mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Phenomenon</div>
            <PillRow>
              {PHENOMENA.map((c) => (
                <Pill key={c} active={f.phenomena.includes(c)} onClick={() => toggle("phenomena", c)}>
                  {c}
                </Pill>
              ))}
            </PillRow>
          </CollapsibleSection>

          <CollapsibleSection title="Premium origins & pairs">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={f.premiumOriginsOnly} onCheckedChange={(v) => set({ premiumOriginsOnly: !!v })} />
              Premium origins only (Burma, Kashmir, Colombia, Brazil…)
            </label>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <Checkbox checked={f.matchingPairOnly} onCheckedChange={(v) => set({ matchingPairOnly: !!v })} />
              Matching pairs available
            </label>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <Checkbox checked={f.parcelOnly} onCheckedChange={(v) => set({ parcelOnly: !!v })} />
              Parcel / lot available
            </label>
            {f.parcelOnly && (
              <div className="mt-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Min parcel quantity
                </Label>
                <Input
                  type="number"
                  min="1"
                  className="mt-1 h-9"
                  value={f.parcelMinQty ?? ""}
                  onChange={(e) => set({ parcelMinQty: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            )}
          </CollapsibleSection>
        </>
      )}

      <CollapsibleSection title="Media">
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={f.hasImages} onCheckedChange={(v) => set({ hasImages: !!v })} /> Has images
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs">
          <Checkbox checked={f.hasVideo} onCheckedChange={(v) => set({ hasVideo: !!v })} /> Has video
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs">
          <Checkbox checked={f.has360} onCheckedChange={(v) => set({ has360: !!v })} /> Has 360° view
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs">
          <Checkbox checked={f.hasCertScan} onCheckedChange={(v) => set({ hasCertScan: !!v })} /> Has cert scan
        </label>
      </CollapsibleSection>

      {filterCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => dispatch({ type: "reset" })}>
          Reset all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-serif text-4xl">Marketplace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Loading…"
                : `Showing ${visible.length} of ${total.toLocaleString()} results${totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters{filterCount ? ` (${filterCount})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{Filters}</div>
              </SheetContent>
            </Sheet>
            {isJeweller && <SaveSearchDialog filters={f} userId={user!.id} />}
            <div className="flex rounded-md border border-border">
              <button
                onClick={() => set({ view: "grid" })}
                className={`p-2 ${f.view === "grid" ? "bg-muted" : ""}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => set({ view: "list" })}
                className={`p-2 ${f.view === "list" ? "bg-muted" : ""}`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Select value={f.sort} onValueChange={(v) => set({ sort: v as FilterState["sort"] })}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: low to high</SelectItem>
                <SelectItem value="price-desc">Price: high to low</SelectItem>
                <SelectItem value="carat">Carat: high to low</SelectItem>
                <SelectItem value="viewed">Most viewed</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filterCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Active:</span>
            {f.search && <Chip label={`"${f.search}"`} onClear={() => set({ search: "" })} />}
            {f.types.map((t) => (
              <Chip key={t} label={STONE_TYPE_LABELS[t] ?? t} onClear={() => toggle("types", t)} />
            ))}
            {f.shapes.map((t) => (
              <Chip key={t} label={SHAPE_LABELS[t] ?? t} onClear={() => toggle("shapes", t)} />
            ))}
            {f.countries.map((t) => (
              <Chip key={t} label={t} onClear={() => toggle("countries", t)} />
            ))}
            {f.labs.map((t) => (
              <Chip key={t} label={t} onClear={() => toggle("labs", t)} />
            ))}
            {f.colourGrades.map((t) => (
              <Chip key={t} label={`Colour ${t}`} onClear={() => toggle("colourGrades", t)} />
            ))}
            {f.clarities.map((t) => (
              <Chip key={t} label={t} onClear={() => toggle("clarities", t)} />
            ))}
            {f.primaryColours.map((t) => (
              <Chip key={t} label={t} onClear={() => toggle("primaryColours", t)} />
            ))}
            {f.treatments.map((t) => (
              <Chip key={t} label={t} onClear={() => toggle("treatments", t)} />
            ))}
            {f.origin !== "all" && <Chip label={f.origin} onClear={() => set({ origin: "all" })} />}
            {f.premiumOriginsOnly && (
              <Chip label="Premium origins" onClear={() => set({ premiumOriginsOnly: false })} />
            )}
            {f.matchingPairOnly && <Chip label="Matching pairs" onClear={() => set({ matchingPairOnly: false })} />}
          </div>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden max-h-[calc(100vh-2rem)] overflow-y-auto pr-2 lg:sticky lg:top-4 lg:block">
            {Filters}
          </aside>

          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-md border border-border bg-card">
                    <Skeleton className="aspect-square w-full rounded-none" />
                    <div className="space-y-2 p-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : f.view === "grid" ? (
              <StaggerGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" delay={0.06}>
                {visible.map((s) => (
                  <StoneCard key={s.id} stone={s} />
                ))}
              </StaggerGroup>
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map((s) => (
                  <StoneCard key={s.id} stone={s} />
                ))}
              </div>
            )}
            {!isLoading && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  disabled={page <= 1 || isFetching}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Next
                </Button>
              </div>
            )}
            {!isLoading && total === 0 && (
              <div className="rounded-md border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
                No stones match your filters.
              </div>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span>{title}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}

function CheckGrid({
  options,
  selected,
  onToggle,
  labels = {},
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <label key={o} className="flex cursor-pointer items-center gap-2 text-xs capitalize">
          <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
          {labels[o] ?? o.replace(/-/g, " ")}
        </label>
      ))}
    </div>
  );
}

function PillRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-wrap gap-1.5 ${className}`}>{children}</div>;
}

function Pill({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${active ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function RangeInputs({
  label,
  mn,
  mx,
  onMn,
  onMx,
}: {
  label: string;
  mn: number | null;
  mx: number | null;
  onMn: (v: number | null) => void;
  onMx: (v: number | null) => void;
}) {
  return (
    <div className="mb-2">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1 flex gap-2">
        <Input
          type="number"
          placeholder="min"
          className="h-8"
          value={mn ?? ""}
          onChange={(e) => onMn(e.target.value ? Number(e.target.value) : null)}
        />
        <Input
          type="number"
          placeholder="max"
          className="h-8"
          value={mx ?? ""}
          onChange={(e) => onMx(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs capitalize hover:bg-muted"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  );
}

function SaveSearchDialog({ filters, userId }: { filters: FilterState; userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("saved_searches").insert({
      jeweller_id: userId,
      name: name.trim(),
      filters: filters as any,
      notify_daily: true,
    });
    setSaving(false);
    if (!error) {
      setDone(true);
      setName("");
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Save className="mr-1.5 h-4 w-4" /> Save search
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Name</Label>
          <Input
            placeholder="e.g. Unheated Burmese rubies 2–3ct"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            We'll email you a daily digest when new stones match — you can turn this off from your dashboard.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {done ? "Saved ✓" : saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
