import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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
        .select("id, sale_date, wholesale_price_usd, notes, stone_id, jeweller_id, tracking_number, carrier, expected_delivery, shipping_status, stones(stone_type, shape, carat_weight, cert_lab, cert_number), profiles:jeweller_id(full_name, company_name)")
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
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(o.sale_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {o.stones
                      ? `${o.stones.carat_weight ?? ""}ct ${o.stones.shape ?? ""} ${o.stones.stone_type}`
                      : "—"}
                    {o.notes && <div className="text-xs text-muted-foreground">{o.notes}</div>}
                    <TrackingEditor order={o} />
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

function TrackingEditor({ order }: { order: any }) {
  const [editing, setEditing] = useState(false);
  const [carrier, setCarrier] = useState(order.carrier ?? "FedEx");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [eta, setEta] = useState(order.expected_delivery ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("orders").update({
      carrier,
      tracking_number: tracking.trim() || null,
      expected_delivery: eta || null,
      shipping_status: tracking ? "shipped" : "pending",
    }).eq("id", order.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tracking saved");
    setEditing(false);
    order.tracking_number = tracking;
    order.carrier = carrier;
    order.expected_delivery = eta;
  }

  if (!editing && order.tracking_number) {
    return (
      <div className="mt-1 text-xs">
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">{order.carrier ?? "Shipped"}</span>{" "}
        <span className="font-mono text-muted-foreground">{order.tracking_number}</span>
        <button onClick={() => setEditing(true)} className="ml-2 text-[var(--color-gold)] hover:underline">Edit</button>
      </div>
    );
  }
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="mt-1 text-xs text-[var(--color-gold)] hover:underline">
        + Add tracking
      </button>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      <Select value={carrier} onValueChange={setCarrier}>
        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["FedEx", "DHL", "Malca-Amit", "Brinks", "Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="h-7 w-36 text-xs" placeholder="Tracking #" value={tracking} onChange={(e) => setTracking(e.target.value)} />
      <Input className="h-7 w-32 text-xs" type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
      <Button size="sm" className="h-7" onClick={save} disabled={saving}>{saving ? "…" : "Save"}</Button>
      <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(false)}>Cancel</Button>
    </div>
  );
}