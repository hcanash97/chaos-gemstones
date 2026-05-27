import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Row = {
  id: string;
  stone_type: string;
  shape: string | null;
  carat_weight: number | null;
  origin: string | null;
  wholesale_price_usd: number | null;
  status: string;
  featured: boolean;
  created_at: string;
};

export const Route = createFileRoute("/dashboard/stones/")({
  component: StonesList,
});

function StonesList() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("stones")
      .select("id, stone_type, shape, carat_weight, origin, wholesale_price_usd, status, featured, created_at")
      .eq("dealer_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this stone? This cannot be undone.")) return;
    const { error } = await supabase.from("stones").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    setRows((r) => r.filter((x) => x.id !== id));
  }

  async function updateStatus(id: string, status: "available" | "reserved" | "sold") {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("stones").update({ status }).eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(error.message);
      return;
    }
    toast.success(
      status === "available"
        ? "Re-listed — visible in feeds again"
        : status === "reserved"
        ? "Reserved — hidden from public feeds"
        : "Marked sold — removed from public feeds",
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">My Inventory</h1>
          <p className="text-sm text-muted-foreground">{rows.length} listing{rows.length === 1 ? "" : "s"}</p>
        </div>
        <Link to="/dashboard/stones/new">
          <Button className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
            + New stone
          </Button>
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No stones yet.</p>
            <Link to="/dashboard/stones/new" className="mt-3 inline-block">
              <Button variant="outline" size="sm">Add your first stone</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Shape</th>
                <th className="px-4 py-3">Carat</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium capitalize">{r.stone_type}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{r.shape || "—"}</td>
                  <td className="px-4 py-3">{r.carat_weight ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.origin || "—"}</td>
                  <td className="px-4 py-3">{r.wholesale_price_usd ? `$${Number(r.wholesale_price_usd).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as "available" | "reserved" | "sold")}>
                      <SelectTrigger
                        className={`h-7 w-[120px] border-0 px-2 text-xs font-medium ${
                          r.status === "available"
                            ? "bg-green-100 text-green-800"
                            : r.status === "sold"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/dashboard/stones/$id" params={{ id: r.id }}>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-destructive">
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}