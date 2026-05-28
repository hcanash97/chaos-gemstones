import { Link } from "@tanstack/react-router";
import cMark from "@/assets/chaos-c-mark.png";

/**
 * CHAOS wordmark + minimal gem-facet mark.
 * Octagon viewed from above with internal facet lines in lighter champagne gold.
 */
export function GemMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <img
      src={cMark}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", objectFit: "contain" }}
    />
  );
}

export function Logo({
  size = "md",
  withTagline = false,
  to = "/",
  tone = "default",
}: {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
  to?: string;
  tone?: "default" | "inverted";
}) {
  const text =
    size === "lg"
      ? "text-3xl"
      : size === "sm"
      ? "text-xl"
      : "text-2xl";
  const markPx = size === "lg" ? 32 : size === "sm" ? 20 : 26;
  const color = tone === "inverted" ? "text-primary-foreground" : "text-primary";

  return (
    <Link to={to} className="inline-flex items-center gap-2.5">
      <GemMark size={markPx} />
      <span className={`font-serif italic font-medium tracking-tight ${text} ${color}`}>
        Chaos
      </span>
      {withTagline && (
        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
          Gemstone Trade
        </span>
      )}
    </Link>
  );
}