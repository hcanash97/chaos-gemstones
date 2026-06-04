import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EnquiriesList } from "@/components/dashboard/EnquiriesList";
import { isJeweller } from "@/lib/auth.utils";

export const Route = createFileRoute("/dashboard/jeweller/enquiries")({
  component: JewellerEnquiries,
});

function JewellerEnquiries() {
  const { user, profile } = useAuth();
  const allowed = isJeweller(profile);

  const { data } = useQuery({
    queryKey: ["my-enquiries-jeweller", user?.id],
    enabled: allowed && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("id, subject, message, status, created_at, stone_id, to_dealer_id, profiles:to_dealer_id(company_name)")
        .eq("from_jeweller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!allowed) return <div>Jewellers only.</div>;

  return (
    <div>
      <h1 className="font-serif text-3xl">My Enquiries</h1>
      <p className="text-sm text-muted-foreground">Conversations with dealers.</p>
      <EnquiriesList enquiries={data ?? []} side="jeweller" />
    </div>
  );
}