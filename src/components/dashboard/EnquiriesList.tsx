import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Side = "dealer" | "jeweller";

export function EnquiriesList({ enquiries, side }: { enquiries: any[]; side: Side }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const counterpartyIds = Array.from(
    new Set(enquiries.map((e) => (side === "dealer" ? e.from_jeweller_id : e.to_dealer_id)).filter(Boolean)),
  );

  const { data: jewellerLogos } = useQuery({
    queryKey: ["enquiry-jeweller-logos", side, counterpartyIds.join(",")],
    enabled: side === "dealer" && counterpartyIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("jeweller_profiles")
        .select("id, logo_url")
        .in("id", counterpartyIds);
      const map: Record<string, string | null> = {};
      for (const r of (data ?? []) as any[]) map[r.id] = r.logo_url ?? null;
      return map;
    },
  });

  if (!enquiries.length) {
    return <div className="mt-6 rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">No enquiries yet.</div>;
  }

  return (
    <div className="mt-6 space-y-3">
      {enquiries.map((e) => {
        const counterparty = side === "dealer"
          ? (e.profiles?.company_name || e.profiles?.full_name || "Jeweller")
          : (e.profiles?.company_name || "Dealer");
        const cpId = side === "dealer" ? e.from_jeweller_id : e.to_dealer_id;
        const logo = side === "dealer" ? jewellerLogos?.[cpId] : null;
        const initials = (counterparty || "?").slice(0, 1).toUpperCase();
        return (
          <div key={e.id} className="rounded-md border border-border bg-card">
            <button
              className="flex w-full items-center justify-between p-4 text-left"
              onClick={() => setOpenId(openId === e.id ? null : e.id)}
            >
              <div className="flex items-center gap-3">
                {logo ? (
                  <img src={logo} alt="" className="h-9 w-9 rounded-full border border-border object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium">
                    {initials}
                  </div>
                )}
                <div>
                  <div className="font-medium">{e.subject || "Enquiry"}</div>
                  <div className="text-xs text-muted-foreground">
                    {counterparty} · {new Date(e.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Badge variant={e.status === "open" ? "default" : "outline"}>{e.status}</Badge>
            </button>
            {openId === e.id && <Thread enquiry={e} side={side} />}
          </div>
        );
      })}
    </div>
  );
}

function Thread({ enquiry, side }: { enquiry: any; side: Side }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [soldOpen, setSoldOpen] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [savingSale, setSavingSale] = useState(false);

  const { data: messages, refetch } = useQuery({
    queryKey: ["enquiry-messages", enquiry.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiry_messages")
        .select("id, message, sender_id, created_at")
        .eq("enquiry_id", enquiry.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  async function send() {
    if (!user || !reply.trim()) return;
    const { error } = await supabase.from("enquiry_messages").insert({
      enquiry_id: enquiry.id,
      sender_id: user.id,
      message: reply,
    });
    if (error) return toast.error(error.message);
    setReply("");
    refetch();
  }

  async function updateStatus(status: string) {
    await supabase.from("enquiries").update({ status }).eq("id", enquiry.id);
    qc.invalidateQueries({ queryKey: [side === "dealer" ? "my-enquiries-dealer" : "my-enquiries-jeweller"] });
  }

  async function markAsSold() {
    if (!user) return;
    const price = salePrice.trim() ? Number(salePrice) : null;
    if (price !== null && (isNaN(price) || price < 1 || price > 5_000_000)) {
      toast.error("Sale price must be a number between 1 and 5,000,000");
      return;
    }
    setSavingSale(true);
    const { error } = await supabase.from("orders").insert({
      enquiry_id: enquiry.id,
      dealer_id: user.id,
      jeweller_id: enquiry.from_jeweller_id,
      stone_id: enquiry.stone_id,
      wholesale_price_usd: price,
      notes: saleNotes.trim() || null,
    });
    setSavingSale(false);
    if (error) return toast.error(error.message);
    await supabase.from("enquiries").update({ status: "closed" }).eq("id", enquiry.id);
    toast.success("Marked as sold");
    setSoldOpen(false);
    setSalePrice("");
    setSaleNotes("");
    qc.invalidateQueries({ queryKey: ["my-enquiries-dealer"] });
    qc.invalidateQueries({ queryKey: ["dealer-sales"] });
  }

  return (
    <div className="border-t border-border p-4">
      <div className="space-y-2">
        {(messages ?? []).map((m) => (
          <div key={m.id} className={`rounded-md p-3 text-sm ${m.sender_id === user?.id ? "bg-[var(--color-gold)]/10 ml-8" : "bg-muted mr-8"}`}>
            <div className="text-xs text-muted-foreground">{m.sender_id === user?.id ? "You" : "Them"} · {new Date(m.created_at).toLocaleString()}</div>
            <div className="mt-1 whitespace-pre-wrap">{m.message}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" rows={3} />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {enquiry.status !== "closed" && (
              <Button variant="outline" size="sm" onClick={() => updateStatus("closed")}>Close</Button>
            )}
            {enquiry.status === "closed" && (
              <Button variant="outline" size="sm" onClick={() => updateStatus("open")}>Reopen</Button>
            )}
            {side === "dealer" && (
              <Dialog open={soldOpen} onOpenChange={setSoldOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Mark as sold</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record sale</DialogTitle>
                    <DialogDescription>
                      Records the sale, marks the stone as sold, and closes this enquiry. The jeweller will be notified by email.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Sale price (USD) <span className="text-muted-foreground font-normal">— optional</span></label>
                      <Input
                        type="number" min={1} max={5_000_000} step="0.01" inputMode="decimal"
                        value={salePrice} onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="e.g. 4200"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">— optional</span></label>
                      <Textarea
                        rows={3} value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)}
                        placeholder="Reference, shipping notes…"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSoldOpen(false)}>Cancel</Button>
                    <Button onClick={markAsSold} disabled={savingSale}
                      className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                      {savingSale ? "Saving…" : "Confirm sale"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Button size="sm" onClick={send} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
            Send reply
          </Button>
        </div>
      </div>
    </div>
  );
}