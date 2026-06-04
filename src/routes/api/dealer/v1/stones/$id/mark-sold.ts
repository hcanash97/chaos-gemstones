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

        // Idempotency: if the stone is already sold, just return the row
        // (with already_sold:true so the caller can distinguish). Do NOT
        // create a second order row for the same sale.
        if (stone.status === "sold") {
          return json({ ...stone, already_sold: true });
        }

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
          // Validate jeweller_id is a real, approved jeweller account before
          // inserting an order row — otherwise a dealer could plant fake
          // orders in arbitrary users' dashboards.
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.jeweller_id)) {
            return json({ error: "Invalid jeweller_id format" }, 400);
          }
          const { data: jeweller } = await supabaseAdmin
            .from("profiles")
            .select("id, account_type, account_types, is_approved")
            .eq("id", body.jeweller_id)
            .maybeSingle();
          const isJeweller =
            !!jeweller &&
            jeweller.is_approved === true &&
            (jeweller.account_type === "jeweller" ||
              (Array.isArray((jeweller as any).account_types) &&
                (jeweller as any).account_types.includes("jeweller")));
          if (!isJeweller) {
            return json({ error: "jeweller_id does not match an approved jeweller account" }, 400);
          }
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