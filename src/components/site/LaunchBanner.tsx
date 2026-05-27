import { Sparkles } from "lucide-react";

export function LaunchBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-4 py-3 text-sm text-foreground ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-gold)]" />
        <p className="leading-relaxed">
          <span className="font-medium">Chaos is free to join and free to list during our launch period.</span>{" "}
          No subscription fees, no listing fees. A small transaction fee (2%) applies only when a sale completes —
          meaning we only earn when you do.
        </p>
      </div>
    </div>
  );
}