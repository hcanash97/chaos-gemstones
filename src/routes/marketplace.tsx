import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useReducer, useState, type FormEvent } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMarketplaceFilterDiagnostics, searchMarketplace, PAGE_SIZE } from "@/lib/marketplace.functions";
import { joinWaitlist } from "@/lib/waitlist.functions";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { StoneCard } from "@/components/site/StoneCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller as checkJ } from "@/lib/auth.utils";
import { useRetailMode } from "@/hooks/useRetailMode";
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
      { name: "keywords", content: "buy loose gemstones wholesale, certified diamonds wholesale, sapphire wholesale UK, ruby wholesale, emerald wholesale, loose stones for jewellers, coloured gemstone marketplace" },
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
  // Seed filter state from URL search params (so filters survive Back/refresh).
  const initialFromUrl: FilterState = (() => {
    if (typeof window === "undefined") return defaultFilters;
    try {
      const sp = new URLSearchParams(window.location.search);
      const raw = sp.get("f");
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw));
        return { ...defaultFilters, ...parsed };
      }
    } catch {
      /* ignore */
    }
    return defaultFilters;
  })();
  const [f, dispatch] = useReducer(reducer, initialFromUrl);
  const { user, profile } = useAuth();
  const [page, setPage] = useState(1);
  const [debouncedF, setDebouncedF] = useState<FilterState>(initialFromUrl);
  const { retailMode, setRetailMode } = useRetailMode();
  const set = (patch: Partial<FilterState>) => dispatch({ type: "set", patch });
  const toggle = (key: keyof FilterState, value: string) => dispatch({ type: "toggle", key, value });
  const clearFilters = () => dispatch({ type: "reset" });

  // Debounce filter changes (300ms) so rapid interactions trigger a single query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedF(f), 300);
    return () => clearTimeout(t);
  }, [f]);

  // Reset to page 1 whenever the (debounced) filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedF]);

  // Persist (debounced) filter state into the URL so navigating away and
  // back preserves what the user had applied.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only include keys that differ from defaults to keep the URL short-ish.
    const diff: Record<string, unknown> = {};
    for (const k of Object.keys(debouncedF) as (keyof FilterState)[]) {
      const v = debouncedF[k];
      const d = (defaultFilters as any)[k];
      const same = JSON.stringify(v) === JSON.stringify(d);
      if (!same) diff[k] = v;
    }
    const sp = new URLSearchParams(window.location.search);
    if (Object.keys(diff).length === 0) sp.delete("f");
    else sp.set("f", encodeURIComponent(JSON.stringify(diff)));
    const qs = sp.toString();
    const target = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (target !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", target);
    }
  }, [debouncedF]);

  const search = useServerFn(searchMarketplace);
  const { data: result, isFetching } = useQuery({
    queryKey: ["marketplace-search", debouncedF, page],
    queryFn: () => search({ data: { filters: debouncedF, page } }),
    placeholderData: keepPreviousData,
  });

  const rawStones = result?.stones ?? [];
  const total = result?.total ?? 0;
  const marketTotal = result?.marketTotal ?? total;
  const isLoading = isFetching && !result;

  const isJewellerUser = checkJ(profile);
  const isApprovedJeweller = isJewellerUser && !!profile?.is_approved;

  // Single bulk fetch of the jeweller's wishlist (replaces N+1 per-card queries).
  const { data: wishlistIds } = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    enabled: !!user && isApprovedJeweller,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("stone_id")
        .eq("jeweller_id", user!.id);
      return new Set((data ?? []).map((w: any) => w.stone_id as string));
    },
  });

  // Followed dealer ids (drives the "In feed" badge).
  const { data: followedDealerIds } = useQuery({
    queryKey: ["followed-dealers", user?.id],
    enabled: !!user && isApprovedJeweller,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: keys } = await supabase
        .from("api_keys")
        .select("id")
        .eq("jeweller_id", user!.id)
        .eq("is_active", true)
        .limit(1);
      if (!keys?.[0]) return new Set<string>();
      const { data: sels } = await supabase
        .from("feed_selections")
        .select("dealer_id")
        .eq("api_key_id", keys[0].id)
        .eq("selection_type", "dealer_follow")
        .not("dealer_id", "is", null);
      return new Set((sels ?? []).map((s: any) => s.dealer_id as string));
    },
  });

  // Per-carat price mode: server filters per_stone; refine current page client-side.
  const visible = useMemo(() => {
    const list = debouncedF.priceMode !== "per_carat"
      ? rawStones
      : rawStones.filter((s: any) => {
      const price = Number(s.wholesale_price_usd ?? 0);
      const c = Number(s.carat_weight ?? 1) || 1;
      const v = price / c;
      return v >= debouncedF.priceMin && v <= debouncedF.priceMax;
    });
    if (!wishlistIds) return list;
    return list.map((s: any) => ({ ...s, isWishlisted: wishlistIds.has(s.id) }));
  }, [rawStones, debouncedF.priceMode, debouncedF.priceMin, debouncedF.priceMax, wishlistIds]);

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
  const displayTotal = filterCount > 0 ? total : marketTotal;
  const totalPages = Math.max(1, Math.ceil(displayTotal / PAGE_SIZE));
  const pageStart = displayTotal > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min((page - 1) * PAGE_SIZE + visible.length, displayTotal);
  const resultSummary =
    filterCount > 0
      ? `Showing ${pageStart.toLocaleString()}-${pageEnd.toLocaleString()} of ${displayTotal.toLocaleString()} matching listings · ${marketTotal.toLocaleString()} total stones`
      : `Showing ${pageStart.toLocaleString()}-${pageEnd.toLocaleString()} of ${displayTotal.toLocaleString()} total listings`;
  const showDiamond = hasDiamondSelection(f.types);
  const showColoured = hasColouredSelection(f.types);
  const isJeweller = isJewellerUser;

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          <PillWithHint
            active={f.matchingPairOnly}
            onClick={() => set({ matchingPairOnly: !f.matchingPairOnly })}
            hint="Two stones matched for colour, size, and cut — ideal for earrings or bilateral settings."
          >
            ★ Matched Pairs only
          </PillWithHint>
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
            <PillWithHint
              key={t}
              active={f.labs.includes(t)}
              onClick={() => toggle("labs", t)}
              hint={CERT_LAB_HINTS[t]}
            >
              {t}
            </PillWithHint>
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
            <PillWithHint
              key={s}
              active={f.listingType === s}
              onClick={() => set({ listingType: s })}
              hint={s === "parcel" ? "Multiple matching stones sold together as a lot, rather than individually." : undefined}
            >
              {s === "all" ? "All listings" : s}
            </PillWithHint>
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
                <PillWithHint
                  key={c}
                  active={f.eyeClean.includes(c)}
                  onClick={() => toggle("eyeClean", c)}
                  hint={String(c).toLowerCase() === "yes" ? "No inclusions visible to the naked eye. Standard minimum requirement for most fine jewellery." : undefined}
                >
                  {c}
                </PillWithHint>
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
            <CheckGridWithHints
              options={TREATMENTS}
              selected={f.treatments}
              onToggle={(v) => toggle("treatments", v)}
              hints={{
                None: "Unheated / untreated stones. These command a significant premium for rubies and sapphires.",
                "None (unheated)": "Unheated / untreated stones. These command a significant premium for rubies and sapphires.",
              }}
            />
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
              <span>Premium origins only (Burma, Kashmir, Colombia, Brazil…)</span>
              <HintIcon>Filters for stones from origins known to command a price premium: Burma ruby, Kashmir sapphire, Colombian emerald, Paraiba tourmaline.</HintIcon>
            </label>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <Checkbox checked={f.matchingPairOnly} onCheckedChange={(v) => set({ matchingPairOnly: !!v })} />
              <span>Matching pairs available</span>
              <HintIcon>Two stones matched for colour, size, and cut — ideal for earrings or bilateral settings.</HintIcon>
            </label>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <Checkbox checked={f.parcelOnly} onCheckedChange={(v) => set({ parcelOnly: !!v })} />
              <span>Parcel / lot available</span>
              <HintIcon>Multiple matching stones sold together as a lot, rather than individually.</HintIcon>
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
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
              {isLoading
                ? "Loading…"
                : `${resultSummary}${totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isApprovedJeweller && (
              <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
                <Switch checked={retailMode} onCheckedChange={setRetailMode} />
                <span className="font-medium">Retail mode</span>
              </label>
            )}
            {filterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
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
            <div className="mr-auto flex flex-wrap items-center gap-2">
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
              {f.fancyHues.map((t) => (
                <Chip key={t} label={`Fancy ${t}`} onClear={() => toggle("fancyHues", t)} />
              ))}
              {f.fancyIntensities.map((t) => (
                <Chip key={t} label={t} onClear={() => toggle("fancyIntensities", t)} />
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
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden max-h-[calc(100vh-2rem)] overflow-y-auto pr-2 lg:sticky lg:top-4 lg:block">
            {Filters}
          </aside>

          <div>
            {!isLoading && totalPages > 1 && (
              <MarketplacePagination
                className="mb-5"
                page={page}
                totalPages={totalPages}
                disabled={isFetching}
                onPageChange={goToPage}
              />
            )}
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
                  <StoneCard key={s.id} stone={s} followedDealerIds={followedDealerIds} retailMode={retailMode} />
                ))}
              </StaggerGroup>
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map((s) => (
                  <StoneCard key={s.id} stone={s} followedDealerIds={followedDealerIds} retailMode={retailMode} />
                ))}
              </div>
            )}
            {!isLoading && totalPages > 1 && (
              <MarketplacePagination
                className="mt-8"
                page={page}
                totalPages={totalPages}
                disabled={isFetching}
                onPageChange={goToPage}
              />
            )}
            {!isLoading && total === 0 && (
              <EmptyMarketplace
                hasFilters={filterCount > 0}
                filters={debouncedF}
                onClearFilters={() => dispatch({ type: "reset" })}
              />
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

function CheckGridWithHints({
  options,
  selected,
  onToggle,
  hints = {},
  labels = {},
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  hints?: Record<string, string>;
  labels?: Record<string, string>;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <label key={o} className="flex cursor-pointer items-center gap-2 text-xs capitalize">
          <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
          <span>{labels[o] ?? o.replace(/-/g, " ")}</span>
          {hints[o] && <HintIcon>{hints[o]}</HintIcon>}
        </label>
      ))}
    </div>
  );
}

function HintIcon({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center text-muted-foreground/70 hover:text-foreground">
          <Info className="h-3 w-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
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

const CERT_LAB_HINTS: Record<string, string> = {
  GRS: "Gemmological Research Switzerland — the leading laboratory for coloured stone country-of-origin reports.",
  AGL: "American Gemological Laboratories — highly regarded for sapphire, ruby, and emerald reports.",
};

function PillWithHint({
  children,
  active,
  onClick,
  hint,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  hint?: string;
}) {
  if (!hint) return <Pill active={active} onClick={onClick}>{children}</Pill>;
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${active ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {children}
          <Info className="h-3 w-3 opacity-60" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {hint}
      </TooltipContent>
    </Tooltip>
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

function paginationItems(page: number, totalPages: number): Array<number | "..."> {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1, page - 2, page + 2]);
  if (page <= 4) [2, 3, 4, 5].forEach((p) => pages.add(p));
  if (page >= totalPages - 3) [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | "..."> = [];
  for (const p of sorted) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && p - previous > 1) items.push("...");
    items.push(p);
  }
  return items;
}

function MarketplacePagination({
  page,
  totalPages,
  disabled,
  onPageChange,
  className = "",
}: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const [jumpPage, setJumpPage] = useState("");
  const items = paginationItems(page, totalPages);

  const submitJump = (event: FormEvent) => {
    event.preventDefault();
    const next = Number(jumpPage);
    if (!Number.isFinite(next)) return;
    onPageChange(next);
    setJumpPage("");
  };

  return (
    <nav
      className={`flex flex-col gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      aria-label="Marketplace pages"
    >
      <div className="text-xs text-muted-foreground">
        Page <span className="font-medium text-foreground">{page.toLocaleString()}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages.toLocaleString()}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onPageChange(1)}>
          First
        </Button>
        <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        {items.map((item, index) =>
          item === "..." ? (
            <span key={`ellipsis-${index}`} className="px-1 text-xs text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "default" : "outline"}
              size="sm"
              disabled={disabled || item === page}
              className="min-w-9 px-2"
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button variant="outline" size="sm" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
        <Button variant="outline" size="sm" disabled={disabled || page >= totalPages} onClick={() => onPageChange(totalPages)}>
          Last
        </Button>
      </div>
      <form onSubmit={submitJump} className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          max={totalPages}
          aria-label="Go to page"
          value={jumpPage}
          onChange={(e) => setJumpPage(e.target.value)}
          placeholder="Page"
          className="h-9 w-24"
        />
        <Button type="submit" variant="outline" size="sm" disabled={disabled || !jumpPage.trim()}>
          Go
        </Button>
      </form>
    </nav>
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

function EmptyMarketplace({
  hasFilters,
  filters,
  onClearFilters,
}: {
  hasFilters: boolean;
  filters: FilterState;
  onClearFilters: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const join = useServerFn(joinWaitlist);
  const getDiagnostics = useServerFn(getMarketplaceFilterDiagnostics);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  async function loadDiagnostics() {
    setDiagnosticsLoading(true);
    setDiagnostics(null);
    try {
      const result = await getDiagnostics({ data: { filters } });
      setDiagnostics(result);
    } finally {
      setDiagnosticsLoading(false);
    }
  }

  if (hasFilters) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground md:p-10">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-foreground">No matching stones yet</h2>
          <p className="mx-auto mt-2 max-w-md">
            Try clearing one or two filters, or use diagnostics to see the exact values currently stored in Chaos for shape, lab, colour, and treatment.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
            Clear all filters
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={loadDiagnostics}
            disabled={diagnosticsLoading}
          >
            {diagnosticsLoading ? "Checking values..." : "Show filter diagnostics"}
          </Button>
        </div>
        {diagnostics && (
          <div className="mt-6 rounded-md border border-border bg-card text-left">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-medium text-foreground">Filter Diagnostics</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Sampled {diagnostics.sampleSize?.toLocaleString?.() ?? diagnostics.sampleSize ?? 0} available stones. These are the raw values Chaos currently sees.
              </div>
            </div>
            {diagnostics.error ? (
              <div className="p-4 text-xs text-destructive">{diagnostics.error}</div>
            ) : (
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {Object.entries(diagnostics.fields ?? {}).map(([field, values]) => (
                  <div key={field}>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {field.replace(/_/g, " ")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {((values as Array<{ value: string; count: number }>) ?? []).slice(0, 12).map((item) => (
                        <span key={`${field}-${item.value}`} className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground">
                          {item.value} <span className="text-muted-foreground">({item.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  async function submit() {
    if (!email.trim()) return;
    setSaving(true);
    try {
      await join({ data: { email: email.trim() } });
      setDone(true);
    } catch {
      // ignore — treat as success-ish
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-md border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-2xl text-[var(--color-gold-foreground)]">
          ◆
        </div>
        <h2 className="font-serif text-2xl text-foreground">The marketplace is growing.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          We&apos;re onboarding our first verified dealers. Sign up to be notified when stones are listed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setOpen(true)}>Notify me when stones are listed →</Button>
          <Button variant="outline" asChild>
            <a href="/sign-up/dealer">Sign up as a dealer →</a>
          </Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Get notified when stones go live</DialogTitle>
          </DialogHeader>
          {done ? (
            <p className="py-4 text-sm text-muted-foreground">
              You&apos;re on the list. We&apos;ll email you the moment verified inventory is ready.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              <Label htmlFor="waitlist-email">Email address</Label>
              <Input
                id="waitlist-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          )}
          {!done && (
            <DialogFooter>
              <Button onClick={submit} disabled={saving || !email.trim()}>
                {saving ? "Saving…" : "Notify me"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
