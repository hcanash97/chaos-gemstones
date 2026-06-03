import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminGetPlatformStats } from "@/lib/admin.functions";
import { adminGetActivityFeed } from "@/lib/admin-dealer.functions";

export function StatsPanel() {
  const fn = useServerFn(adminGetPlatformStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
  });
  const feedFn = useServerFn(adminGetActivityFeed);
  const { data: feed } = useQuery({
    queryKey: ["admin-activity-feed"],
    queryFn: () => feedFn(),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading stats…</div>;
  if (!data) return null;

  const rows: Array<{ label: string; t: number; w: number; a: number }> = [
    { label: "New signups", ...trio(data.signups) },
    { label: "Stones added", ...trio(data.stones) },
    { label: "Enquiries", ...trio(data.enquiries) },
    { label: "Orders logged", ...trio(data.orders) },
  ];

  return (
    <div className="mt-6 space-y-6">
      {feed && feed.events.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground">Live activity</div>
          <ul className="divide-y divide-border max-h-80 overflow-auto text-sm">
            {feed.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-2">
                {e.href ? (
                  <a href={e.href} className="hover:underline">{e.text}</a>
                ) : (
                  <span>{e.text}</span>
                )}
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">{relTime(e.ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Badge label="Pending approval" value={data.pending} accent={data.pending > 0 ? "amber" : "muted"} />
        <Badge label="Open reports" value={data.openReports} accent={data.openReports > 0 ? "red" : "muted"} />
        <Badge label="Recently approved" value={(data.recentDealers.length + data.recentJewellers.length)} accent="gold" />
        <Badge label="Waitlist signups" value={data.waitlist ?? 0} accent={(data.waitlist ?? 0) > 0 ? "gold" : "muted"} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3 text-right">Today</th>
              <th className="px-4 py-3 text-right">This week</th>
              <th className="px-4 py-3 text-right">All time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.label}</td>
                <td className="px-4 py-3 text-right font-mono">{r.t.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{r.w.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{r.a.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Recently approved dealers">
          {data.recentDealers.length === 0 ? <Empty /> : (
            <ul className="divide-y divide-border text-sm">
              {data.recentDealers.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{d.company_name || d.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{d.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{d.stoneCount} stone{d.stoneCount === 1 ? "" : "s"}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recently approved jewellers">
          {data.recentJewellers.length === 0 ? <Empty /> : (
            <ul className="divide-y divide-border text-sm">
              {data.recentJewellers.map((j) => (
                <li key={j.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{j.company_name || j.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{j.email}</div>
                  </div>
                  <div className={`text-xs ${j.hasKey ? "text-green-700" : "text-muted-foreground"}`}>
                    {j.hasKey ? "API key active" : "No API key"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function trio(o: { today: number; week: number; all: number }) {
  return { t: o.today, w: o.week, a: o.all };
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="border-b border-border pb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="pt-3">{children}</div>
    </div>
  );
}

function Empty() { return <div className="py-6 text-center text-xs text-muted-foreground">Nothing yet.</div>; }

function Badge({ label, value, accent }: { label: string; value: number; accent: "amber" | "red" | "gold" | "muted" }) {
  const colour = accent === "amber" ? "text-amber-700 bg-amber-50 border-amber-200"
    : accent === "red" ? "text-red-700 bg-red-50 border-red-200"
    : accent === "gold" ? "text-[var(--color-gold-foreground)] bg-[var(--color-gold)]/15 border-[var(--color-gold)]/40"
    : "text-muted-foreground bg-muted/30 border-border";
  return (
    <div className={`rounded-lg border p-4 ${colour}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 font-serif text-2xl">{value}</div>
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}