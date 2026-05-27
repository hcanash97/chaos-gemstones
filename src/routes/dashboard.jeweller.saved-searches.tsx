import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { activeFilterCount, type FilterState } from "@/lib/marketplace/filters";

export const Route = createFileRoute("/dashboard/jeweller/saved-searches")({
  component: SavedSearches,
});

function SavedSearches() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["saved-searches", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_searches")
        .select("id, name, filters, notify_daily, last_notified_at, created_at")
        .eq("jeweller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function toggleNotify(id: string, value: boolean) {
    setBusyId(id);
    await supabase.from("saved_searches").update({ notify_daily: value }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["saved-searches"] });
    setBusyId(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this saved search?")) return;
    setBusyId(id);
    await supabase.from("saved_searches").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["saved-searches"] });
    setBusyId(null);
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Saved searches</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Save a marketplace filter set and we'll email you a daily digest of new matching stones.
      </p>

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
      ) : !data?.length ? (
        <div className="mt-8 rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You haven't saved any searches yet.{" "}
          <Link to="/marketplace" className="text-[var(--color-gold)] underline">Open the marketplace</Link>{" "}
          and click <strong>Save search</strong> to start one.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((s) => {
            const count = activeFilterCount((s.filters ?? {}) as FilterState);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {count} filter{count === 1 ? "" : "s"} ·{" "}
                    {s.last_notified_at
                      ? `Last digest ${new Date(s.last_notified_at).toLocaleDateString()}`
                      : "No digest sent yet"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={!!s.notify_daily}
                      disabled={busyId === s.id}
                      onChange={(e) => toggleNotify(s.id, e.target.checked)}
                    />
                    Daily digest
                  </label>
                  <Link
                    to="/marketplace"
                    search={{ saved: s.id } as any}
                    className="text-xs text-[var(--color-gold)] underline"
                  >
                    Run
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === s.id}
                    onClick={() => remove(s.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}