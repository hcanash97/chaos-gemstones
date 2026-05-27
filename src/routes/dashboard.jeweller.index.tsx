import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/jeweller/")({
  component: JewellerOverview,
});

function JewellerOverview() {
  const { user, profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["jeweller-overview", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [keys, selections] = await Promise.all([
        supabase.from("api_keys").select("id, is_active").eq("jeweller_id", user!.id),
        supabase.from("feed_selections").select("selection_type, stone_id, dealer_id"),
      ]);
      const activeKey = (keys.data ?? []).find((k) => k.is_active);
      const sels = selections.data ?? [];
      const dealerFollows = sels.filter((s) => s.selection_type === "dealer_follow");
      const stonePins = sels.filter((s) => s.selection_type === "stone_pin");

      let stoneCount = stonePins.length;
      if (dealerFollows.length) {
        const { count } = await supabase
          .from("stones")
          .select("id", { count: "exact", head: true })
          .in("dealer_id", dealerFollows.map((d) => d.dealer_id as string))
          .eq("status", "available");
        stoneCount += count ?? 0;
      }
      return {
        activeFeeds: dealerFollows.length,
        stoneCount,
        hasKey: !!activeKey,
      };
    },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">Welcome, {profile?.company_name || profile?.full_name}</h1>
      <p className="text-sm text-muted-foreground">Your sourcing dashboard.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Followed vendors" value={data?.activeFeeds ?? 0} />
        <Stat label="Stones in your feed" value={data?.stoneCount ?? 0} />
        <Stat label="API key" value={data?.hasKey ? "Active" : "Not generated"} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Action title="Follow vendors" desc="Pick the dealers whose inventory should flow into your feed." to="/dashboard/jeweller/feeds" />
        <Action title="Set markup" desc="Global and per-vendor multipliers for retail price." to="/dashboard/jeweller/markup" />
        <Action title="Get API key" desc="Stream your curated feed into your Shopify or custom site." to="/dashboard/jeweller/api" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif text-3xl">{value}</div>
    </div>
  );
}

function Action({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <Link to={to} className="block rounded-lg border border-border bg-card p-5 transition hover:border-[var(--color-gold)]">
      <div className="font-serif text-lg">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <Button variant="link" className="mt-2 px-0 text-[var(--color-gold)]">Open →</Button>
    </Link>
  );
}