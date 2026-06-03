import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EnquiriesList } from "@/components/dashboard/EnquiriesList";
import { isDealer, isAdmin as hasAdminRole } from "@/lib/auth.utils";

export const Route = createFileRoute("/dashboard/enquiries")({
  component: DealerEnquiries,
});

function DealerEnquiries() {
  const { user, profile } = useAuth();
  if (!isDealer(profile) && !hasAdminRole(profile)) {
    return <div>Dealers only.</div>;
  }

  const { data } = useQuery({
    queryKey: ["my-enquiries-dealer", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("id, subject, message, status, created_at, stone_id, from_jeweller_id, profiles:from_jeweller_id(company_name, full_name)")
        .eq("to_dealer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">Enquiries</h1>
      <p className="text-sm text-muted-foreground">Incoming messages from jewellers.</p>
      <EnquiriesList enquiries={data ?? []} side="dealer" />
    </div>
  );
}