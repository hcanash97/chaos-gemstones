import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StoneForm, emptyStone, type StoneFormValues } from "@/components/dashboard/StoneForm";
import { StoneImages } from "@/components/dashboard/StoneImages";

export const Route = createFileRoute("/dashboard/stones/$id")({
  component: EditStone,
});

function EditStone() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [values, setValues] = useState<StoneFormValues | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("stones")
        .select("*")
        .eq("id", id)
        .eq("dealer_id", user.id)
        .maybeSingle();
      if (error || !data) { setNotFound(true); return; }
      setValues({
        ...emptyStone,
        stone_type: data.stone_type ?? "diamond",
        shape: data.shape ?? "",
        carat_weight: data.carat_weight?.toString() ?? "",
        colour_grade: data.colour_grade ?? "",
        clarity_grade: data.clarity_grade ?? "",
        cut_grade: data.cut_grade ?? "",
        origin: data.origin ?? "",
        country_of_origin: data.country_of_origin ?? "",
        treatment: data.treatment ?? "",
        wholesale_price_usd: data.wholesale_price_usd?.toString() ?? "",
        available_qty: data.available_qty?.toString() ?? "1",
        status: (data.status ?? "available") as StoneFormValues["status"],
        cert_lab: data.cert_lab ?? "",
        cert_number: data.cert_number ?? "",
        featured: !!data.featured,
      });
    })();
  }, [id, user]);

  if (notFound) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">Stone not found or not yours.</p>
        <Link to="/dashboard/stones" className="text-sm underline">Back to inventory</Link>
      </div>
    );
  }

  if (!user || !values) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/dashboard/stones" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to inventory
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-serif text-3xl text-foreground">Edit stone</h1>
          <Link to="/stone/$id" params={{ id }}>
            <span className="text-sm text-muted-foreground underline hover:text-foreground">View public page</span>
          </Link>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <StoneImages stoneId={id} dealerId={user.id} />
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <StoneForm initial={values} stoneId={id} dealerId={user.id} />
      </div>
    </div>
  );
}