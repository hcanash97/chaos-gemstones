import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ReferralNudge } from "@/components/dashboard/ReferralNudge";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, available: 0, sold: 0, featured: 0, views: 0, enquiries: 0 });
  const [dealerProfile, setDealerProfile] = useState<{ bio: string | null; specialities: string[] | null; logo_url: string | null; slug: string | null; external_feed_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, viewRes, enqRes, dp] = await Promise.all([
        supabase.from("stones").select("status, featured, view_count").eq("dealer_id", user.id),
        supabase.from("stones").select("view_count").eq("dealer_id", user.id),
        supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("to_dealer_id", user.id),
        supabase.from("dealer_profiles").select("bio, specialities, logo_url, slug, external_feed_url").eq("id", user.id).maybeSingle(),
      ]);
      const rows = data ?? [];
      const views = (viewRes.data ?? []).reduce((t: number, r: any) => t + (Number(r.view_count) || 0), 0);
      setStats({
        total: rows.length,
        available: rows.filter((r) => r.status === "available").length,
        sold: rows.filter((r) => r.status === "sold").length,
        featured: rows.filter((r) => r.featured).length,
        views,
        enquiries: enqRes.count ?? 0,
      });
      setDealerProfile((dp.data as any) ?? null);
    })();
  }, [user]);

  const showOnboarding = stats.total === 0;
  const cards = [
    { label: "Total listings", value: stats.total, hint: "All stones you've uploaded including available, reserved, and sold." },
    { label: "Available", value: stats.available, hint: "Stones currently visible on the Chaos marketplace and in jeweller API feeds." },
    { label: "Views", value: stats.views, hint: "Total number of times your stones have been viewed on the marketplace." },
    { label: "Enquiries", value: stats.enquiries, hint: "Messages sent to you by jewellers about your stones." },
  ];

  return (
    <div>
      <RoleSwitcher current="dealer" />
      <ReferralNudge />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Dealer Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your gemstone inventory.</p>
        </div>
        <Link to="/dashboard/stones/new">
          <Button className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
            + New stone
          </Button>
        </Link>
      </div>
      {showOnboarding ? (
        <DealerOnboarding
          profileComplete={!!(dealerProfile?.bio && (dealerProfile?.specialities?.length ?? 0) > 0 && dealerProfile?.logo_url)}
          hasFeed={!!dealerProfile?.external_feed_url}
          slug={dealerProfile?.slug ?? null}
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <span>{s.label}</span>
                <InfoTooltip>{s.hint}</InfoTooltip>
              </div>
              <div className="mt-2 font-serif text-3xl text-foreground">{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DealerOnboarding({
  profileComplete,
  hasFeed,
  slug,
}: {
  profileComplete: boolean;
  hasFeed: boolean;
  slug: string | null;
}) {
  const profileUrl = slug && typeof window !== "undefined" ? `${window.location.origin}/vendors/${slug}` : null;
  const steps = [
    { done: profileComplete, title: "Complete your dealer profile (bio, specialities, logo)", to: "/dashboard/account", cta: "Edit profile", action: null as null | (() => void) },
    { done: false, title: "Upload your first stones manually or via CSV", to: "/dashboard/stones/new", cta: "Add stones", action: null },
    { done: hasFeed, title: "Connect your inventory feed for automatic sync (optional)", to: "/dashboard/import", cta: "Set up feed sync", action: null },
    {
      done: false,
      title: "Share your Chaos profile with your existing buyers",
      to: "/dashboard/account",
      cta: profileUrl ? "Copy profile link" : "Set up profile",
      action: profileUrl
        ? () => {
            navigator.clipboard.writeText(profileUrl);
            toast.success("Profile link copied");
          }
        : null,
    },
  ] as const;
  return (
    <div className="mt-6 rounded-lg border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 p-6">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-gold)]">Getting started as a dealer</div>
      <h2 className="mt-1 font-serif text-2xl">Four steps to go live on Chaos</h2>
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
                s.action ? (
                  <button
                    type="button"
                    onClick={s.action}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-gold)] hover:opacity-80"
                  >
                    {s.cta} <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <Link to={s.to} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-gold)] hover:opacity-80">
                    {s.cta} <ArrowRight className="h-3 w-3" />
                  </Link>
                )
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}