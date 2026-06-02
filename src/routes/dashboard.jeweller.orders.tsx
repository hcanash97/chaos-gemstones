import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type OrderRow = {
  id: string;
  sale_date: string;
  wholesale_price_usd: number | null;
  shipping_status: string | null;
  tracking_number: string | null;
  carrier: string | null;
  expected_delivery: string | null;
  received_at: string | null;
  jeweller_confirmed_receipt: boolean | null;
  platform_fee_usd: number | null;
  enquiry_id: string | null;
  notes: string | null;
  stones: { stone_type: string; shape: string | null; carat_weight: number | null; cert_lab: string | null; cert_number: string | null } | null;
  dealer: { full_name: string | null; company_name: string | null; country: string | null } | null;
};

const TABS = ["all", "pending", "shipped", "delivered", "complete"] as const;
type Tab = typeof TABS[number];

export const Route = createFileRoute("/dashboard/jeweller/orders")({
  component: JewellerOrders,
});

function JewellerOrders() {
  const { user, profile } = useAuth();
  const { format } = useCurrency();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, sale_date, wholesale_price_usd, shipping_status, tracking_number, carrier, expected_delivery, received_at, jeweller_confirmed_receipt, platform_fee_usd, enquiry_id, notes, stones(stone_type, shape, carat_weight, cert_lab, cert_number), dealer:dealer_id(full_name, company_name, country)")
      .eq("jeweller_id", user.id)
      .order("sale_date", { ascending: false });
    setRows((data as unknown as OrderRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (profile && !isJewellerHelper(profile)) return <div>Jewellers only.</div>;

  function statusFor(o: OrderRow): Tab {
    if (o.jeweller_confirmed_receipt) return "complete";
    if (o.shipping_status === "delivered") return "delivered";
    if (o.tracking_number || o.shipping_status === "shipped") return "shipped";
    return "pending";
  }

  const visible = rows.filter((r) => tab === "all" ? true : statusFor(r) === tab);

  async function markReceived(id: string) {
    const { error } = await supabase.from("orders").update({
      jeweller_confirmed_receipt: true,
      shipping_status: "delivered",
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Receipt confirmed — transaction complete");
    load();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">My orders</h1>
      <p className="text-sm text-muted-foreground">Stones you have ordered from dealers, with shipping status and platform fee tracking.</p>

      <div className="mt-4 flex flex-wrap gap-1 rounded-md border border-border p-1 text-sm w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1 capitalize ${tab === t ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            {t} {t !== "all" ? `(${rows.filter((r) => statusFor(r) === t).length})` : `(${rows.length})`}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : visible.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No orders {tab === "all" ? "yet" : `in "${tab}"`}.
          </div>
        ) : visible.map((o) => {
          const dealerName = o.dealer?.company_name || o.dealer?.full_name || "Dealer";
          const stoneName = o.stones ? `${o.stones.carat_weight ?? ""}ct ${o.stones.shape ?? ""} ${o.stones.stone_type}` : "Stone";
          const status = statusFor(o);
          return (
            <div key={o.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-serif text-lg capitalize">{stoneName}</div>
                  <div className="text-xs text-muted-foreground">
                    From <span className="font-medium text-foreground">{dealerName}</span>{o.dealer?.country ? ` · ${o.dealer.country}` : ""}
                    {o.stones?.cert_lab ? ` · ${o.stones.cert_lab} ${o.stones.cert_number ?? ""}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Ordered {new Date(o.sale_date).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base">{format(o.wholesale_price_usd, "USD")}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                    status === "complete" ? "bg-green-100 text-green-800" :
                    status === "delivered" ? "bg-blue-100 text-blue-800" :
                    status === "shipped" ? "bg-amber-100 text-amber-800" :
                    "bg-gray-100 text-gray-700"
                  }`}>{status}</span>
                </div>
              </div>

              {o.tracking_number && (
                <div className="mt-3 rounded border border-border bg-muted/30 p-3 text-xs">
                  <div><strong>Tracking:</strong> {o.carrier ?? "—"} · {o.tracking_number}</div>
                  {o.expected_delivery && <div className="text-muted-foreground">Expected {new Date(o.expected_delivery).toLocaleDateString()}</div>}
                </div>
              )}

              {o.jeweller_confirmed_receipt && o.platform_fee_usd != null && (
                <div className="mt-3 rounded border border-green-500/40 bg-green-500/10 p-3 text-xs">
                  <div className="font-medium">Transaction complete</div>
                  <div className="text-muted-foreground">
                    Platform fee: {format(o.platform_fee_usd, "USD")} (2% of {format(o.wholesale_price_usd, "USD")}). Included in your monthly invoice.
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {!o.jeweller_confirmed_receipt && (
                  <Button size="sm" onClick={() => markReceived(o.id)} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                    Mark as received
                  </Button>
                )}
                {!o.tracking_number && <TrackingDialog orderId={o.id} onSaved={load} />}
                {o.enquiry_id && (
                  <Link to="/dashboard/jeweller/enquiries">
                    <Button size="sm" variant="ghost">Open enquiry thread</Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrackingDialog({ orderId, onSaved }: { orderId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState("FedEx");
  const [tracking, setTracking] = useState("");
  const [eta, setEta] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!tracking.trim()) { toast.error("Tracking number required"); return; }
    setSaving(true);
    const { error } = await supabase.from("orders").update({
      carrier, tracking_number: tracking.trim(),
      expected_delivery: eta || null,
      shipping_status: "shipped",
    }).eq("id", orderId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tracking details saved");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">+ Add tracking details</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add tracking details</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["FedEx", "DHL", "Malca-Amit", "Brinks", "Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tracking number</Label>
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </div>
          <div>
            <Label>Expected delivery</Label>
            <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}