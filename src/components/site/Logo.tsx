import { Link } from "@tanstack/react-router";

/**
 * CHAOS wordmark + minimal gem-facet mark.
 * Octagon viewed from above with internal facet lines in lighter champagne gold.
 */
export function GemMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Outer octagon — champagne gold */}
      <polygon
        points="12,3 28,3 37,12 37,28 28,37 12,37 3,28 3,12"
        fill="#D4AF6A"
        stroke="#B68F4E"
        strokeWidth="0.6"
      />
      {/* Inner table */}
      <polygon
        points="16,9 24,9 31,16 31,24 24,31 16,31 9,24 9,16"
        fill="#E8C97A"
      />
      {/* Facet lines — lighter gold */}
      <g stroke="#F2DDA5" strokeWidth="0.8" opacity="0.85" strokeLinecap="round">
        <line x1="12" y1="3" x2="28" y2="37" />
        <line x1="28" y1="3" x2="12" y2="37" />
        <line x1="3" y1="12" x2="37" y2="28" />
        <line x1="37" y1="12" x2="3" y2="28" />
      </g>
    </svg>
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