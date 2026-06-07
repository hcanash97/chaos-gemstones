import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller as checkJ } from "@/lib/auth.utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getApprovedDealersWithStoneCounts, getJewellerApiStatus, toggleFeedSelection } from "@/lib/jeweller-feed.functions";

export const Route = createFileRoute("/dashboard/jeweller/feeds")({
  component: FeedsPage,
});

function FeedsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const fetchDealers = useServerFn(getApprovedDealersWithStoneCounts);
  const fetchStatus = useServerFn(getJewellerApiStatus);
  const saveSelection = useServerFn(toggleFeedSelection);
  const [search, setSearch] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);

  const isJeweller = checkJ(profile);

  const { data: dealers, isLoading: dealersLoading } = useQuery({
    queryKey: ["approved-dealers", user?.id],
    enabled: !!user?.id && isJeweller,
    queryFn: () => fetchDealers(),
  });

  const { data: status, refetch } = useQuery({
    queryKey: ["jeweller-feed-status", user?.id],
    enabled: !!user?.id && isJeweller,
    queryFn: () => fetchStatus(),
  });

  const selections = status?.selections ?? [];
  const followed = new Set(selections.filter((s) => s.selection_type === "dealer_follow").map((s) => s.dealer_id));
  const pinned = new Set(selections.filter((s) => s.selection_type === "stone_pin").map((s) => s.stone_id));

  const { data: searchResults } = useQuery({
    queryKey: ["stone-search", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("stones")
	        .select("id, stone_type, shape, carat_weight, wholesale_price_usd, dealer_id, profiles:dealer_id(company_name)")
	        .ilike("stone_type", `%${search}%`)
	        .eq("status", "available")
	        .eq("feed_inactive", false)
	        .limit(20);
      return data ?? [];
    },
  });

  async function onToggle(selectionType: "dealer_follow" | "stone_pin", id: string, enabled: boolean, addedStoneCount = 0) {
    setInlineError(null);
    try {
      await saveSelection({ data: selectionType === "dealer_follow" ? { selectionType, dealerId: id, enabled } : { selectionType, stoneId: id, enabled } });
      await refetch();
      qc.invalidateQueries({ queryKey: ["jeweller-overview"] });
      qc.invalidateQueries({ queryKey: ["jeweller-intelligence"] });
      toast.success(
        enabled && selectionType === "dealer_follow"
          ? `+${addedStoneCount.toLocaleString()} stones added to your private feed.`
          : enabled
          ? "Saved"
          : "Removed",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Server error";
      setInlineError(message);
      toast.error(message);
    }
  }

  const activeDealers = (dealers ?? []).filter((dealer: any) => dealer.stoneCount > 0);
  const liveCount = activeDealers.filter((d: any) => followed.has(d.id)).reduce((acc: number, d: any) => acc + d.stoneCount, 0) + pinned.size;

  if (!isJeweller) return <div>Jewellers only.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Vendors & Stones</h1>
          <p className="text-sm text-muted-foreground">Curate the inventory that flows into your feed.</p>
        </div>
        <div className="rounded-md border border-[var(--color-gold)] bg-[var(--color-gold)]/10 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Live feed: </span>
          <span className="font-mono text-lg font-semibold">{liveCount}</span>
          <span className="text-muted-foreground"> stones</span>
        </div>
      </div>

      {inlineError && <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{inlineError}</div>}

      <section className="mt-8">
        <h2 className="font-serif text-xl">Approved dealers</h2>
	        <div className="mt-3 overflow-x-auto rounded-md border border-border">
	          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left">Vendor</th>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-left">Specialities</th>
                <th className="px-4 py-2 text-right">Stones</th>
                <th className="px-4 py-2 text-right">Follow entire catalogue</th>
              </tr>
            </thead>
            <tbody>
              {dealersLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-t border-border">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-4 w-8" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-5 w-10" /></td>
                  </tr>
                ))}
              {activeDealers.map((d: any) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{d.profiles?.company_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.profiles?.country}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{(d.specialities ?? []).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{d.stoneCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Switch checked={followed.has(d.id)} onCheckedChange={(value) => onToggle("dealer_follow", d.id, value, d.stoneCount)} />
                  </td>
                </tr>
              ))}
              {!dealersLoading && !activeDealers.length && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No approved dealers are listed yet. Check back soon or browse the marketplace.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Custom pinned stones</h2>
        <p className="text-sm text-muted-foreground">Add specific stones to your feed regardless of vendor follow.</p>
        <Input placeholder="Search stones by type (e.g. sapphire, diamond)…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-3 max-w-md" />
        {search.length >= 2 && (
          <div className="mt-3 space-y-1">
            {(searchResults ?? []).map((s: any) => {
              const isPinned = pinned.has(s.id);
              return (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-2 text-sm">
                  <div>
                    <span className="capitalize">{s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : ""}{s.shape} {s.stone_type}</span>
                    <span className="ml-2 text-xs text-muted-foreground">— {s.profiles?.company_name}</span>
                  </div>
                  <Button variant={isPinned ? "outline" : "default"} size="sm" onClick={() => onToggle("stone_pin", s.id, !isPinned)}>
                    {isPinned ? <><PinOff className="mr-1 h-3 w-3" /> Unpin</> : <><Pin className="mr-1 h-3 w-3" /> Pin</>}
                  </Button>
                </div>
              );
            })}
            {!searchResults?.length && <div className="text-sm text-muted-foreground">No matches.</div>}
          </div>
        )}
      </section>
    </div>
  );
}
