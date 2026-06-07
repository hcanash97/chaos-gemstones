import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getJewellerSettings } from "@/lib/profile-settings.functions";
import { useJewellerIntelligence } from "@/hooks/useJewellerIntelligence";
import { Button } from "@/components/ui/button";
import { ReferralNudge } from "@/components/dashboard/ReferralNudge";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { Users, Gem, KeyRound, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export const Route = createFileRoute("/dashboard/jeweller/")({
  component: JewellerOverview,
});

function JewellerOverview() {
  const { user, profile } = useAuth();
  const fetchSettings = useServerFn(getJewellerSettings);
  const intelligence = useJewellerIntelligence(user?.id);

  const { data } = useQuery({
    queryKey: ["jeweller-overview", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [keys, selections, jp, shopify] = await Promise.all([
        supabase.from("api_keys").select("id, is_active").eq("jeweller_id", user!.id),
        supabase.from("feed_selections").select("selection_type, stone_id, dealer_id"),
        fetchSettings(),
        supabase.from("shopify_connections" as any).select("id").eq("jeweller_id", user!.id).maybeSingle(),
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
        hasMarkup: jp?.markup_global != null,
        hasShopify: !!shopify.data,
      };
    },
  });

  const showOnboarding =
    !!data &&
    data.activeFeeds === 0 &&
    data.stoneCount === 0 &&
    !data.hasKey;

  return (
    <div>
      <RoleSwitcher current="jeweller" />
      <ReferralNudge />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-serif text-3xl">Welcome, {profile?.company_name || profile?.full_name}</h1>
        <p className="text-sm text-muted-foreground">Your sourcing dashboard.</p>
      </motion.div>

      <JewellerIntelligenceBanner intelligence={intelligence} />

      {showOnboarding ? (
        <JewellerOnboarding
          hasFollows={(data?.activeFeeds ?? 0) > 0}
          hasMarkup={!!data?.hasMarkup}
          hasKey={!!data?.hasKey}
          hasShopify={!!data?.hasShopify}
        />
      ) : (
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Followed vendors"
          hint="The number of dealers whose entire catalogue flows into your API feed. Follow dealers on the Vendors & Stones page."
          value={data?.activeFeeds ?? 0}
          empty={(data?.activeFeeds ?? 0) === 0}
          ctaLabel="Follow your first vendor"
          ctaTo="/dashboard/jeweller/feeds"
          delay={0.05}
        />
        <StatCard
          icon={<Gem className="h-4 w-4" />}
          label="Stones in your feed"
          hint="Total available stones currently in your live API feed. These appear on any website where you've embedded the Chaos widget."
          value={data?.stoneCount ?? 0}
          empty={(data?.stoneCount ?? 0) === 0}
          ctaLabel="Follow a vendor to populate your feed"
          ctaTo="/dashboard/jeweller/feeds"
          delay={0.15}
        />
        <ApiKeyCard active={!!data?.hasKey} delay={0.25} />
      </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Action title="Follow vendors" desc="Pick the dealers whose inventory should flow into your feed." to="/dashboard/jeweller/feeds" />
        <Action title="Set markup" desc="Global and per-vendor multipliers for retail price." to="/dashboard/jeweller/markup" />
        <Action title="Get API key" desc="Stream your curated feed into your Shopify or custom site." to="/dashboard/jeweller/api" />
      </div>
    </div>
  );
}

function JewellerIntelligenceBanner({
  intelligence,
}: {
  intelligence: ReturnType<typeof useJewellerIntelligence>;
}) {
  if (intelligence.isLoading) return null;
  if (intelligence.feedStones === 0 && intelligence.followedDealers === 0) {
    return (
      <div className="mt-5 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <Gem className="h-4 w-4 text-[var(--color-gold)]" />
          <span>
            You&apos;re not following any dealers yet. Jewellers who follow 3 or more dealers source significantly faster and get first access to Direct Vault drops.
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/vendors">Browse Dealers →</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Gem className="h-4 w-4 text-[var(--color-gold)]" />
        {intelligence.vaultStones > 0 ? (
          <span>
            You have access to {intelligence.feedStones.toLocaleString()} stones, including {intelligence.vaultStones.toLocaleString()} Direct Vault drops not visible to unfollowed jewellers.
          </span>
        ) : (
          <span>Follow dealers to unlock Direct Vault drops before they reach the open market.</span>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, hint, value, empty, ctaLabel, ctaTo, delay,
}: { icon: React.ReactNode; label: string; hint?: string; value: number; empty: boolean; ctaLabel: string; ctaTo: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-[var(--color-gold)]/50"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-gold)]/15 text-[var(--color-gold)]">{icon}</span>
        <span>{label}</span>
        {hint && <InfoTooltip>{hint}</InfoTooltip>}
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
        <span>API key</span>
        <InfoTooltip>Your unique key for the live inventory feed. Paste it into your website embed code to show stones live.</InfoTooltip>
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

function JewellerOnboarding({
  hasFollows,
  hasMarkup,
  hasKey,
  hasShopify,
}: {
  hasFollows: boolean;
  hasMarkup: boolean;
  hasKey: boolean;
  hasShopify: boolean;
}) {
  const steps = [
    { done: hasFollows, title: "Browse verified dealers and follow their catalogues", to: "/dashboard/jeweller/feeds", cta: "Go to Vendors & Stones" },
    { done: hasMarkup, title: "Set your markup multiplier (how much you add on top of wholesale)", to: "/dashboard/jeweller/markup", cta: "Set markup" },
    { done: hasKey, title: "Generate your API key and embed it on your website", to: "/dashboard/jeweller/api", cta: "Get API key" },
    { done: hasShopify, title: "For Shopify stores, connect your store for automatic product sync", to: "/dashboard/jeweller/shopify", cta: "Connect Shopify" },
  ] as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-6 rounded-lg border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 p-6"
    >
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-gold)]">Getting started with Chaos</div>
      <h2 className="mt-1 font-serif text-2xl">Four steps to your first live feed</h2>
      <ol className="mt-5 space-y-3">
        <li className="flex items-start gap-3 opacity-60">
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
            <Check className="h-3 w-3" />
          </span>
          <span className="text-sm line-through">Account approved</span>
        </li>
        {steps.map((s, i) => (
          <li key={i} className={`flex items-start gap-3 ${s.done ? "opacity-60" : ""}`}>
            <span
              className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                s.done ? "bg-green-500 text-white" : "border border-[var(--color-gold)]/60 text-[var(--color-gold)]"
              }`}
            >
              {s.done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <div className="flex-1">
              <div className={`text-sm ${s.done ? "line-through" : "text-foreground"}`}>Step {i + 1}: {s.title}</div>
              {!s.done && (
                <Link to={s.to} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-gold)] hover:opacity-80">
                  {s.cta} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
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
