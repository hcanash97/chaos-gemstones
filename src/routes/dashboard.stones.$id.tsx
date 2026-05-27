import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StoneForm, emptyStone, type StoneFormValues } from "@/components/dashboard/StoneForm";
import { StoneImages } from "@/components/dashboard/StoneImages";
import { CertUpload } from "@/components/dashboard/CertUpload";

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
        minimum_order_qty: (data as any).minimum_order_qty?.toString() ?? "1",
        bulk_pricing_available: !!(data as any).bulk_pricing_available,
        notes_for_buyers: (data as any).notes_for_buyers ?? "",
        polish: (data as any).polish ?? "",
        symmetry: (data as any).symmetry ?? "",
        fluorescence: (data as any).fluorescence ?? "",
        fluorescence_colour: (data as any).fluorescence_colour ?? "",
        colour_hue: (data as any).colour_hue ?? "",
        colour_tone: (data as any).colour_tone ?? "",
        colour_saturation: (data as any).colour_saturation ?? "",
        phenomenon: (data as any).phenomenon ?? "",
        measurements_length: (data as any).measurements_length?.toString() ?? "",
        measurements_width: (data as any).measurements_width?.toString() ?? "",
        measurements_height: (data as any).measurements_height?.toString() ?? "",
        lw_ratio: (data as any).lw_ratio?.toString() ?? "",
        depth_pct: (data as any).depth_pct?.toString() ?? "",
        table_pct: (data as any).table_pct?.toString() ?? "",
        girdle: (data as any).girdle ?? "",
        culet_size: (data as any).culet_size ?? "",
        culet_condition: (data as any).culet_condition ?? "",
        shade: (data as any).shade ?? "",
        milky: (data as any).milky ?? "",
        eye_clean: (data as any).eye_clean ?? "",
        black_inclusion: (data as any).black_inclusion ?? "",
        enhancement: (data as any).enhancement ?? "",
        listing_type: ((data as any).listing_type ?? "single") as "single" | "parcel",
        parcel_quantity: (data as any).parcel_quantity?.toString() ?? "",
        matching_pair: !!(data as any).matching_pair,
        has_video: !!(data as any).has_video,
        has_360: !!(data as any).has_360,
        provenance_report: (data as any).provenance_report ?? "",
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
        <CertUpload stoneId={id} dealerId={user.id} />
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <StoneForm initial={values} stoneId={id} dealerId={user.id} />
      </div>
    </div>
  );
}