import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { EnquireDialog } from "@/components/site/EnquireDialog";
import { useCompare } from "@/contexts/CompareContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/compare")({
  component: ComparePage,
  head: () => ({
    meta: [
      { title: "Compare stones — Chaos" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const ROWS: Array<[string, (s: any) => any]> = [
  ["Stone type", (s) => s.stone_type],
  ["Shape", (s) => s.shape],
  ["Carat", (s) => (s.carat_weight ? `${Number(s.carat_weight).toFixed(2)} ct` : null)],
  ["Origin", (s) => s.origin],
  ["Country", (s) => s.country_of_origin],
  ["Colour grade", (s) => s.colour_grade],
  ["Clarity", (s) => s.clarity_grade],
  ["Cut", (s) => s.cut_grade],
  ["Polish", (s) => s.polish],
  ["Symmetry", (s) => s.symmetry],
  ["Fluorescence", (s) => s.fluorescence],
  ["Treatment", (s) => s.treatment],
  ["Cert lab", (s) => s.cert_lab],
  ["Cert number", (s) => s.cert_number],
  ["Depth %", (s) => s.depth_pct],
  ["Table %", (s) => s.table_pct],
  ["L/W ratio", (s) => s.lw_ratio],
  [
    "Measurements",
    (s) =>
      s.measurements_length && s.measurements_width
        ? `${s.measurements_length} × ${s.measurements_width}${s.measurements_height ? " × " + s.measurements_height : ""} mm`
        : null,
  ],
];

function ComparePage() {
  const { ids, remove, clear } = useCompare();
  const { format } = useCurrency();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: stones, isLoading } = useQuery({
    queryKey: ["compare-stones", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("stones")
        .select(
          "*, stone_images(storage_url, external_image_url, is_primary, sort_order), profiles:dealer_id(company_name)",
        )
        .in("id", ids);
      const ordered = ids.map((id) => (data ?? []).find((s: any) => s.id === id)).filter(Boolean);
      return ordered as any[];
    },
    enabled: ids.length > 0,
  });

  const isJeweller = checkJ(profile) && profile?.is_approved;
  const showWholesale =
    checkD(profile) || checkA(profile) || isJeweller;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/marketplace" className="text-xs text-muted-foreground hover:text-foreground">
              ← Back to marketplace
            </Link>
            <h1 className="mt-2 font-serif text-4xl">Compare stones</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Side-by-side gemological comparison. Differences are highlighted in gold.
            </p>
          </div>
          {ids.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clear();
                navigate({ to: "/marketplace" });
              }}
            >
              Clear all
            </Button>
          )}
        </div>

        {ids.length === 0 ? (
          <div className="mt-10 rounded-md border border-dashed border-border py-20 text-center">
            <p className="text-sm text-muted-foreground">
              No stones to compare yet. Add up to 3 stones from the marketplace.
            </p>
            <Link to="/marketplace" className="mt-4 inline-block text-sm text-[var(--color-gold)] hover:underline">
              Browse the marketplace →
            </Link>
          </div>
        ) : isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40 px-3 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground" />
                  {(stones ?? []).map((s: any) => {
                    const imgs = [...(s.stone_images ?? [])].sort(
                      (a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99),
                    );
                    const img = imgs.find((i: any) => i.is_primary) ?? imgs[0];
                    const src = img?.storage_url || img?.external_image_url;
                    return (
                      <th key={s.id} className="px-3 py-3 align-top">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => remove(s.id)}
                            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/85 text-foreground"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                          <div className="aspect-square w-full overflow-hidden rounded-md border border-border bg-muted">
                            {src ? (
                              <img src={src} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>
                          <Link
                            to="/stone/$id"
                            params={{ id: s.id }}
                            className="mt-2 block font-serif text-base capitalize hover:underline"
                          >
                            {s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : ""}
                            {s.shape} {s.stone_type}
                          </Link>
                          <div className="text-xs text-muted-foreground">{s.profiles?.company_name}</div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, get]) => {
                  const values = (stones ?? []).map((s: any) => get(s));
                  const set = new Set(values.map((v) => (v ?? "—") + ""));
                  const isDifferent = set.size > 1;
                  return (
                    <tr key={label} className="border-t border-border">
                      <td className="w-40 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                        {label}
                      </td>
                      {values.map((v, i) => (
                        <td
                          key={i}
                          className={`px-3 py-2 font-mono capitalize ${isDifferent ? "bg-[var(--color-gold)]/10" : ""}`}
                        >
                          {v ?? "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t border-border">
                  <td className="w-40 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {showWholesale ? "Wholesale" : "Price"}
                  </td>
                  {(stones ?? []).map((s: any) => (
                    <td key={s.id} className="px-3 py-2 font-mono font-semibold">
                       {showWholesale ? (
                        format(s.wholesale_price_usd, s.price_currency ?? "USD")
                      ) : user ? (
                        format(s.wholesale_price_usd, s.price_currency ?? "USD")
                      ) : (
                        <Link to="/login" className="text-xs text-[var(--color-gold)] hover:underline">
                          Sign in to view
                        </Link>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3 py-3" />
                  {(stones ?? []).map((s: any) => (
                    <td key={s.id} className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-2">
                        <EnquireDialog
                          dealerId={s.dealer_id}
                          stoneId={s.id}
                          context={`${s.carat_weight ? Number(s.carat_weight).toFixed(2) + "ct " : ""}${s.shape || ""} ${s.stone_type}`}
                          trigger={
                            <Button
                              size="sm"
                              className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
                            >
                              Enquire
                            </Button>
                          }
                        />
                        <Link to="/stone/$id" params={{ id: s.id }}>
                          <Button size="sm" variant="outline" className="w-full">
                            View details
                          </Button>
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}