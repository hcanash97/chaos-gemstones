import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { countryFlag } from "@/lib/countries";
import { fadeUp } from "@/components/anim/Motion";
import { ShieldCheck, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StoneCardData = {
  id: string;
  stone_type: string;
  shape: string | null;
  carat_weight: number | null;
  origin: string | null;
  country_of_origin: string | null;
  cert_lab: string | null;
  wholesale_price_usd: number | null;
  colour_grade: string | null;
  clarity_grade: string | null;
  image?: string | null;
  dealer_country?: string | null;
  dealer_verified?: boolean | null;
};

function StoneCardImpl({ stone }: { stone: StoneCardData }) {
  const { user, profile } = useAuth();
  const isJeweller = profile?.account_type === "jeweller";
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isJeweller || !user) {
      setSaved(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("wishlists")
        .select("id")
        .eq("jeweller_id", user.id)
        .eq("stone_id", stone.id)
        .maybeSingle();
      if (!cancelled) setSaved(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isJeweller, user?.id, stone.id]);

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
    } catch (err: any) {
      setSaved(!next); // rollback
      toast.error(err?.message || "Could not update wishlist");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div variants={fadeUp} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 280, damping: 22 }}>
    <Link
      to="/stone/$id"
      params={{ id: stone.id }}
      className="group block overflow-hidden rounded-md border border-border bg-card transition-shadow duration-300 hover:border-[var(--color-gold)] hover:shadow-[0_18px_40px_-22px_rgba(15,27,61,0.45)]"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {stone.image ? (
          <img
            src={stone.image}
            alt={`${stone.carat_weight ?? ""}ct ${stone.stone_type}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
        <span className="shimmer-overlay" aria-hidden />
        {isJeweller && (
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/85 backdrop-blur transition hover:bg-background"
          >
            <Heart
              className={`h-4 w-4 transition ${saved ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-foreground"}`}
            />
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
            {stone.origin === "lab-grown" ? "Lab Grown" : "Natural"} · {stone.cert_lab || "—"}
            {stone.dealer_verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-gold)]" aria-label="Verified dealer" />
            )}
          </span>
          {stone.dealer_country ? (
            <span className="text-muted-foreground">
              {countryFlag(stone.dealer_country)} {stone.dealer_country}
            </span>
          ) : stone.country_of_origin ? (
            <span className="text-muted-foreground">
              {countryFlag(stone.country_of_origin)} {stone.country_of_origin}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 font-serif text-lg leading-tight">
          {stone.carat_weight ? `${Number(stone.carat_weight).toFixed(2)}ct ` : ""}
          <span className="capitalize">{stone.shape || ""} {stone.stone_type}</span>
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            {stone.colour_grade && <Badge variant="outline" className="font-mono">{stone.colour_grade}</Badge>}
            {stone.clarity_grade && <Badge variant="outline" className="font-mono">{stone.clarity_grade}</Badge>}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wholesale</div>
            <div className="font-mono text-sm font-semibold">
              {stone.wholesale_price_usd ? `$${Number(stone.wholesale_price_usd).toLocaleString()}` : "POA"}
            </div>
          </div>
        </div>
      </div>
    </Link>
    </motion.div>
  );
}

export const StoneCard = React.memo(StoneCardImpl);