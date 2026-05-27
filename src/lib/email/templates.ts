// Email content builders. Looks up data from the DB using the admin client
// and returns { to, subject, html } — or null to skip sending.
import type { SupabaseClient } from "@supabase/supabase-js";

export const BASE_URL = "https://chaosgemstones.com";

const BRAND_EMERALD = "#1B3A2D";
const BRAND_GOLD = "#D4AF6A";
const INK = "#0F1B3D";
const MUTED = "#777777";

export function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

export function shell(innerHtml: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Inter,Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 0 20px;border-bottom:1px solid #eeeeee;">
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:600;color:${BRAND_EMERALD};letter-spacing:0.5px;">Chaos</div>
        </td></tr>
        <tr><td style="padding:24px 0;font-size:15px;line-height:1.6;color:${INK};">
          ${innerHtml}
        </td></tr>
        <tr><td style="padding:24px 0 0;border-top:1px solid #eeeeee;font-size:12px;color:${MUTED};line-height:1.5;">
          Chaos &mdash; the global marketplace for independent gemstone dealers.<br/>
          <a href="${BASE_URL}" style="color:${MUTED};text-decoration:underline;">${BASE_URL.replace(/^https?:\/\//, "")}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND_GOLD};color:${INK};padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${esc(label)}</a>`;
}

export function gold(text: string): string {
  return `<span style="color:${BRAND_GOLD};font-weight:600;">${esc(text)}</span>`;
}

export type EmailPayload = { to: string; subject: string; html: string } | null;

export async function buildEmail(
  type: string,
  recordId: string,
  sb: SupabaseClient,
): Promise<EmailPayload> {
  switch (type) {
    case "account_received":
      return await buildAccountReceived(recordId, sb);
    case "account_approved_dealer":
      return await buildAccountApproved(recordId, sb, "dealer");
    case "account_approved_jeweller":
      return await buildAccountApproved(recordId, sb, "jeweller");
    case "enquiry_new_dealer":
      return await buildEnquiryNewDealer(recordId, sb);
    case "enquiry_reply_jeweller":
      return await buildEnquiryReplyJeweller(recordId, sb);
    default:
      console.warn("[email] unknown template type", type);
      return null;
  }
}

async function buildAccountReceived(profileId: string, sb: SupabaseClient): Promise<EmailPayload> {
  const { data: p } = await sb
    .from("profiles")
    .select("email, full_name")
    .eq("id", profileId)
    .maybeSingle();
  if (!p?.email) return null;
  const name = p.full_name || "there";
  return {
    to: p.email,
    subject: "We've received your Chaos application",
    html: shell(`
      <p style="margin:0 0 16px;">Hi ${esc(name)},</p>
      <p style="margin:0 0 16px;">Thanks for applying to join Chaos. Your account is under review and we'll notify you as soon as it's approved — usually within 24 hours.</p>
      <p style="margin:0 0 24px;">In the meantime, feel free to browse the marketplace.</p>
      <p style="margin:0 0 24px;">${btn(BASE_URL + "/marketplace", "Browse the marketplace")}</p>
      <p style="margin:0;">— The Chaos team</p>
    `),
  };
}

async function buildAccountApproved(
  profileId: string,
  sb: SupabaseClient,
  role: "dealer" | "jeweller",
): Promise<EmailPayload> {
  const { data: p } = await sb
    .from("profiles")
    .select("email, full_name")
    .eq("id", profileId)
    .maybeSingle();
  if (!p?.email) return null;
  const name = p.full_name || "there";

  if (role === "dealer") {
    return {
      to: p.email,
      subject: "Your Chaos account is approved — you're in",
      html: shell(`
        <p style="margin:0 0 16px;">Hi ${esc(name)},</p>
        <p style="margin:0 0 16px;">Your dealer account is approved. You can now log in, set up your profile, and start uploading your stone inventory.</p>
        <p style="margin:0 0 24px;">${btn(BASE_URL + "/dashboard", "Go to your dashboard")}</p>
        <p style="margin:0;">— The Chaos team</p>
      `),
    };
  }

  return {
    to: p.email,
    subject: "Your Chaos account is approved — you're in",
    html: shell(`
      <p style="margin:0 0 16px;">Hi ${esc(name)},</p>
      <p style="margin:0 0 16px;">Your jeweller account is approved. You can now browse the marketplace, follow dealers, and generate your API feed key.</p>
      <p style="margin:0 0 24px;">${btn(BASE_URL + "/dashboard/jeweller", "Go to your dashboard")}</p>
      <p style="margin:0;">— The Chaos team</p>
    `),
  };
}

async function buildEnquiryNewDealer(enquiryId: string, sb: SupabaseClient): Promise<EmailPayload> {
  const { data: enq } = await sb
    .from("enquiries")
    .select("from_jeweller_id, to_dealer_id, stone_id, subject, message")
    .eq("id", enquiryId)
    .maybeSingle();
  if (!enq) return null;

  const [{ data: dealer }, { data: jeweller }, stoneRes] = await Promise.all([
    sb.from("profiles").select("email, full_name, company_name").eq("id", enq.to_dealer_id).maybeSingle(),
    sb.from("profiles").select("full_name, company_name").eq("id", enq.from_jeweller_id).maybeSingle(),
    enq.stone_id
      ? sb.from("stones").select("stone_type, shape, carat_weight").eq("id", enq.stone_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!dealer?.email) return null;

  const jName = jeweller?.full_name || "A jeweller";
  const jCo = jeweller?.company_name || "";
  const subjectCo = jCo || jName;

  const stone = stoneRes.data;
  const stoneLine = stone
    ? `<p style="margin:0 0 16px;">They're asking about your ${esc(String(stone.carat_weight ?? ""))}ct ${esc(stone.shape ?? "")} ${esc(stone.stone_type)}.</p>`
    : "";

  return {
    to: dealer.email,
    subject: `New enquiry from ${subjectCo} — Chaos`,
    html: shell(`
      <p style="margin:0 0 16px;">Hi ${esc(dealer.full_name || "there")},</p>
      <p style="margin:0 0 16px;">You have a new enquiry from ${gold(jName)}${jCo ? ` at ${gold(jCo)}` : ""}.</p>
      ${stoneLine}
      <p style="margin:0 0 24px;">${btn(BASE_URL + "/dashboard/enquiries", "View enquiry")}</p>
      <p style="margin:0;">— The Chaos team</p>
    `),
  };
}

async function buildEnquiryReplyJeweller(messageId: string, sb: SupabaseClient): Promise<EmailPayload> {
  const { data: msg } = await sb
    .from("enquiry_messages")
    .select("enquiry_id, sender_id")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg) return null;

  const { data: enq } = await sb
    .from("enquiries")
    .select("from_jeweller_id, to_dealer_id")
    .eq("id", msg.enquiry_id)
    .maybeSingle();
  if (!enq) return null;

  const [{ data: jeweller }, { data: dealer }] = await Promise.all([
    sb.from("profiles").select("email, full_name").eq("id", enq.from_jeweller_id).maybeSingle(),
    sb.from("profiles").select("full_name, company_name").eq("id", enq.to_dealer_id).maybeSingle(),
  ]);

  if (!jeweller?.email) return null;

  const dName = dealer?.company_name || dealer?.full_name || "The dealer";

  return {
    to: jeweller.email,
    subject: `${dName} has replied to your enquiry — Chaos`,
    html: shell(`
      <p style="margin:0 0 16px;">Hi ${esc(jeweller.full_name || "there")},</p>
      <p style="margin:0 0 16px;">${gold(dName)} has replied to your enquiry.</p>
      <p style="margin:0 0 24px;">${btn(BASE_URL + "/dashboard/jeweller/enquiries", "View conversation")}</p>
      <p style="margin:0;">— The Chaos team</p>
    `),
  };
}