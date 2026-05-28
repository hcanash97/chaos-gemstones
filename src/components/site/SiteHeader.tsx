import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Logo, GemMark } from "@/components/site/Logo";
import { CurrencySelector } from "@/components/site/CurrencySelector";

export function SiteHeader() {
  const { user, profile, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "glass-light border-b border-[var(--gold-border)] shadow-[0_8px_30px_-12px_rgba(15,27,61,0.15)]"
          : "border-b border-transparent bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link to="/marketplace" className="text-foreground/80 hover:text-foreground">Marketplace</Link>
          <Link to="/vendors" className="text-foreground/80 hover:text-foreground">Vendors</Link>
          <Link to="/learn" className="text-foreground/80 hover:text-foreground">Learn</Link>
          <Link to="/about" className="text-foreground/80 hover:text-foreground">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          <CurrencySelector />
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {profile?.company_name || profile?.full_name || user.email}
              </span>
              {profile?.account_type && (
                <Link to="/dashboard">
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
              <Link to="/sign-up/jeweller">
                <Button size="sm" className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <GemMark size={26} />
            <span className="font-serif text-2xl italic font-medium tracking-tight">Chaos</span>
          </div>
          <p className="mt-3 max-w-xs text-sm opacity-75">
            The global marketplace for independent gemstone dealers.
          </p>
          <p className="mt-5 text-xs opacity-60">© 2026 Chaos. All rights reserved.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:gap-12">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] opacity-60">Platform</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/marketplace" className="opacity-80 hover:opacity-100">Marketplace</Link></li>
              <li><Link to="/vendors" className="opacity-80 hover:opacity-100">Vendors</Link></li>
              <li><Link to="/about" className="opacity-80 hover:opacity-100">About</Link></li>
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
        </div>
      </div>
      <div className="border-t border-[var(--gold-border)] py-4 text-center text-[11px] opacity-70 px-6">
        All prices shown are wholesale USD. Chaos is a B2B platform for verified trade professionals only.
      </div>
    </footer>
  );
}