import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateDealer, corsHeaders, json } from "@/lib/dealer-api-auth.server";
import { validateStonePayload } from "@/lib/dealer-api-validate";
import { normaliseValue, FIELD_MAP } from "@/lib/import-fields";

export const Route = createFileRoute("/api/dealer/v1/stones/bulk")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        const auth = await authenticateDealer(request);
        if (!auth.ok) return auth.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        if (!Array.isArray(body)) {
          return json({ error: "Body must be an array of stone objects" }, 400);
        }
        if (body.length > 200) {
          return json({ error: "Maximum 200 stones per bulk request" }, 400);
        }

        // Load existing cert_numbers for this dealer to detect upserts
        const { data: existingStones } = await supabaseAdmin
          .from("stones")
          .select("id, cert_number")
          .eq("dealer_id", auth.ctx.dealerId)
          .not("cert_number", "is", null);
        const certToId = new Map<string, string>();
        for (const s of existingStones ?? []) {
          if (s.cert_number) certToId.set(s.cert_number, s.id);
        }

        const errors: Array<{ row: number; field: string; message: string }> = [];
        const toCreate: Array<Record<string, unknown>> = [];
        const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];

        body.forEach((raw, idx) => {
          if (!raw || typeof raw !== "object") {
            errors.push({ row: idx, field: "_root", message: "Each entry must be an object" });
            return;
          }
          // Normalise known fields before validation, including enum fields
          // such as cert_lab and clarity_grade.
          const rawPayload = raw as Record<string, unknown>;
          const payload: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(rawPayload)) {
            const fieldDef = FIELD_MAP[k];
            payload[k] = fieldDef ? normaliseValue(fieldDef, v) : v;
          }
          const cert = payload.cert_number ? String(payload.cert_number).trim() : "";
          const existingId = cert ? certToId.get(cert) : undefined;

          const mode = existingId ? "update" : "create";
          const result = validateStonePayload(payload, mode);
          if (!result.ok) {
            result.errors.forEach((e) => errors.push({ row: idx, field: e.field, message: e.message }));
            return;
          }
          if (existingId) {
            toUpdate.push({ id: existingId, data: result.data });
          } else {
            toCreate.push({ ...result.data, dealer_id: auth.ctx.dealerId });
          }
        });

        let created = 0;
        let updated = 0;

        if (toCreate.length) {
          const { data, error } = await supabaseAdmin
            .from("stones")
            .insert(toCreate as never)
            .select("id");
          if (error) return json({ error: error.message, errors }, 500);
          created = data?.length ?? 0;
        }

        for (const u of toUpdate) {
          const { error } = await supabaseAdmin
            .from("stones")
            .update(u.data as never)
            .eq("id", u.id)
            .eq("dealer_id", auth.ctx.dealerId);
          if (error) {
            errors.push({ row: -1, field: "_update", message: `${u.id}: ${error.message}` });
          } else {
            updated += 1;
          }
        }

        return json({ created, updated, errors });
      },
    },
  },
});
