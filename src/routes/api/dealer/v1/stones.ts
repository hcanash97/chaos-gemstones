import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateDealer, corsHeaders, json } from "@/lib/dealer-api-auth.server";
import { validateStonePayload } from "@/lib/dealer-api-validate";

export const Route = createFileRoute("/api/dealer/v1/stones")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const auth = await authenticateDealer(request);
        if (!auth.ok) return auth.response;
        const url = new URL(request.url);
        const status = url.searchParams.get("status") ?? "all";
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
        const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

        let query = supabaseAdmin
          .from("stones")
          .select("*", { count: "exact" })
          .eq("dealer_id", auth.ctx.dealerId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (status !== "all") {
          query = query.eq("status", status as "available" | "reserved" | "sold");
        }

        const { data, count, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({
          total_count: count ?? 0,
          limit,
          offset,
          stones: data ?? [],
        });
      },

      POST: async ({ request }) => {
        const auth = await authenticateDealer(request);
        if (!auth.ok) return auth.response;

        let payload: Record<string, unknown>;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const result = validateStonePayload(payload, "create");
        if (!result.ok) return json({ error: "Validation failed", errors: result.errors }, 422);

        const { data, error } = await supabaseAdmin
          .from("stones")
          .insert({ ...result.data, dealer_id: auth.ctx.dealerId } as never)
          .select("*")
          .single();

        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      },
    },
  },
});