import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required.");
  return supabaseAdmin;
}

const roleEnum = z.enum(["dealer", "jeweller", "admin"]);

/**
 * Set the full role set for a user. Updates account_types array and
 * keeps account_type as the primary (first) role. Auto-creates the
 * matching dealer_profiles / jeweller_profiles rows when missing.
 */
export const adminSetUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        roles: z.array(roleEnum).min(1).max(3),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);

    // Dedupe + normalise: primary (account_type) is the first non-admin
    // role when possible, so 'admin' alone still works.
    const uniq = Array.from(new Set(data.roles));
    const primary = uniq.find((r) => r !== "admin") ?? uniq[0];

    const { data: prevProfile } = await sb
      .from("profiles")
      .select("id, company_name, country, account_type, account_types")
      .eq("id", data.targetUserId)
      .maybeSingle();
    if (!prevProfile) throw new Error("Profile not found.");

    const { error: updateErr } = await sb
      .from("profiles")
      .update({
        account_type: primary as "dealer" | "jeweller" | "admin",
        account_types: uniq,
      })
      .eq("id", data.targetUserId);
    if (updateErr) throw new Error(updateErr.message);

    // Mirror the admin role into user_roles (separate table, not just a column).
    if (uniq.includes("admin")) {
      await sb
        .from("user_roles")
        .upsert({ user_id: data.targetUserId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await sb.from("user_roles").delete().eq("user_id", data.targetUserId).eq("role", "admin");
    }

    let dealerProfileCreated = false;
    let jewellerProfileCreated = false;

    if (uniq.includes("dealer")) {
      const { data: existing } = await sb
        .from("dealer_profiles")
        .select("id")
        .eq("id", data.targetUserId)
        .maybeSingle();
      if (!existing) {
        const slug = "dealer-" + data.targetUserId.slice(0, 8);
        const { error } = await sb.from("dealer_profiles").insert({ id: data.targetUserId, slug });
        if (!error) dealerProfileCreated = true;
      }
    }

    if (uniq.includes("jeweller")) {
      const { data: existing } = await sb
        .from("jeweller_profiles")
        .select("id")
        .eq("id", data.targetUserId)
        .maybeSingle();
      if (!existing) {
        const { error } = await sb.from("jeweller_profiles").insert({ id: data.targetUserId, markup_global: 2.0 });
        if (!error) jewellerProfileCreated = true;
      }
    }

    return { ok: true, roles: uniq, primary, dealerProfileCreated, jewellerProfileCreated };
  });

/**
 * Bulk update is_approved / is_verified across many profiles.
 */
export const adminBulkUpdateAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        action: z.enum(["approve", "suspend", "toggle_verified"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    if (data.action === "approve") {
      const { error } = await sb.from("profiles").update({ is_approved: true }).in("id", data.ids);
      if (error) throw new Error(error.message);
    } else if (data.action === "suspend") {
      const { error } = await sb.from("profiles").update({ is_approved: false }).in("id", data.ids);
      if (error) throw new Error(error.message);
    } else {
      const { data: rows } = await sb.from("profiles").select("id, is_verified").in("id", data.ids);
      for (const r of rows ?? []) {
        await sb.from("profiles").update({ is_verified: !r.is_verified }).eq("id", r.id);
      }
    }
    return { ok: true, count: data.ids.length };
  });

/**
 * Send an email blast via Resend Lovable connector.
 */
