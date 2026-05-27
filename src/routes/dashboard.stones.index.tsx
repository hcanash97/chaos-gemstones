import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

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
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.status === "available" ? "bg-green-100 text-green-800" :
                      r.status === "sold" ? "bg-gray-200 text-gray-700" :
                      "bg-amber-100 text-amber-800"
                    }`}>{r.status}</span>
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