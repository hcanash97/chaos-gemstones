import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Logo, GemMark } from "@/components/site/Logo";
import { CurrencySelector } from "@/components/site/CurrencySelector";
import {
  Menu,
  X,
  Home as HomeIcon,
  Gem as GemIcon,
  Users as UsersIcon,
  Search as SearchIcon,
  LayoutDashboard as LayoutDashboardIcon,
  Instagram,
} from "lucide-react";
import { defaultDashboardPath, isDealer, isJeweller } from "@/lib/auth.utils";

export function SiteHeader() {
  const { user, profile, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const drawerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Mobile drawer: trap focus + close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
      if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // Move initial focus inside drawer
    setTimeout(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])');
      first?.focus();
    }, 50);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const navLinks: { to: string; label: string }[] = [
    { to: "/marketplace", label: "Marketplace" },
    { to: "/requests", label: "Requests" },
    { to: "/vendors", label: "Vendors" },
    { to: "/jewellers", label: "Jewellers" },
    { to: "/learn", label: "Learn" },
    { to: "/faq", label: "FAQ" },
    { to: "/about", label: "About" },
  ];
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  return (
    <>
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "glass-light border-b border-[var(--gold-border)] shadow-[0_8px_30px_-12px_rgba(15,27,61,0.15)]"
          : "border-b border-transparent bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <span className="logo-glow"><Logo /></span>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm md:flex">
          {navLinks.map((l) => {
            const active = isActive(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-current={active ? "page" : undefined}
                className={`text-foreground/80 hover:text-foreground ${active ? "text-foreground font-medium" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <CurrencySelector />
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {profile?.company_name || profile?.full_name || user.email}
              </span>
              {(isDealer(profile) || isJeweller(profile)) && (
                <Link to={defaultDashboardPath(profile)}>
                  <Button variant="outline" size="sm">Dashboard</Button>
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="border-[var(--color-gold)] text-[var(--color-gold)]">
                    Admin
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/sign-up">
                <Button size="sm" className="pulse-once bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
        {/* Mobile: currency + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <CurrencySelector />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
    {/* Mobile drawer */}
    {menuOpen && (
      <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <aside id="mobile-nav-drawer" ref={drawerRef} className="absolute right-0 top-0 h-full w-80 max-w-[85%] bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="font-serif text-xl italic">CHAOS</span>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="inline-flex h-9 w-9 items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1 p-3 text-sm">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} aria-current={isActive(l.to) ? "page" : undefined} className="rounded-md px-3 py-3 text-foreground/90 hover:bg-muted">
                {l.label}
              </Link>
            ))}
            <div className="my-3 border-t border-border" />
            {user ? (
              <>
                {(isDealer(profile) || isJeweller(profile)) && (
                  <Link to={defaultDashboardPath(profile)} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 hover:bg-muted">Dashboard</Link>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-[var(--color-gold)] hover:bg-muted">Admin</Link>
                )}
                <button onClick={() => { setMenuOpen(false); signOut(); }} className="rounded-md px-3 py-3 text-left hover:bg-muted">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 hover:bg-muted">Log in</Link>
                <Link to="/sign-up" onClick={() => setMenuOpen(false)} className="mt-1 rounded-md bg-[var(--color-gold)] px-3 py-3 text-center font-medium text-[var(--color-gold-foreground)]">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </aside>
      </div>
    )}
    <MobileBottomNav />
    </>
  );
}

function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile } = useAuth();
  const dashHref = user ? defaultDashboardPath(profile) : "/login";
  const items = [
    { to: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
    { to: "/marketplace", label: "Stones", icon: GemIcon, match: (p: string) => p.startsWith("/marketplace") },
    { to: "/vendors", label: "Vendors", icon: UsersIcon, match: (p: string) => p.startsWith("/vendors") },
    { to: "/requests", label: "Requests", icon: SearchIcon, match: (p: string) => p.startsWith("/requests") },
    { to: dashHref, label: "Dashboard", icon: LayoutDashboardIcon, match: (p: string) => p.startsWith("/dashboard") || p === "/login" },
  ] as const;
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 py-1.5 backdrop-blur md:hidden"
      aria-label="Primary mobile"
    >
      {items.map((it) => {
        const Icon = it.icon;
        const active = it.match(pathname);
        return (
          <Link
            key={it.label}
            to={it.to as any}
            className={`flex min-w-[56px] flex-col items-center gap-0.5 px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
              active ? "text-[var(--color-gold)]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <GemMark size={26} className="invert brightness-0 contrast-100" style={{ filter: "brightness(0) invert(1)" }} />
            <span className="font-serif text-2xl italic font-medium tracking-tight">CHAOS</span>
          </div>
          <p className="mt-3 max-w-xs text-sm opacity-75">
            The global marketplace for independent gemstone dealers.
          </p>
          <p className="mt-5 text-xs opacity-60">© 2026 CHAOS. All rights reserved.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:gap-12">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] opacity-60">Platform</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/marketplace" className="opacity-80 hover:opacity-100">Marketplace</Link></li>
              <li><Link to="/vendors" className="opacity-80 hover:opacity-100">Vendors</Link></li>
              <li><Link to="/about" className="opacity-80 hover:opacity-100">About</Link></li>
              <li><Link to="/faq" className="opacity-80 hover:opacity-100">FAQ</Link></li>
              <li><Link to="/learn" className="opacity-80 hover:opacity-100">Learning hub</Link></li>
              <li><Link to="/docs/api" className="opacity-80 hover:opacity-100">API &amp; Embeds</Link></li>
              <li><Link to="/how-it-works/payments" className="opacity-80 hover:opacity-100">Payments</Link></li>
              <li><Link to="/how-it-works/shipping" className="opacity-80 hover:opacity-100">Shipping</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] opacity-60">Account</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/sign-up/dealer" className="opacity-80 hover:opacity-100">For Dealers</Link></li>
              <li><Link to="/sign-up/jeweller" className="opacity-80 hover:opacity-100">For Jewellers</Link></li>
              <li><Link to="/login" className="opacity-80 hover:opacity-100">Sign in</Link></li>
            </ul>
          </div>
        </div>
        <div className="md:text-right">
          <div className="text-xs uppercase tracking-[0.2em] opacity-60">Legal</div>
          <ul className="mt-3 space-y-2 text-sm md:flex md:flex-col md:items-end">
            <li><Link to="/legal/terms-dealers" className="opacity-80 hover:opacity-100">Dealer terms</Link></li>
            <li><Link to="/legal/terms-jewellers" className="opacity-80 hover:opacity-100">Jeweller terms</Link></li>
            <li><Link to="/legal/privacy" className="opacity-80 hover:opacity-100">Privacy policy</Link></li>
          </ul>
          <div className="mt-6 text-xs uppercase tracking-[0.2em] opacity-60">Sourcing hubs</div>
          <p className="mt-3 text-sm opacity-80">
            Jaipur · Surat · Bangkok · Colombo · Antwerp · New York
          </p>
          <a
            href="https://www.instagram.com/chaosgemstonemarket"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
          >
            <Instagram className="h-4 w-4" />
            @chaosgemstonemarket
          </a>
        </div>
      </div>
      <div className="border-t border-[var(--gold-border)] py-4 text-center text-[11px] opacity-70 px-6">
        All prices shown are wholesale USD. CHAOS is a B2B platform for verified trade professionals only.
      </div>
    </footer>
  );
}
