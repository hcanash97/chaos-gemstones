import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type RequestStatus = "open" | "in_progress" | "fulfilled" | "closed";

type StoneRequestRow = {
  id: string;
  jeweller_id: string;
  stone_type: string;
  shape: string[] | null;
  min_carat: number | null;
  max_carat: number | null;
  colour_description: string | null;
  max_budget_usd: number | null;
  treatment: string | null;
  notes: string | null;
  status: RequestStatus;
  created_at: string;
  profiles: {
    company_name: string | null;
    full_name: string | null;
    email: string | null;
  } | null;
};

export const Route = createFileRoute("/admin/requests")({
  component: AdminRequestsPage,
});

function AdminRequestsPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (!isAdmin) navigate({ to: "/", replace: true });
  }, [loading, user, isAdmin, navigate]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-stone-requests"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stone_requests")
        .select("id, jeweller_id, stone_type, shape, min_carat, max_carat, colour_description, max_budget_usd, treatment, notes, status, created_at, profiles:jeweller_id(company_name, full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StoneRequestRow[];
    },
  });

  async function updateStatus(id: string, status: RequestStatus) {
    const { error } = await supabase
      .from("stone_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request status updated");
    queryClient.invalidateQueries({ queryKey: ["admin-stone-requests"] });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Admin</div>
          <h1 className="mt-2 font-serif text-4xl">Concierge Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review jeweller sourcing requests and move them through the concierge workflow.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Jeweller</th>
                <th className="px-4 py-3">Stone spec</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-border">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-60" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-9 w-36" /></td>
                  </tr>
                ))}
              {!isLoading && (requests ?? []).map((request) => (
                <tr key={request.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {request.profiles?.company_name || request.profiles?.full_name || "Unknown jeweller"}
                    </div>
                    <div className="text-xs text-muted-foreground">{request.profiles?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium capitalize">{request.stone_type}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {[
                        request.shape?.length ? request.shape.join(", ") : null,
                        request.min_carat || request.max_carat
                          ? `${request.min_carat ?? "?"}-${request.max_carat ?? "?"}ct`
                          : null,
                        request.colour_description,
                        request.treatment,
                      ].filter(Boolean).join(" · ") || "Open brief"}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {request.max_budget_usd ? `$${Number(request.max_budget_usd).toLocaleString()}` : "—"}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                    {request.notes || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Select value={request.status} onValueChange={(value) => updateStatus(request.id, value as RequestStatus)}>
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {!isLoading && (!requests || requests.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No concierge requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
