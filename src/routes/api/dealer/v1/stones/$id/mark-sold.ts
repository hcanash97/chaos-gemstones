import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateDealer, corsHeaders, json } from "@/lib/dealer-api-auth.server";

export const Route = createFileRoute("/api/dealer/v1/stones/$id/mark-sold")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request, params }) => {
        const auth = await authenticateDealer(request);
        if (!auth.ok) return auth.response;

        let body: { sale_price_usd?: number; notes?: string; jeweller_id?: string } = {};
        try {
          if (request.headers.get("content-length") !== "0") {
            body = (await request.json()) as typeof body;
          }
        } catch {
          // optional body
        }

        const { data: stone } = await supabaseAdmin
          .from("stones")
          .select("*")
          .eq("id", params.id)
          .eq("dealer_id", auth.ctx.dealerId)
          .maybeSingle();
        if (!stone) return json({ error: "Stone not found" }, 404);

        // Update stone status
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("stones")
          .update({ status: "sold" })
          .eq("id", params.id)
          .eq("dealer_id", auth.ctx.dealerId)
          .select("*")
          .single();
        if (updateError) return json({ error: updateError.message }, 500);

        // Record an order row only when we have a jeweller_id; otherwise just mark sold.
        // (the orders table requires a non-null jeweller_id, so this is conditional.)
        if (body.jeweller_id) {
          const { error: orderError } = await supabaseAdmin.from("orders").insert({
            stone_id: stone.id,
            dealer_id: auth.ctx.dealerId,
            jeweller_id: body.jeweller_id,
            wholesale_price_usd: body.sale_price_usd ?? stone.wholesale_price_usd,
            notes: body.notes ?? null,
          });
          if (orderError) {
            // Don't fail the request; stone is sold. Surface as warning.
            return json({ ...updated, order_warning: orderError.message });
          }
        }

        // Remove from any jeweller feed selections (stone_pin rows referencing this stone)
        await supabaseAdmin.from("feed_selections").delete().eq("stone_id", stone.id);

        return json(updated);
      },
    },
  },
});