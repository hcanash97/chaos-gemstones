import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function InfoTooltip({
  children,
  className,
  side = "top",
}: {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            className,
          )}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

export function HoverHint({
  label,
  hint,
  className,
}: {
  label: React.ReactNode;
  hint: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className={cn("cursor-help underline decoration-dotted underline-offset-2", className)}>{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

const STATUS_HINTS: Record<string, string> = {
  available: "This stone is in stock and ready to order",
  reserved: "This stone has been reserved pending a transaction",
  sold: "This stone has been sold and is no longer available",
  pending: "This account is awaiting review by the Chaos team",
  approved: "This account has been approved by the Chaos team",
  verified: "This dealer has been manually reviewed and verified by Chaos",
};

export function StatusBadge({
  status,
  className,
  children,
  hint,
}: {
  status: string;
  className?: string;
  children?: React.ReactNode;
  hint?: string;
}) {
  const key = status.toLowerCase();
  const tip = hint ?? STATUS_HINTS[key] ?? status;
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex w-fit cursor-help items-center rounded-full px-2 py-0.5 text-xs capitalize",
            className,
          )}
        >
          {children ?? status}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}