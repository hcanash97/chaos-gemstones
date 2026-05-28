import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrency } from "@/contexts/CurrencyContext";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency";

type Props = {
  className?: string;
  variant?: "compact" | "full";
};

export function CurrencySelector({ className, variant = "compact" }: Props) {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_CURRENCIES.find((c) => c.code === displayCurrency);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent"
          }
          aria-label="Change display currency"
        >
          <span aria-hidden>{current?.flag ?? "🌐"}</span>
          <span className="font-medium">{displayCurrency}</span>
          {variant === "full" && current?.name && (
            <span className="hidden text-muted-foreground sm:inline">— {current.name}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div className="max-h-[60vh] overflow-y-auto">
          {SUPPORTED_CURRENCIES.map((c) => {
            const active = c.code === displayCurrency;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setDisplayCurrency(c.code as CurrencyCode);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent ${
                  active ? "bg-accent/60" : ""
                }`}
              >
                <span aria-hidden>{c.flag}</span>
                <span className="font-medium">{c.code}</span>
                <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                {active && <Check className="h-4 w-4 text-[var(--color-gold)]" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}