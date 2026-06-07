import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { countryFlag } from "@/lib/countries";
import { fadeUp } from "@/components/anim/Motion";
import { Clock, ShieldCheck, Heart, Scale, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller as checkJeweller, isDealer as checkDealer, isAdmin as checkAdmin } from "@/lib/auth.utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompare } from "@/contexts/CompareContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQueryClient } from "@tanstack/react-query";

export type StoneCardData = {
  id: string;
  stone_type: string;
  shape: string | null;
  carat_weight: number | null;
  origin: string | null;
  country_of_origin: string | null;
  cert_lab: string | null;
  wholesale_price_usd: number | null;
  price_currency?: string | null;
  colour_grade: string | null;
  clarity_grade: string | null;
  image?: string | null;
  dealer_country?: string | null;
  dealer_verified?: boolean | null;
  dealer_id?: string | null;
  has_video?: boolean | null;
  has_360?: boolean | null;
  matching_pair?: boolean | null;
  source_type?: "standard" | "direct_vault" | string | null;
  private_until?: string | null;
  isWishlisted?: boolean;
};

export function stoneAltText(stone: StoneCardData): string {
  const parts = [
    stone.carat_weight ? `${Number(stone.carat_weight).toFixed(2)} carat` : null,
    stone.shape || null,
    stone.origin === "lab-grown" ? "lab-grown" : stone.origin === "natural" ? "natural" : null,
    stone.stone_type || "gemstone",
    stone.colour_grade ? `${stone.colour_grade} colour` : null,
    stone.clarity_grade ? `${stone.clarity_grade} clarity` : null,
    stone.cert_lab ? `certified by ${stone.cert_lab}` : null,
  ].filter(Boolean);
  return parts.join(", ") || "loose gemstone";
}

