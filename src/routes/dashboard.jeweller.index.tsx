import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ReferralNudge } from "@/components/dashboard/ReferralNudge";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { Users, Gem, KeyRound, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

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
      <RoleSwitcher current="jeweller" />
      <ReferralNudge />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-serif text-3xl">Welcome, {profile?.company_name || profile?.full_name}</h1>
        <p className="text-sm text-muted-foreground">Your sourcing dashboard.</p>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Followed vendors"
          value={data?.activeFeeds ?? 0}
          empty={(data?.activeFeeds ?? 0) === 0}
          ctaLabel="Follow your first vendor"
          ctaTo="/dashboard/jeweller/feeds"
          delay={0.05}
        />
        <StatCard
          icon={<Gem className="h-4 w-4" />}
          label="Stones in your feed"
          value={data?.stoneCount ?? 0}
          empty={(data?.stoneCount ?? 0) === 0}
          ctaLabel="Follow a vendor to populate your feed"
          ctaTo="/dashboard/jeweller/feeds"
          delay={0.15}
        />
        <ApiKeyCard active={!!data?.hasKey} delay={0.25} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Action title="Follow vendors" desc="Pick the dealers whose inventory should flow into your feed." to="/dashboard/jeweller/feeds" />
        <Action title="Set markup" desc="Global and per-vendor multipliers for retail price." to="/dashboard/jeweller/markup" />
        <Action title="Get API key" desc="Stream your curated feed into your Shopify or custom site." to="/dashboard/jeweller/api" />
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, empty, ctaLabel, ctaTo, delay,
}: { icon: React.ReactNode; label: string; value: number; empty: boolean; ctaLabel: string; ctaTo: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-[var(--color-gold)]/50"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-gold)]/15 text-[var(--color-gold)]">{icon}</span>
        {label}
      </div>
      <div className={`mt-3 font-serif text-4xl ${empty ? "text-muted-foreground/50" : "text-[var(--color-gold)]"}`}>
        {empty ? "—" : value}
      </div>
      {empty && (
        <Link to={ctaTo} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-gold)] hover:opacity-80">
          {ctaLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </motion.div>
  );
}

function ApiKeyCard({ active, delay }: { active: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-[var(--color-gold)]/50"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-gold)]/15 text-[var(--color-gold)]"><KeyRound className="h-4 w-4" /></span>
        API key
      </div>
      {active ? (
        <div className="mt-3 flex items-center gap-2 font-serif text-2xl">
          <span className="live-dot" /> <span>Active</span>
        </div>
      ) : (
        <>
          <div className="mt-3 font-serif text-2xl text-muted-foreground/60">Not generated</div>
          <Link to="/dashboard/jeweller/api" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-gold)] hover:opacity-80">
            Generate your API key <ArrowRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </motion.div>
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