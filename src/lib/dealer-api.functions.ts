import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey, sha256 } from "@/lib/api-keys";
import { runDealerSyncForUser } from "@/lib/dealer-sync.server";

async function ensureApprovedDealer(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, account_types, is_approved")
    .eq("id", userId)
    .single();
  if (!profile) throw new Error("Profile not found.");
  const isDealer =
    profile.account_type === "dealer" ||
    (Array.isArray(profile.account_types) && profile.account_types.includes("dealer"));
  if (!isDealer) throw new Error("Only dealer accounts can use this endpoint.");
  if (!profile.is_approved) throw new Error("Your account is pending approval.");
}

export const getDealerApiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureApprovedDealer(supabase, userId);

    const [{ data: key }, { data: dealerProfile }, { data: logs }] = await Promise.all([
      supabase
        .from("api_keys")
        .select("id, key_prefix, is_active, last_used_at, created_at")
        .eq("jeweller_id", userId)
        .eq("key_type", "write")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from("dealer_profiles")
        .select("external_feed_url, auto_sync_enabled, last_synced_at, external_feed_method, external_feed_body")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("sync_logs")
        .select("*")
        .eq("dealer_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      key: key ?? null,
      dealerProfile: dealerProfile ?? null,
      syncLogs: logs ?? [],
    };
  });

export const generateDealerApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureApprovedDealer(supabase, userId);

    const raw = generateApiKey();
    const hash = await sha256(raw);
    const prefix = raw.slice(0, 12);

    // Deactivate prior write keys for this dealer
    await supabase.from("api_keys").update({ is_active: false }).eq("jeweller_id", userId).eq("key_type", "write");

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        jeweller_id: userId,
        key_hash: hash,
        key_prefix: prefix,
        key_type: "write",
        label: "Dealer write API",
        is_active: true,
      })
      .select("id, key_prefix, is_active, last_used_at, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { key: data, rawKey: raw };
  });

const syncSettingsSchema = z.object({
  external_feed_url: z.string().url().max(500).nullable(),
  auto_sync_enabled: z.boolean(),
  external_feed_method: z.enum(["GET", "POST"]).default("GET"),
  external_feed_body: z.string().max(4000).nullable().optional(),
});

export const updateDealerSyncSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => syncSettingsSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureApprovedDealer(supabase, userId);

    const { error } = await supabase
      .from("dealer_profiles")
      .update({
        external_feed_url: data.external_feed_url,
        auto_sync_enabled: data.auto_sync_enabled,
        external_feed_method: data.external_feed_method,
        external_feed_body: data.external_feed_body ?? null,
      } as never)
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Trigger a sync from the dealer's external_feed_url. Fetches the URL, parses
 * JSON or CSV (basic), and upserts stones by cert_number — same shape as the
 * bulk endpoint. Writes a row to sync_logs.
 */
export const runDealerSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    await ensureApprovedDealer(supabaseAdmin, userId);
    return runDealerSyncForUser(userId, "manual");
  });

export const clearDealerImportedInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    await ensureApprovedDealer(supabaseAdmin, userId);

    let deleted = 0;
    const batchSize = 200;

    for (;;) {
      const { data: rows, error: selectError } = await supabaseAdmin
        .from("stones")
        .select("id")
        .eq("dealer_id", userId)
        .or("external_sync_key.not.is.null,notes_for_buyers.ilike.Stock ref:%")
        .limit(batchSize);

      if (selectError) throw new Error(selectError.message);
      const ids = (rows ?? []).map((row: any) => row.id).filter(Boolean);
      if (!ids.length) break;

      const { error: deleteError } = await supabaseAdmin
        .from("stones")
        .delete()
        .eq("dealer_id", userId)
        .or("external_sync_key.not.is.null,notes_for_buyers.ilike.Stock ref:%")
        .in("id", ids);

      if (deleteError) throw new Error(deleteError.message);
      deleted += ids.length;
      if (ids.length < batchSize) break;
    }

    await supabaseAdmin
      .from("sync_logs")
      .delete()
      .eq("dealer_id", userId)
      .in("source", ["manual", "admin", "cron"]);

    await supabaseAdmin
      .from("dealer_profiles")
      .update({ last_synced_at: null } as never)
      .eq("id", userId);

    return { ok: true, deleted };
  });
