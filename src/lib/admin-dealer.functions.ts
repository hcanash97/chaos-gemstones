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

/**
 * Full diagnostic snapshot of a dealer for the admin dealer detail page.
 */
export const adminGetDealerDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dealerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    const { dealerId } = data;

    const [
      profile,
      dealerProfile,
      stones,
      stoneStatusCounts,
      syncLogs,
      apiKey,
      enquiries,
      orders,
      enquiryStatusCounts,
      mostViewed,
    ] = await Promise.all([
      sb.from("profiles").select("*").eq("id", dealerId).maybeSingle(),
      (sb as any).from("dealer_profiles").select("*").eq("id", dealerId).maybeSingle(),
      sb
        .from("stones")
        .select("id, stone_type, shape, carat_weight, cert_lab, cert_number, status, created_at, view_count, share_count, feed_inactive")
        .eq("dealer_id", dealerId)
        .order("created_at", { ascending: false })
        .limit(200),
      sb.from("stones").select("status, feed_inactive").eq("dealer_id", dealerId),
      sb.from("sync_logs").select("*").eq("dealer_id", dealerId).order("started_at", { ascending: false }).limit(10),
      sb
        .from("api_keys")
        .select("id, label, is_active, key_prefix, key_type, created_at, last_used_at")
        .eq("jeweller_id", dealerId)
        .eq("key_type", "write")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("enquiries")
        .select("id, subject, status, created_at, stone_id, from_jeweller_id")
        .eq("to_dealer_id", dealerId)
        .order("created_at", { ascending: false })
        .limit(5),
      sb
        .from("orders")
        .select("id, wholesale_price_usd, sale_date, shipping_status, jeweller_id, stone_id")
        .eq("dealer_id", dealerId)
        .order("sale_date", { ascending: false })
        .limit(5),
      sb.from("enquiries").select("status").eq("to_dealer_id", dealerId),
      sb
        .from("stones")
        .select("id, stone_type, shape, carat_weight, view_count")
        .eq("dealer_id", dealerId)
        .order("view_count", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Hydrate enquiry sender names (jeweller company)
    const jewellerIds = Array.from(
      new Set([
        ...(enquiries.data ?? []).map((e) => e.from_jeweller_id),
        ...(orders.data ?? []).map((o) => o.jeweller_id),
      ]),
    ).filter(Boolean) as string[];

    const jewellerMap = new Map<string, { company_name: string | null; full_name: string | null; email: string | null }>();
    if (jewellerIds.length) {
      const { data: js } = await sb.from("profiles").select("id, company_name, full_name, email").in("id", jewellerIds);
      for (const j of js ?? []) jewellerMap.set(j.id, j);
    }

    // Hydrate stone summaries for enquiries/orders
    const stoneIds = Array.from(
      new Set([
        ...(enquiries.data ?? []).map((e) => e.stone_id),
        ...(orders.data ?? []).map((o) => o.stone_id),
        mostViewed.data?.id,
      ]),
    ).filter(Boolean) as string[];
    const stoneMap = new Map<string, { stone_type: string; shape: string | null; carat_weight: number | null }>();
    if (stoneIds.length) {
      const { data: ss } = await sb.from("stones").select("id, stone_type, shape, carat_weight").in("id", stoneIds);
      for (const s of ss ?? []) stoneMap.set(s.id, s);
    }

    // Stone thumbnail for most-viewed
    let mostViewedImage: string | null = null;
    if (mostViewed.data?.id) {
      const { data: img } = await sb
        .from("stone_images")
        .select("storage_url")
        .eq("stone_id", mostViewed.data.id)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();
      mostViewedImage = img?.storage_url ?? null;
    }

    // Stones with image flag (one query checking any stone_images row per stone)
    const stoneIdList = (stones.data ?? []).map((s) => s.id);
    const hasImageSet = new Set<string>();
    if (stoneIdList.length) {
      const { data: imgs } = await sb.from("stone_images").select("stone_id").in("stone_id", stoneIdList);
      for (const i of imgs ?? []) hasImageSet.add(i.stone_id);
    }

    const counts = { available: 0, reserved: 0, sold: 0, feed_inactive: 0, total: 0 };
    for (const s of stoneStatusCounts.data ?? []) {
      counts.total += 1;
      if (s.feed_inactive) counts.feed_inactive += 1;
      if (s.status === "available") counts.available += 1;
      else if (s.status === "reserved") counts.reserved += 1;
      else if (s.status === "sold") counts.sold += 1;
    }

    const enquiryCounts = { total: 0, open: 0, replied: 0, closed: 0 };
    for (const e of enquiryStatusCounts.data ?? []) {
      enquiryCounts.total += 1;
      if (e.status === "open") enquiryCounts.open += 1;
      else if (e.status === "replied") enquiryCounts.replied += 1;
      else if (e.status === "closed") enquiryCounts.closed += 1;
    }

    const totalViews = (stones.data ?? []).reduce((t, s) => t + (s.view_count ?? 0), 0);
    const totalShares = (stones.data ?? []).reduce((t, s) => t + (s.share_count ?? 0), 0);

    return {
      profile: profile.data,
      dealerProfile: dealerProfile,
      stones: (stones.data ?? []).map((s) => ({ ...s, hasImage: hasImageSet.has(s.id) })),
      counts,
      syncLogs: syncLogs.data ?? [],
      apiKey: apiKey.data,
      enquiries: (enquiries.data ?? []).map((e) => ({
        ...e,
        jeweller: jewellerMap.get(e.from_jeweller_id) ?? null,
        stone: e.stone_id ? stoneMap.get(e.stone_id) ?? null : null,
      })),
      orders: (orders.data ?? []).map((o) => ({
        ...o,
        jeweller: jewellerMap.get(o.jeweller_id) ?? null,
        stone: o.stone_id ? stoneMap.get(o.stone_id) ?? null : null,
      })),
      enquiryCounts,
      analytics: {
        totalViews,
        totalShares,
        mostViewed: mostViewed.data ? { ...mostViewed.data, imageUrl: mostViewedImage } : null,
      },
    };
  });

/**
 * Admin-triggered feed sync for a given dealer. Reuses the same sync helper
 * as the dealer-self trigger, but marks the source as "admin".
 */
export const adminRunDealerSyncFor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ dealerId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const { runDealerSyncForUser } = await import("@/lib/dealer-sync.server");
    return runDealerSyncForUser(data.dealerId, "admin");
  });

