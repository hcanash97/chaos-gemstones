import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pin, PinOff } from "lucide-react";

export const Route = createFileRoute("/dashboard/jeweller/feeds")({
  component: FeedsPage,
});

async function ensureApiKey(userId: string) {
  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("jeweller_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (data) return data.id;
  // create placeholder hashed key so selections can attach; user generates real key separately
  const placeholder = crypto.randomUUID();
  const { data: created } = await supabase
    .from("api_keys")
    .insert({ jeweller_id: userId, key_hash: placeholder, label: "default", is_active: true })
    .select("id")
    .single();
  return created!.id;
}

function FeedsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  if (profile?.account_type !== "jeweller") return <div>Jewellers only.</div>;

  const { data: dealers } = useQuery({
    queryKey: ["dealers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dealer_profiles")
        .select("id, slug, specialities, profiles!inner(company_name, country, is_approved)")
        .filter("profiles.is_approved", "eq", true);
      const ids = (data ?? []).map((d: any) => d.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: rows } = await supabase
          .from("stones")
          .select("dealer_id")
          .in("dealer_id", ids)
          .eq("status", "available");
        (rows ?? []).forEach((r: any) => {
          counts[r.dealer_id] = (counts[r.dealer_id] ?? 0) + 1;
        });
      }
      return (data ?? []).map((d: any) => ({ ...d, stoneCount: counts[d.id] ?? 0 }));
    },
  });

  const { data: selections, refetch } = useQuery({
    queryKey: ["my-selections", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("feed_selections")
        .select("id, selection_type, stone_id, dealer_id, api_key_id");
      return data ?? [];
    },
  });

  const followed = new Set((selections ?? []).filter((s) => s.selection_type === "dealer_follow").map((s) => s.dealer_id));
  const pinned = new Set((selections ?? []).filter((s) => s.selection_type === "stone_pin").map((s) => s.stone_id));

  async function toggleFollow(dealerId: string, on: boolean) {
    if (!user) return;
    const apiKeyId = await ensureApiKey(user.id);
    if (on) {
      const { error } = await supabase.from("feed_selections").insert({
        api_key_id: apiKeyId,
        selection_type: "dealer_follow",
        dealer_id: dealerId,
      });
      if (error) toast.error(error.message);
    } else {
      const row = (selections ?? []).find((s) => s.selection_type === "dealer_follow" && s.dealer_id === dealerId);
      if (row) await supabase.from("feed_selections").delete().eq("id", row.id);
    }
    refetch();
    qc.invalidateQueries({ queryKey: ["jeweller-overview"] });
  }

  const { data: searchResults } = useQuery({
    queryKey: ["stone-search", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("stones")
        .select("id, stone_type, shape, carat_weight, wholesale_price_usd, dealer_id, profiles:dealer_id(company_name)")
        .ilike("stone_type", `%${search}%`)
        .eq("status", "available")
        .limit(20);
      return data ?? [];
    },
  });

  async function togglePin(stoneId: string, on: boolean) {
    if (!user) return;
    const apiKeyId = await ensureApiKey(user.id);
    if (on) {
      await supabase.from("feed_selections").insert({
        api_key_id: apiKeyId,
        selection_type: "stone_pin",
        stone_id: stoneId,
      });
    } else {
      const row = (selections ?? []).find((s) => s.selection_type === "stone_pin" && s.stone_id === stoneId);
      if (row) await supabase.from("feed_selections").delete().eq("id", row.id);
    }
    refetch();
    qc.invalidateQueries({ queryKey: ["jeweller-overview"] });
  }

  const liveCount =
    (dealers ?? []).filter((d) => followed.has(d.id)).reduce((acc, d) => acc + d.stoneCount, 0) + pinned.size;

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

      <section className="mt-8">
        <h2 className="font-serif text-xl">Approved dealers</h2>
        <div className="mt-3 overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left">Vendor</th>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-left">Specialities</th>
                <th className="px-4 py-2 text-right">Stones</th>
                <th className="px-4 py-2 text-right">Follow all</th>
              </tr>
            </thead>
            <tbody>
              {(dealers ?? []).map((d: any) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{d.profiles?.company_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.profiles?.country}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{(d.specialities ?? []).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{d.stoneCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Switch checked={followed.has(d.id)} onCheckedChange={(v) => toggleFollow(d.id, v)} />
                  </td>
                </tr>
              ))}
              {!dealers?.length && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No approved dealers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Custom pinned stones</h2>
        <p className="text-sm text-muted-foreground">Add specific stones to your feed regardless of vendor follow.</p>
        <Input
          placeholder="Search stones by type (e.g. sapphire, diamond)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3 max-w-md"
        />
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
                  <Button variant={isPinned ? "outline" : "default"} size="sm" onClick={() => togglePin(s.id, !isPinned)}>
                    {isPinned ? <><PinOff className="mr-1 h-3 w-3" /> Unpin</> : <><Pin className="mr-1 h-3 w-3" /> Pin</>}
                  </Button>
                </div>
              );
            })}
            {!searchResults?.length && <div className="text-sm text-muted-foreground">No matches.</div>}
          </div>
        )}
        {pinned.size > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">{pinned.size} stone{pinned.size === 1 ? "" : "s"} currently pinned.</div>
        )}
      </section>
    </div>
  );
}