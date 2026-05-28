import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";

type Mini = {
  id: string;
  stone_type: string;
  shape: string | null;
  carat_weight: number | null;
  image: string | null;
};

export function CompareBar() {
  const { ids, remove, clear } = useCompare();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [stones, setStones] = useState<Mini[]>([]);

  useEffect(() => {
    if (ids.length === 0) {
      setStones([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("stones")
        .select("id, stone_type, shape, carat_weight, stone_images(storage_url, external_image_url, is_primary, sort_order)")
        .in("id", ids);
      if (cancelled) return;
      const mapped = (data ?? []).map((s: any) => {
        const imgs = [...(s.stone_images ?? [])].sort(
          (a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99),
        );
        const primary = imgs.find((i: any) => i.is_primary) ?? imgs[0];
        return {
          id: s.id,
          stone_type: s.stone_type,
          shape: s.shape,
          carat_weight: s.carat_weight,
          image: primary?.storage_url || primary?.external_image_url || null,
        };
      });
      // Preserve insertion order from ids
      setStones(ids.map((id) => mapped.find((m: Mini) => m.id === id)).filter(Boolean) as Mini[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids.join(",")]);

  const show = ids.length >= 2 && !pathname.startsWith("/compare");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.25)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {stones.map((s) => (
                <div key={s.id} className="relative">
                  <div className="h-14 w-14 overflow-hidden rounded border border-border bg-muted">
                    {s.image ? (
                      <img src={s.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    aria-label="Remove from comparison"
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Comparing {ids.length} stone{ids.length === 1 ? "" : "s"}
            </div>
            <div className="ml-auto flex gap-2">
              <Link to="/compare">
                <Button size="sm" className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                  Compare
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={clear}>
                Clear all ×
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}