/**
 * Dealer-health summary for a batch of dealer ids. Returns most-recent stone
 * timestamp and total stone count per dealer; the UI derives 🟢/🟡/🔴/⚫.
 */
export const adminGetDealerHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ dealerIds: z.array(z.string().uuid()).min(1).max(200) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const sb = await requireAdmin(context.userId);
    const { data: rows } = await sb
      .from("stones")
      .select("dealer_id, created_at")
      .in("dealer_id", data.dealerIds)
      .order("created_at", { ascending: false });
    const map = new Map<string, { stoneCount: number; lastStoneAt: string | null }>();
    for (const id of data.dealerIds) map.set(id, { stoneCount: 0, lastStoneAt: null });
    for (const r of rows ?? []) {
      const e = map.get(r.dealer_id)!;
      e.stoneCount += 1;
      if (!e.lastStoneAt || r.created_at > e.lastStoneAt) e.lastStoneAt = r.created_at;
    }
    return { health: Object.fromEntries(map) };
  });

/**
 * Platform activity feed: unified recent events across signups, stone listings,
 * enquiries, orders, and sync logs. Returns up to 20 most-recent items.
 */
export const adminGetActivityFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await requireAdmin(context.userId);

    const [signups, listings, enquiries, orders, syncs] = await Promise.all([
      sb
        .from("profiles")
        .select("id, full_name, company_name, account_type, account_types, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("stones")
        .select("id, dealer_id, stone_type, carat_weight, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("enquiries")
        .select("id, from_jeweller_id, to_dealer_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("orders")
        .select("id, jeweller_id, dealer_id, stone_id, jeweller_confirmed_receipt, received_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("sync_logs")
        .select("id, dealer_id, status, stones_added, stones_updated, finished_at, started_at")
        .eq("status", "success")
        .order("finished_at", { ascending: false })
        .limit(20),
    ]);

    // Collect all referenced user ids and resolve names in one shot
    const userIds = new Set<string>();
    for (const s of signups.data ?? []) userIds.add(s.id);
    for (const l of listings.data ?? []) userIds.add(l.dealer_id);
    for (const e of enquiries.data ?? []) { userIds.add(e.from_jeweller_id); userIds.add(e.to_dealer_id); }
    for (const o of orders.data ?? []) { userIds.add(o.jeweller_id); userIds.add(o.dealer_id); }
    for (const s of syncs.data ?? []) userIds.add(s.dealer_id);

    const userMap = new Map<string, string>();
    if (userIds.size) {
      const { data: ps } = await sb
        .from("profiles")
        .select("id, company_name, full_name, email")
        .in("id", Array.from(userIds));
      for (const p of ps ?? []) {
        userMap.set(p.id, p.company_name || p.full_name || p.email || p.id.slice(0, 8));
      }
    }

    type Event = { id: string; ts: string; type: string; text: string; href?: string };
    const events: Event[] = [];

    for (const s of signups.data ?? []) {
      const name = userMap.get(s.id) ?? s.full_name ?? s.company_name ?? "Someone";
      const role = s.account_type === "dealer" ? "dealer" : s.account_type === "jeweller" ? "jeweller" : "user";
      events.push({
        id: `signup-${s.id}`,
        ts: s.created_at,
        type: "signup",
        text: `${name} signed up as a ${role}`,
        href: s.account_type === "dealer" ? `/admin/dealer/${s.id}` : undefined,
      });
    }
    for (const l of listings.data ?? []) {
      const name = userMap.get(l.dealer_id) ?? "A dealer";
      const carat = l.carat_weight ? `${l.carat_weight}ct ` : "";
      events.push({
        id: `listing-${l.id}`,
        ts: l.created_at,
        type: "listing",
        text: `${name} listed a ${carat}${l.stone_type}`,
        href: `/stone/${l.id}`,
      });
    }
    for (const e of enquiries.data ?? []) {
      const j = userMap.get(e.from_jeweller_id) ?? "A jeweller";
      const d = userMap.get(e.to_dealer_id) ?? "a dealer";
      events.push({
        id: `enquiry-${e.id}`,
        ts: e.created_at,
        type: "enquiry",
        text: `${j} sent an enquiry to ${d}`,
      });
    }
    for (const o of orders.data ?? []) {
      const j = userMap.get(o.jeweller_id) ?? "A jeweller";
      const d = userMap.get(o.dealer_id) ?? "a dealer";
      if (o.jeweller_confirmed_receipt && o.received_at) {
        events.push({
          id: `order-recv-${o.id}`,
          ts: o.received_at,
          type: "order",
          text: `${j} confirmed receipt from ${d}`,
        });
      } else {
        events.push({
          id: `order-${o.id}`,
          ts: o.created_at,
          type: "order",
          text: `${j} placed an order with ${d}`,
        });
      }
    }
    for (const s of syncs.data ?? []) {
      const name = userMap.get(s.dealer_id) ?? "A dealer";
      const total = (s.stones_added ?? 0) + (s.stones_updated ?? 0);
      events.push({
        id: `sync-${s.id}`,
        ts: s.finished_at ?? s.started_at,
        type: "sync",
        text: `${name} synced ${total} stones from their feed`,
        href: `/admin/dealer/${s.dealer_id}`,
      });
    }

    events.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return { events: events.slice(0, 20) };
  });