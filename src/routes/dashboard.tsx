import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { isDealer, isJeweller, isDualRole } from "@/lib/auth.utils";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

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
    // Pure jewellers (no dealer role) landing on /dashboard get redirected to /dashboard/jeweller.
    // Dual-role users with primary 'jeweller' still see both nav sections and stay on whichever they opened.
    if (profile && pathname === "/dashboard" && !isDealer(profile) && isJeweller(profile)) {
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

  const showDealer = isDealer(profile);
  const showJeweller = isJeweller(profile);
  const dual = isDualRole(profile);

  const dealerNav = [
    { to: "/dashboard", label: "Overview", exact: true },
    { to: "/dashboard/stones", label: "My Inventory", exact: false },
    { to: "/dashboard/enquiries", label: "Enquiries", exact: false },
    { to: "/dashboard/sales", label: "Sales", exact: false },
    { to: "/dashboard/dealer/pricing", label: "Pricing rules", exact: false },
    { to: "/dashboard/import", label: "CSV Import", exact: false },
    { to: "/dashboard/dealer/api", label: "Developer API", exact: false },
  ];
  const jewellerNav = [
    { to: "/dashboard/jeweller", label: "Overview", exact: true },
    { to: "/dashboard/jeweller/feeds", label: "Vendors & Stones", exact: false },
    { to: "/dashboard/import", label: "Import Stones", exact: false },
    { to: "/dashboard/jeweller/markup", label: "Markup", exact: false },
    { to: "/dashboard/jeweller/api", label: "API Feed", exact: false },
    { to: "/dashboard/jeweller/shopify", label: "Shopify Sync", exact: false },
    { to: "/dashboard/jeweller/orders", label: "My Orders", exact: false },
    { to: "/dashboard/jeweller/enquiries", label: "My Enquiries", exact: false },
    { to: "/dashboard/jeweller/saved-searches", label: "Saved Searches", exact: false },
    { to: "/dashboard/jeweller/wishlist", label: "Wishlist", exact: false },
  ];
  const sharedNav = [
    { to: "/dashboard/referrals", label: "Referrals", exact: false },
    { to: "/dashboard/account", label: "Account", exact: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ImpersonationBanner />
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-serif text-2xl italic font-medium tracking-tight">Chaos</Link>
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
            {showDealer && (
              <>
                {dual && <SectionLabel>Dealer dashboard</SectionLabel>}
                {dealerNav.map((n) => <NavLink key={n.to} {...n} pathname={pathname} />)}
              </>
            )}
            {showJeweller && (
              <>
                {dual && <SectionLabel className="mt-4">Jeweller dashboard</SectionLabel>}
                {jewellerNav.map((n) => <NavLink key={n.to} {...n} pathname={pathname} />)}
              </>
            )}
            <SectionLabel className="mt-4">Settings</SectionLabel>
            {sharedNav.map((n) => <NavLink key={n.to} {...n} pathname={pathname} />)}
          </nav>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 ${className}`}>
      {children}
    </div>
  );
}

function NavLink({ to, label, exact, pathname }: { to: string; label: string; exact: boolean; pathname: string }) {
  const active = exact ? pathname === to : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
        active
          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:bg-[var(--color-gold)]/5 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}