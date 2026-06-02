import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ReferralNudge } from "@/components/dashboard/ReferralNudge";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, available: 0, sold: 0, featured: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("stones")
        .select("status, featured")
        .eq("dealer_id", user.id);
      const rows = data ?? [];
      setStats({
        total: rows.length,
        available: rows.filter((r) => r.status === "available").length,
        sold: rows.filter((r) => r.status === "sold").length,
        featured: rows.filter((r) => r.featured).length,
      });
    })();
  }, [user]);

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
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total listings", value: stats.total },
          { label: "Available", value: stats.available },
          { label: "Sold", value: stats.sold },
          { label: "Featured", value: stats.featured },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-serif text-3xl text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-xl text-foreground">Getting started</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Add stones one at a time from <Link to="/dashboard/stones/new" className="text-foreground underline">New stone</Link>.</li>
          <li>• Upload high-resolution images for every listing — jewellers buy on visuals.</li>
          <li>• Mark featured stones to surface them on the homepage and your vendor page.</li>
        </ul>
      </div>
    </div>
  );
}