import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (profile && !profile.is_approved) {
      navigate({ to: "/pending-approval", replace: true });
      return;
    }
    if (profile && pathname === "/dashboard" && profile.account_type === "jeweller") {
      navigate({ to: "/dashboard/jeweller", replace: true });
    }
  }, [loading, user, profile, navigate, pathname]);

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  const isJeweller = profile.account_type === "jeweller";
  const nav = isJeweller
    ? [
        { to: "/dashboard/jeweller", label: "Overview", exact: true },
        { to: "/dashboard/jeweller/feeds", label: "Vendors & Stones", exact: false },
        { to: "/dashboard/jeweller/markup", label: "Markup", exact: false },
        { to: "/dashboard/jeweller/api", label: "API Feed", exact: false },
        { to: "/dashboard/jeweller/enquiries", label: "My Enquiries", exact: false },
      ]
    : [
        { to: "/dashboard", label: "Overview", exact: true },
        { to: "/dashboard/stones", label: "My Inventory", exact: false },
        { to: "/dashboard/enquiries", label: "Enquiries", exact: false },
        { to: "/dashboard/import", label: "CSV Import", exact: false },
      ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-serif text-2xl font-semibold">CHAOS</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden opacity-80 sm:inline">
              {profile.company_name || profile.full_name || user.email}
            </span>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:grid-cols-[220px_1fr]">
        <aside>
          <nav className="flex flex-col gap-1">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-[var(--color-gold)]/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}