function StoneCardImpl({
  stone,
  followedDealerIds,
  retailMode = false,
}: {
  stone: StoneCardData;
  followedDealerIds?: Set<string>;
  retailMode?: boolean;
}) {
  const { user, profile } = useAuth();
  const isJeweller = checkJeweller(profile);
  const isApprovedJeweller = isJeweller && profile?.is_approved;
  const isDealer = checkDealer(profile);
  const isAdmin = checkAdmin(profile);
  const showWholesale = (isDealer || isAdmin || isApprovedJeweller) && !retailMode;
  const compare = useCompare();
  const inCompare = compare.has(stone.id);
  const compareDisabled = !inCompare && compare.ids.length >= compare.max;
  const { format } = useCurrency();
  const inFeed =
    isJeweller && stone.dealer_id && followedDealerIds?.has(stone.dealer_id);
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<boolean>(!!stone.isWishlisted);
  const [busy, setBusy] = useState(false);
  const isDirectVault = stone.source_type === "direct_vault";
  const isEarlyAccess = !!stone.private_until && new Date(stone.private_until).getTime() > Date.now();

  // Sync local state with prop when parent re-fetches the wishlist set.
  React.useEffect(() => {
    setSaved(!!stone.isWishlisted);
  }, [stone.isWishlisted]);

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !isJeweller || busy) return;
    const next = !saved;
    setSaved(next); // optimistic
    setBusy(true);
    try {
      if (next) {
        const { error } = await (supabase as any)
          .from("wishlists")
          .insert({ jeweller_id: user.id, stone_id: stone.id });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("wishlists")
          .delete()
          .eq("jeweller_id", user.id)
          .eq("stone_id", stone.id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["wishlist-ids", user.id] });
    } catch (err: any) {
      setSaved(!next); // rollback
      toast.error(err?.message || "Could not update wishlist");
    } finally {
      setBusy(false);
    }
  }

  function onCompare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (compareDisabled) {
      toast.error(`You can compare up to ${compare.max} stones.`);
      return;
    }
    compare.toggle(stone.id);
  }

  return (
    <motion.div
      role="article"
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative overflow-hidden rounded-md border border-border bg-card transition-shadow duration-300 hover:border-[var(--color-gold)] hover:shadow-[0_18px_40px_-22px_rgba(15,27,61,0.45)]"
    >
      <Link
        to="/stone/$id"
        params={{ id: stone.id }}
        className="block"
      >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {stone.image ? (
          <img
            src={stone.image}
            alt={stoneAltText(stone)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            {(stone.has_360 || stone.has_video) ? (
              <>
                <RotateCcw className="h-7 w-7 opacity-40" />
                <span className="text-[11px] font-medium uppercase tracking-wider opacity-60">
                  {stone.has_360 ? "360° view inside" : "Video inside"}
                </span>
              </>
            ) : (
              <span className="text-xs opacity-50">No image</span>
            )}
          </div>
        )}
        <span className="shimmer-overlay" aria-hidden />
        {inFeed && (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-gold-foreground)] shadow">
            In feed
          </span>
        )}
        <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
          {isDirectVault && (
            <span className="rounded-full bg-amber-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100 shadow">
              Direct Vault
            </span>
          )}
          {isEarlyAccess && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100 shadow">
              <Clock className="h-3 w-3" />
              Early Access
            </span>
          )}
          {(stone.has_360 || stone.has_video) && (
            <span className="rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
              {stone.has_360 ? "360°" : "Video"}
            </span>
          )}
          {stone.matching_pair && (
            <span className="rounded-full bg-[var(--color-gold)]/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-gold-foreground)] backdrop-blur">
              Pair
            </span>
          )}
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs">
          <span className="flex min-w-0 items-center gap-1.5 truncate uppercase tracking-wider text-muted-foreground">
            {stone.origin === "lab-grown" ? "Lab Grown" : "Natural"} · {stone.cert_lab || "—"}
            {stone.dealer_verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-gold)]" aria-label="Verified dealer" />
            )}
          </span>
          {!retailMode && stone.dealer_country ? (
            <span className="hidden shrink-0 text-muted-foreground sm:inline">
              {countryFlag(stone.dealer_country)} {stone.dealer_country}
            </span>
          ) : !retailMode && stone.country_of_origin ? (
            <span className="hidden shrink-0 text-muted-foreground sm:inline">
              {countryFlag(stone.country_of_origin)} {stone.country_of_origin}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 line-clamp-2 min-h-[2.35rem] font-serif text-base leading-tight sm:min-h-0 sm:text-lg">
          {stone.carat_weight ? `${Number(stone.carat_weight).toFixed(2)}ct ` : ""}
          <span className="capitalize">{stone.shape || ""} {stone.stone_type}</span>
        </h3>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-h-6 flex-wrap gap-1.5">
            {stone.colour_grade && <Badge variant="outline" className="px-1.5 font-mono text-[10px] sm:px-2.5 sm:text-xs">{stone.colour_grade}</Badge>}
            {stone.clarity_grade && <Badge variant="outline" className="px-1.5 font-mono text-[10px] sm:px-2.5 sm:text-xs">{stone.clarity_grade}</Badge>}
          </div>
          <div className="text-left sm:text-right">
            {showWholesale ? (
              <>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wholesale</div>
                <div className="font-mono text-sm font-semibold">
                  {format(stone.wholesale_price_usd, stone.price_currency ?? "USD")}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {retailMode ? "Client view" : "Price"}
                </div>
                <div className="font-mono text-xs font-medium text-muted-foreground">
                  {retailMode ? "Quote in detail" : user ? "Pending approval" : "Sign in to view"}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </Link>
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onCompare}
              aria-label={inCompare ? "Remove from comparison" : "Add to comparison"}
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-background/85 backdrop-blur transition hover:bg-background sm:h-9 sm:w-9 ${compareDisabled ? "opacity-50" : ""}`}
            >
              <Scale
                className={`h-4 w-4 transition ${inCompare ? "fill-[var(--color-gold)]/30 text-[var(--color-gold)]" : "text-foreground"}`}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {compareDisabled
              ? `Max ${compare.max} stones at once`
              : inCompare
                ? "Remove from comparison"
                : "Compare side-by-side"}
          </TooltipContent>
        </Tooltip>
        {isJeweller && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleWishlist}
                aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-background/85 backdrop-blur transition hover:bg-background sm:h-9 sm:w-9"
              >
                <Heart
                  className={`h-4 w-4 transition ${saved ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-foreground"}`}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {saved ? "Remove from wishlist" : "Save to wishlist"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
}

export const StoneCard = React.memo(StoneCardImpl);
