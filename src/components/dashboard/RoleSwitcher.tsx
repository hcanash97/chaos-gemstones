import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { isDualRole } from "@/lib/auth.utils";

export function RoleSwitcher({ current }: { current: "dealer" | "jeweller" }) {
  const { profile } = useAuth();
  if (!profile || !isDualRole(profile)) return null;
  return (
    <div className="mb-6 inline-flex items-center gap-1 rounded-md border border-border bg-card p-1 text-xs">
      <span className="px-2 text-muted-foreground">Viewing as:</span>
      <Link
        to="/dashboard"
        className={`rounded px-3 py-1 transition ${
          current === "dealer" ? "bg-[var(--color-gold)] text-[var(--color-gold-foreground)] font-medium" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Dealer
      </Link>
      <Link
        to="/dashboard/jeweller"
        className={`rounded px-3 py-1 transition ${
          current === "jeweller" ? "bg-[var(--color-gold)] text-[var(--color-gold-foreground)] font-medium" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Jeweller
      </Link>
    </div>
  );
}