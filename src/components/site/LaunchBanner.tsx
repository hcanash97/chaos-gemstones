import { Sparkles } from "lucide-react";

export function LaunchBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-4 py-3 text-sm text-foreground ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-gold)]" />
        <p className="leading-relaxed">
          <span className="font-medium">Free during launch beta — no fees, no subscriptions, no catch.</span>{" "}
          We&rsquo;ll give at least 30 days notice before any fees ever apply.
        </p>
      </div>
    </div>
  );
}