export const adminBulkSendEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(200),
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(10_000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    const { data: rows } = await sb.from("profiles").select("email, full_name").in("id", data.ids);
    const recipients = (rows ?? []).map((r) => r.email).filter((e): e is string => !!e);
    if (recipients.length === 0) return { ok: true, sent: 0 };

    const RESEND = process.env.RESEND_API_KEY;
    const LOVABLE = process.env.LOVABLE_API_KEY;
    if (!RESEND || !LOVABLE) throw new Error("Email service not configured.");

    let sent = 0;
    for (const to of recipients) {
      const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE}`,
          "X-Connection-Api-Key": RESEND,
        },
        body: JSON.stringify({
          from: "Chaos <notify@chaosgemstones.com>",
          to: [to],
          subject: data.subject,
          html: `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#0F1B3D;line-height:1.6;">${data.body
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/\n/g, "<br/>")}</div>`,
        }),
      });
      if (res.ok) sent++;
    }
    return { ok: true, sent };
  });

/**
 * Platform stats summary for the admin dashboard.
 */
export const adminGetPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await requireAdmin(context.userId);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getTime() - 7 * 86400_000).toISOString();

    async function counts(table: "profiles" | "stones" | "enquiries" | "orders") {
      const [today, week, all] = await Promise.all([
        sb.from(table).select("id", { count: "exact", head: true }).gte("created_at", startOfToday),
        sb.from(table).select("id", { count: "exact", head: true }).gte("created_at", startOfWeek),
        sb.from(table).select("id", { count: "exact", head: true }),
      ]);
      return { today: today.count ?? 0, week: week.count ?? 0, all: all.count ?? 0 };
    }

    const [signups, stones, enquiries, orders, recentDealers, recentJewellers, openReports, pending] =
      await Promise.all([
        counts("profiles"),
        counts("stones"),
        counts("enquiries"),
        counts("orders"),
        sb
          .from("profiles")
          .select("id, full_name, company_name, email, created_at")
          .eq("is_approved", true)
          .or("account_type.eq.dealer,account_types.cs.{dealer}")
          .order("created_at", { ascending: false })
          .limit(5),
        sb
          .from("profiles")
          .select("id, full_name, company_name, email, created_at")
          .eq("is_approved", true)
          .or("account_type.eq.jeweller,account_types.cs.{jeweller}")
          .order("created_at", { ascending: false })
          .limit(5),
        sb.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        sb.from("profiles").select("id", { count: "exact", head: true }).eq("is_approved", false),
      ]);

    const waitlistCount = await sb
      .from("waitlist" as never)
      .select("id", { count: "exact", head: true })
      .then((r: { count: number | null }) => r.count ?? 0)
      .catch(() => 0);

    // Stone counts for recent dealers
    const dealerIds = (recentDealers.data ?? []).map((d) => d.id);
    const stoneCounts = new Map<string, number>();
    if (dealerIds.length) {
      const { data: rows } = await sb.from("stones").select("dealer_id").in("dealer_id", dealerIds);
      for (const r of rows ?? []) stoneCounts.set(r.dealer_id, (stoneCounts.get(r.dealer_id) ?? 0) + 1);
    }

    // API key status for recent jewellers
    const jewellerIds = (recentJewellers.data ?? []).map((j) => j.id);
    const hasKey = new Set<string>();
    if (jewellerIds.length) {
      const { data: keys } = await sb
        .from("api_keys")
        .select("jeweller_id")
        .in("jeweller_id", jewellerIds)
        .eq("is_active", true);
      for (const k of keys ?? []) hasKey.add(k.jeweller_id);
    }

    return {
      signups,
      stones,
      enquiries,
      orders,
      recentDealers: (recentDealers.data ?? []).map((d) => ({ ...d, stoneCount: stoneCounts.get(d.id) ?? 0 })),
      recentJewellers: (recentJewellers.data ?? []).map((j) => ({ ...j, hasKey: hasKey.has(j.id) })),
      openReports: openReports.count ?? 0,
      pending: pending.count ?? 0,
      waitlist: waitlistCount,
    };
  });

/**
 * Read-only snapshot of a user for impersonation/debugging.
 */
export const adminGetUserSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    const [profile, stones, enquiries, orders, keys] = await Promise.all([
      sb.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      sb
        .from("stones")
        .select("id, stone_type, shape, carat_weight, status, created_at")
        .eq("dealer_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("enquiries")
        .select("id, subject, status, created_at, to_dealer_id, from_jeweller_id")
        .or(`from_jeweller_id.eq.${data.userId},to_dealer_id.eq.${data.userId}`)
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("orders")
        .select("id, wholesale_price_usd, sale_date, shipping_status, dealer_id, jeweller_id")
        .or(`dealer_id.eq.${data.userId},jeweller_id.eq.${data.userId}`)
        .order("sale_date", { ascending: false })
        .limit(20),
      sb.from("api_keys").select("id, label, is_active, key_prefix, created_at").eq("jeweller_id", data.userId),
    ]);
    return {
      profile: profile.data,
      stones: stones.data ?? [],
      enquiries: enquiries.data ?? [],
      orders: orders.data ?? [],
      apiKeys: keys.data ?? [],
    };
  });

/**
 * Generate a signed quick-approve URL for a pending account. The token
 * is an HMAC-SHA256 of `${userId}.${expiresAt}` using SUPABASE_SERVICE_ROLE_KEY
 * as the secret. Verified by the server route /api/public/admin/quick-approve.
 */
export const adminGenerateQuickApproveLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const { quickApproveSign } = await import("@/lib/quick-approve.server");
    const token = await quickApproveSign(data.userId);
    return { url: `https://chaosgemstones.com/admin/quick-approve?token=${token}` };
  });