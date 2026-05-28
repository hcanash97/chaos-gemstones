import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";

export const Route = createFileRoute("/dashboard/sales")({
  component: DealerSales,
});

function DealerSales() {
  const { user, profile } = useAuth();
  const { format, displayCurrency } = useCurrency();
  if (profile?.account_type !== "dealer" && profile?.account_type !== "admin") {
    return <div>Dealers only.</div>;
  }

  const { data: orders, isLoading } = useQuery({
    queryKey: ["dealer-sales", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, sale_date, wholesale_price_usd, notes, stone_id, jeweller_id, stones(stone_type, shape, carat_weight, cert_lab, cert_number), profiles:jeweller_id(full_name, company_name)")
        .eq("dealer_id", user!.id)
        .order("sale_date", { ascending: false });
      return data ?? [];
    },
  });

  const total = (orders ?? []).reduce(
    (sum, o: any) => sum + (Number(o.wholesale_price_usd) || 0),
    0,
  );

  return (
    <div>
      <h1 className="font-serif text-3xl">Sales</h1>
      <p className="text-sm text-muted-foreground">
        Stones you've marked as sold. Total recorded revenue: ${total.toLocaleString()}
      </p>

      {isLoading ? (
        <div className="mt-6 text-sm text-muted-foreground">Loading…</div>
      ) : !orders?.length ? (
        <div className="mt-6 rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No sales recorded yet. Use “Mark as sold” on any enquiry to record one.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Stone</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Cert</th>
                <th className="px-4 py-3 text-right">Price (USD)</th>
              </tr>
            </thead>
            <tbody>
              {(orders as any[]).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(o.sale_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {o.stones
                      ? `${o.stones.carat_weight ?? ""}ct ${o.stones.shape ?? ""} ${o.stones.stone_type}`
                      : "—"}
                    {o.notes && <div className="text-xs text-muted-foreground">{o.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {o.profiles?.company_name || o.profiles?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {o.stones?.cert_lab ? `${o.stones.cert_lab} ${o.stones.cert_number ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.wholesale_price_usd ? (
                      <div>
                        <div className="font-mono">${Number(o.wholesale_price_usd).toLocaleString()}</div>
                        {displayCurrency !== "USD" && (
                          <div className="text-xs text-muted-foreground">{format(o.wholesale_price_usd, "USD")}</div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}