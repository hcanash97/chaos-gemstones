import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

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
        <Link to="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-semibold tracking-tight text-primary">CHAOS</span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            Gemstone Trade
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link to="/marketplace" className="text-foreground/80 hover:text-foreground">Marketplace</Link>
          <Link to="/vendors" className="text-foreground/80 hover:text-foreground">Vendors</Link>
          <Link to="/about" className="text-foreground/80 hover:text-foreground">About</Link>
        </nav>
        <div className="flex items-center gap-2">
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
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="font-serif text-2xl font-semibold">CHAOS</div>
          <p className="mt-2 text-sm opacity-70">
            The B2B marketplace for diamonds and coloured gemstones.
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] opacity-60">Platform</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/marketplace" className="opacity-80 hover:opacity-100">Marketplace</Link></li>
            <li><Link to="/vendors" className="opacity-80 hover:opacity-100">Vendors</Link></li>
            <li><Link to="/about" className="opacity-80 hover:opacity-100">About</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] opacity-60">For Dealers</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/sign-up/dealer" className="opacity-80 hover:opacity-100">List your inventory</Link></li>
            <li><Link to="/login" className="opacity-80 hover:opacity-100">Dealer login</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] opacity-60">For Jewellers</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/sign-up/jeweller" className="opacity-80 hover:opacity-100">Source stones</Link></li>
            <li><Link to="/login" className="opacity-80 hover:opacity-100">Jeweller login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs opacity-60">
        © {new Date().getFullYear()} CHAOS. All rights reserved.
      </div>
    </footer>
  );
}