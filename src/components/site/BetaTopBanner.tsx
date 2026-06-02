import { Sparkles } from "lucide-react";

export function BetaTopBanner() {
  return (
    <div className="w-full bg-[var(--color-gold)] text-[var(--color-gold-foreground)]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-6 py-2 text-center text-xs font-medium md:text-sm">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span>
          Currently free to join &mdash; no listing fees, no subscription, no
          commission during our launch period.
        </span>
      </div>
    </div>
  );
}
