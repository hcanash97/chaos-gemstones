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
        supabase.from("dealer_profiles").select("bio, specialities, logo_url, slug").eq("id", user.id).maybeSingle(),
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Dealer Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Add, automate, translate, and manage your gemstone inventory from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/stones">
            <Button variant="outline">View all inventory</Button>
          </Link>
          <Link to="/dashboard/import">
            <Button className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
              Upload Excel / CSV
            </Button>
          </Link>
        </div>
      </div>

      <InventoryActionHub />
      <TranslationHelpCard />

      {showOnboarding && (
        <DealerOnboarding
          profileComplete={!!(dealerProfile?.bio && (dealerProfile?.specialities?.length ?? 0) > 0 && dealerProfile?.logo_url)}
          hasFeed={!!dealerProfile?.external_feed_url}
          slug={dealerProfile?.slug ?? null}
        />
      )}

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
    </div>
  );
}


function InventoryActionHub() {
  const actions = [
    {
      title: "Upload an Excel or CSV file",
      desc: "Use this if your stock is in a spreadsheet from Excel, Numbers, RapNet, Kodllin, or another system.",
      cta: "Upload Excel / CSV",
      to: "/dashboard/import",
      emphasis: true,
    },
    {
      title: "Connect automatic inventory sync",
      desc: "Use this if you have a live feed, API URL, Kodllin export, or another system Chaos should check again.",
      cta: "Set up automatic sync",
      to: "/dashboard/dealer/api",
      emphasis: false,
    },
    {
      title: "Paste WhatsApp stock messages",
      desc: "Use this when suppliers send stones by WhatsApp and you want Chaos to turn the message into draft listings.",
      cta: "Paste WhatsApp stock",
      to: "/dashboard/dealer/whatsapp",
      emphasis: false,
    },
    {
      title: "Add or edit stones manually",
      desc: "Use this to add one stone, change prices, mark stones sold, or review everything currently listed.",
      cta: "View all inventory",
      to: "/dashboard/stones",
      emphasis: false,
    },
  ];
  return (
    <section className="mt-6 rounded-xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">Inventory setup</div>
          <h2 className="mt-1 font-serif text-2xl text-foreground">How do you want to add your inventory?</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Choose the option that matches how your stock is stored today. You can change this later.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.title}
            to={a.to}
            className={`group flex h-full flex-col rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
              a.emphasis
                ? "border-[var(--color-gold)] bg-background"
                : "border-border bg-background/80"
            }`}
          >
            <h3 className="font-medium text-foreground">{a.title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-gold)]">
              {a.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TranslationHelpCard() {
  const languages = ["English", "हिन्दी", "ไทย", "සිංහල", "Español", "Français"];
  return (
    <section className="mt-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-medium text-foreground">Need this setup guidance in another language?</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Dealer setup pages can be written in simpler translated guidance so uploading, syncing, and WhatsApp intake are easier to follow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {languages.map((language) => (
            <span key={language} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              {language}
            </span>
          ))}
        </div>
      </div>
    </section>
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
    { done: false, title: "Upload your first stones manually", to: "/dashboard/stones/new", cta: "Add stones", action: null },
    { done: false, title: "Upload an Excel or CSV file", to: "/dashboard/import", cta: "Upload Excel / CSV", action: null },
    { done: hasFeed, title: "Connect automatic inventory sync", to: "/dashboard/dealer/api", cta: "Set up automatic sync", action: null },
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
      <h2 className="mt-1 font-serif text-2xl">Finish setting up your dealer account</h2>
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