import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/resend";
import { buildEmail } from "@/lib/email/templates";

// Called by Postgres triggers via pg_net. Body: { type, record_id }.
// The endpoint pulls everything it needs from the DB itself — the request
// body only carries an event reference, never user-controlled email content.
export const Route = createFileRoute("/api/public/hooks/email/notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { type?: string; record_id?: string };
          const { type, record_id } = body;
          if (!type || !record_id) {
            return new Response(
              JSON.stringify({ error: "missing type or record_id" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          const built = await buildEmail(type, record_id, supabaseAdmin);
          if (!built) {
            return new Response(JSON.stringify({ skipped: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          const result = await sendEmail(built.to, built.subject, built.html);
          return new Response(JSON.stringify(result), {
            status: result.ok ? 200 : 500,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[email/notify] error", e);
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});