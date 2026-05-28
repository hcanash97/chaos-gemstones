import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { EnquireDialog } from "@/components/site/EnquireDialog";
import { toast } from "sonner";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/dashboard/jeweller/wishlist")({
  component: WishlistPage,
});

type Row = {
  id: string;
  stone_id: string;
  stone: any;
};

function WishlistPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("wishlists")
      .select(
        "id, stone_id, stone:stone_id(id, stone_type, shape, carat_weight, wholesale_price_usd, cert_lab, dealer_id, stone_images(storage_url, external_image_url, is_primary, sort_order))",
      )
      .eq("jeweller_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []).filter((r: any) => r.stone));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function remove(id: string) {
    const prev = rows;
    setRows(rows.filter((r) => r.id !== id));
    const { error } = await (supabase as any).from("wishlists").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(error.message);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">My wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">Stones you've saved from the marketplace.</p>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-md border border-dashed border-border py-16 text-center">
          <Heart className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No saved stones yet.</p>
          <Link to="/marketplace" className="mt-3 inline-block text-sm text-[var(--color-gold)] hover:underline">
            Browse the marketplace →
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const s = r.stone;
            const imgs = [...(s.stone_images ?? [])].sort(
              (a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99),
            );
            const img = imgs.find((i: any) => i.is_primary) ?? imgs[0];
            const src = img?.storage_url || img?.external_image_url;
            return (
              <div key={r.id} className="overflow-hidden rounded-md border border-border bg-card">
                <Link to="/stone/$id" params={{ id: s.id }} className="block aspect-square bg-muted">
                  {src ? (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </Link>
                <div className="p-4">
                  <h3 className="font-serif text-lg capitalize leading-tight">
                    {s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : ""}
                    {s.shape} {s.stone_type}
                  </h3>
                  <div className="mt-1 font-mono text-sm">
                    {s.wholesale_price_usd ? `$${Number(s.wholesale_price_usd).toLocaleString()}` : "POA"}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <EnquireDialog
                      dealerId={s.dealer_id}
                      stoneId={s.id}
                      context={`${s.carat_weight ? Number(s.carat_weight).toFixed(2) + "ct " : ""}${s.shape || ""} ${s.stone_type}`}
                      trigger={
                        <Button size="sm" className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                          Enquire
                        </Button>
                      }
                    />
                    <Button size="sm" variant="outline" onClick={() => remove(r.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}