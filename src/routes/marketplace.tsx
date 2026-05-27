import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { StoneCard } from "@/components/site/StoneCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { StaggerGroup } from "@/components/anim/Motion";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
  head: () => ({
    meta: [
      { title: "Browse Certified Gemstones & Diamonds — Chaos" },
      { name: "description", content: "Search certified natural and lab-grown diamonds, sapphires, rubies, emeralds and rare coloured gemstones from verified dealers worldwide." },
      { property: "og:title", content: "Browse Certified Gemstones & Diamonds — Chaos" },
      { property: "og:description", content: "Search certified natural and lab-grown diamonds and coloured gemstones from verified dealers worldwide." },
      { property: "og:url", content: "/marketplace" },
    ],
    links: [{ rel: "canonical", href: "/marketplace" }],
  }),
});

const STONE_TYPES = ["diamond", "ruby", "sapphire", "emerald", "spinel", "tourmaline", "tanzanite", "garnet", "aquamarine", "morganite"];
const SHAPES = ["round", "oval", "cushion", "emerald", "pear", "princess", "radiant"];
const CERT_LABS = ["GIA", "IGI", "HRD", "GRS", "AGL", "Gübelin"];

function Marketplace() {
  const [types, setTypes] = useState<string[]>([]);
  const [shapes, setShapes] = useState<string[]>([]);
  const [labs, setLabs] = useState<string[]>([]);
  const [origin, setOrigin] = useState<"all" | "natural" | "lab-grown">("all");
  const [carat, setCarat] = useState<[number, number]>([0.1, 20]);
  const [price, setPrice] = useState<[number, number]>([0, 100000]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [dealerId, setDealerId] = useState<string>("all");

  const { data: stones, isLoading } = useQuery({
    queryKey: ["marketplace-stones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stones")
        .select("id, dealer_id, stone_type, shape, carat_weight, origin, country_of_origin, cert_lab, wholesale_price_usd, colour_grade, clarity_grade, created_at, stone_images(storage_url, is_primary), profiles:dealer_id(country, is_verified)")
        .eq("status", "available")
        .limit(500);
      return (data ?? []).map((s: any) => ({
        ...s,
        image: s.stone_images?.[0]?.storage_url ?? null,
        dealer_country: s.profiles?.country ?? null,
        dealer_verified: !!s.profiles?.is_verified,
      }));
    },
  });

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

  const filtered = useMemo(() => {
    let list = stones ?? [];
    if (dealerId !== "all") list = list.filter((s) => s.dealer_id === dealerId);
    if (types.length) list = list.filter((s) => types.includes(s.stone_type));
    if (shapes.length) list = list.filter((s) => s.shape && shapes.includes(s.shape));
    if (labs.length) list = list.filter((s) => s.cert_lab && labs.includes(s.cert_lab));
    if (origin !== "all") list = list.filter((s) => s.origin === origin);
    list = list.filter((s) => {
      const c = Number(s.carat_weight ?? 0);
      return c >= carat[0] && c <= carat[1];
    });
    list = list.filter((s) => {
      const p = Number(s.wholesale_price_usd ?? 0);
      return p >= price[0] && p <= price[1];
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.stone_type?.toLowerCase().includes(q) ||
          s.shape?.toLowerCase().includes(q) ||
          s.country_of_origin?.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case "price-asc": list = [...list].sort((a, b) => Number(a.wholesale_price_usd) - Number(b.wholesale_price_usd)); break;
      case "price-desc": list = [...list].sort((a, b) => Number(b.wholesale_price_usd) - Number(a.wholesale_price_usd)); break;
      case "carat": list = [...list].sort((a, b) => Number(b.carat_weight) - Number(a.carat_weight)); break;
      default: list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [stones, types, shapes, labs, origin, carat, price, search, sort, dealerId]);

  const toggle = (arr: string[], setter: (v: string[]) => void, v: string) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const Filters = (
    <div className="space-y-7">
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ruby, oval, Sri Lanka…" className="mt-2" />
      </div>
      <FilterGroup label="Dealer">
        <Select value={dealerId} onValueChange={setDealerId}>
          <SelectTrigger><SelectValue placeholder="All dealers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dealers</SelectItem>
            {(dealers ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>
      <FilterGroup label="Stone type">
        {STONE_TYPES.map((t) => (
          <CheckRow key={t} label={t} checked={types.includes(t)} onChange={() => toggle(types, setTypes, t)} />
        ))}
      </FilterGroup>
      <FilterGroup label="Shape">
        {SHAPES.map((t) => (
          <CheckRow key={t} label={t} checked={shapes.includes(t)} onChange={() => toggle(shapes, setShapes, t)} />
        ))}
      </FilterGroup>
      <FilterGroup label="Origin">
        <div className="flex gap-2 text-xs">
          {(["all", "natural", "lab-grown"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrigin(o)}
              className={`rounded-md border px-3 py-1.5 capitalize ${origin === o ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "border-border"}`}
            >
              {o.replace("-", " ")}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label={`Carat: ${carat[0]} – ${carat[1]}`}>
        <Slider min={0.1} max={20} step={0.1} value={carat} onValueChange={(v) => setCarat(v as [number, number])} />
      </FilterGroup>
      <FilterGroup label={`Price USD: $${price[0].toLocaleString()} – $${price[1].toLocaleString()}`}>
        <Slider min={0} max={100000} step={500} value={price} onValueChange={(v) => setPrice(v as [number, number])} />
      </FilterGroup>
      <FilterGroup label="Cert lab">
        {CERT_LABS.map((t) => (
          <CheckRow key={t} label={t} checked={labs.includes(t)} onChange={() => toggle(labs, setLabs, t)} />
        ))}
      </FilterGroup>
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
              {isLoading ? "Loading…" : `${filtered.length} stones available`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                <div className="mt-4">{Filters}</div>
              </SheetContent>
            </Sheet>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: low to high</SelectItem>
                <SelectItem value="price-desc">Price: high to low</SelectItem>
                <SelectItem value="carat">Carat: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">{Filters}</aside>

          <div>
            <StaggerGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" delay={0.06}>
              {filtered.map((s) => <StoneCard key={s.id} stone={s} />)}
            </StaggerGroup>
            {!isLoading && filtered.length === 0 && (
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

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm capitalize">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}