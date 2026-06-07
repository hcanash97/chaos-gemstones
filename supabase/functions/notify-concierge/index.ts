const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ConciergePayload = {
  jeweller_id?: string;
  stone_type?: string;
  shape?: string[] | string | null;
  min_carat?: number | null;
  max_carat?: number | null;
  max_budget_usd?: number | null;
  budget_usd_max?: number | null;
  treatment?: string | null;
  treatment_preference?: string | null;
  notes?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as ConciergePayload;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");

    let jewellerName = "Unknown jeweller";
    let jewellerEmail = "";

    if (payload.jeweller_id && supabaseUrl && serviceRoleKey) {
      const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${payload.jeweller_id}&select=company_name,full_name,email`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });
      if (profileRes.ok) {
        const rows = (await profileRes.json()) as Array<{ company_name?: string | null; full_name?: string | null; email?: string | null }>;
        const profile = rows[0];
        jewellerName = profile?.company_name || profile?.full_name || jewellerName;
        jewellerEmail = profile?.email || "";
      }
    }

    const shape = Array.isArray(payload.shape) ? payload.shape.join(", ") : payload.shape || "Any";
    const carat = payload.min_carat || payload.max_carat
      ? `${payload.min_carat ?? "?"}-${payload.max_carat ?? "?"}ct`
      : "Any";
    const budget = payload.max_budget_usd ?? payload.budget_usd_max;
    const treatment = payload.treatment_preference || payload.treatment || "No preference";

    const html = `
      <h2>New Chaos concierge request</h2>
      <p><strong>Jeweller:</strong> ${escapeHtml(jewellerName)}${jewellerEmail ? ` (${escapeHtml(jewellerEmail)})` : ""}</p>
      <p><strong>Stone:</strong> ${escapeHtml(payload.stone_type || "Any")}</p>
      <p><strong>Shape:</strong> ${escapeHtml(shape)}</p>
      <p><strong>Carat:</strong> ${escapeHtml(carat)}</p>
      <p><strong>Budget:</strong> ${budget ? `$${Number(budget).toLocaleString()}` : "Not specified"}</p>
      <p><strong>Treatment:</strong> ${escapeHtml(treatment)}</p>
      <p><strong>Notes:</strong></p>
      <p>${escapeHtml(payload.notes || "None")}</p>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Chaos Gemstones <noreply@chaosgemstones.com>",
        to: ["noreply@chaosgemstones.com"],
        subject: `New concierge request: ${payload.stone_type || "Stone request"}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const detail = await emailRes.text();
      throw new Error(`Resend failed: ${detail}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
