import { Link } from "@tanstack/react-router";

/**
 * CHAOS wordmark + minimal gem-facet mark.
 * Octagon viewed from above with internal facet lines in lighter champagne gold.
 */
export function GemMark({ size = 24, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src="/icons/icon-512.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", objectFit: "contain", ...style }}
    />
  );
}

export function Logo({
  size = "md",
  withTagline = false,
  to = "/",
  tone = "default",
  imageUrl = "",
  brandName = "CHAOS",
}: {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
  to?: string;
  tone?: "default" | "inverted";
  imageUrl?: string;
  brandName?: string;
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
    <Link to={to} className="group inline-flex items-center gap-2.5">
      <span className="inline-block transition-transform duration-[600ms] ease-out group-hover:rotate-[360deg]">
        {imageUrl ? (
          <img
            src={imageUrl}
            width={markPx}
            height={markPx}
            alt=""
            aria-hidden="true"
            className="rounded-sm object-cover"
            style={{ width: markPx, height: markPx }}
          />
        ) : (
          <GemMark size={markPx} />
        )}
      </span>
      <span className={`font-serif italic font-medium tracking-tight ${text} ${color}`}>
        {brandName}
      </span>
      {withTagline && (
        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
          Gemstone Trade
        </span>
      )}
    </Link>
  );
}
