import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateDealer, corsHeaders, json } from "@/lib/dealer-api-auth.server";
import { validateStonePayload } from "@/lib/dealer-api-validate";

export const Route = createFileRoute("/api/dealer/v1/stones/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request, params }) => {
        const auth = await authenticateDealer(request);
        if (!auth.ok) return auth.response;
        const { data, error } = await supabaseAdmin
          .from("stones")
          .select("*")
          .eq("id", params.id)
          .eq("dealer_id", auth.ctx.dealerId)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Stone not found" }, 404);
        return json(data);
      },

      PUT: async ({ request, params }) => {
        const auth = await authenticateDealer(request);
        if (!auth.ok) return auth.response;

        let payload: Record<string, unknown>;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const result = validateStonePayload(payload, "update");
        if (!result.ok) return json({ error: "Validation failed", errors: result.errors }, 422);

        const { data: existing } = await supabaseAdmin
          .from("stones")
          .select("id")
          .eq("id", params.id)
          .eq("dealer_id", auth.ctx.dealerId)
          .maybeSingle();
        if (!existing) return json({ error: "Stone not found" }, 404);

        const { data, error } = await supabaseAdmin
          .from("stones")
          .update(result.data as never)
          .eq("id", params.id)
          .eq("dealer_id", auth.ctx.dealerId)
          .select("*")
          .single();

        if (error) return json({ error: error.message }, 500);
        return json(data);
      },

      DELETE: async ({ request, params }) => {
        const auth = await authenticateDealer(request);
        if (!auth.ok) return auth.response;

        const { data: existing } = await supabaseAdmin
          .from("stones")
          .select("id")
          .eq("id", params.id)
          .eq("dealer_id", auth.ctx.dealerId)
          .maybeSingle();
        if (!existing) return json({ error: "Stone not found" }, 404);

        const { error } = await supabaseAdmin
          .from("stones")
          .delete()
          .eq("id", params.id)
          .eq("dealer_id", auth.ctx.dealerId);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      },
    },
  },
});