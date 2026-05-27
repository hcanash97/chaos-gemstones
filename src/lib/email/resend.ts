// Resend API client for transactional email.
// Until a verified Chaos sending domain is added at resend.com, FROM stays as
// `onboarding@resend.dev` and Resend test-mode will only deliver to the email
// address you signed up to Resend with. Swap CHAOS_FROM below the moment your
// domain is verified — that's the only change required.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

// TODO: change to `Chaos <noreply@your-verified-domain.tld>` after Resend DNS is green
const CHAOS_FROM = "Chaos <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[email] RESEND_API_KEY not configured — email not sent", { to, subject });
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: CHAOS_FROM,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Resend send failed", { status: res.status, body: text, to, subject });
      return { ok: false, status: res.status, error: text };
    }
    const data = await res.json();
    console.log("[email] sent", { to, subject, id: data?.id });
    return { ok: true, data };
  } catch (e) {
    console.error("[email] fetch error", e);
    return { ok: false, error: String(e) };
  }
}