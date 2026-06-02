import { createFileRoute } from "@tanstack/react-router";

// Verifies the HMAC token from the admin email and approves the user.
// Returns JSON; the in-app /admin/quick-approve page calls it.
export const Route = createFileRoute("/api/public/admin/quick-approve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { token } = (await request.json()) as { token?: string };
          if (!token) return new Response(JSON.stringify({ ok: false, error: "Missing token" }), { status: 400 });
          const { quickApproveVerify } = await import("@/lib/quick-approve.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const userId = await quickApproveVerify(token);
          const { data: profile, error: readErr } = await supabaseAdmin
            .from("profiles")
            .select("id, email, full_name, is_approved")
            .eq("id", userId)
            .maybeSingle();
          if (readErr) throw new Error(readErr.message);
          if (!profile) return new Response(JSON.stringify({ ok: false, error: "Profile not found" }), { status: 404 });
          if (!profile.is_approved) {
            const { error: updErr } = await supabaseAdmin
              .from("profiles")
              .update({ is_approved: true })
              .eq("id", userId);
            if (updErr) throw new Error(updErr.message);
          }
          return Response.json({ ok: true, alreadyApproved: profile.is_approved, profile });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unexpected error";
          return new Response(JSON.stringify({ ok: false, error: msg }), { status: 400 });
        }
      },
    },
  },
});