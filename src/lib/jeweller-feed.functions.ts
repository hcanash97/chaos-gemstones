import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateApiKey, sha256 } from "@/lib/api-keys";
import { isJeweller } from "@/lib/auth.utils";

const selectionSchema = z.object({
  dealerId: z.string().uuid().optional(),
  stoneId: z.string().uuid().optional(),
  enabled: z.boolean(),
  selectionType: z.enum(["dealer_follow", "stone_pin"]),
});

export const getJewellerApiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    const [{ data: profile }, { data: key }, { data: selections }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, account_type, account_types, is_approved, company_name, full_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("api_keys")
        .select("id, key_prefix, is_active, last_used_at, created_at")
        .eq("jeweller_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("feed_selections")
        .select("selection_type, stone_id, dealer_id, markup_override, api_key_id"),
    ]);

    return {
      key: key ?? null,
      profile: profile ?? null,
      selections: selections ?? [],
    };
  });

export const generateJewellerApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, account_types, is_approved")
      .eq("id", userId)
      .single();

    if (!profile || !isJeweller(profile as any)) {
      throw new Error("Only jeweller accounts can generate API keys.");
    }

    if (!profile.is_approved) {
      throw new Error("Your account is pending approval.");
    }

    const raw = generateApiKey();
    const hash = await sha256(raw);
    const prefix = raw.slice(0, 12);

    const { error: deactivateError } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("jeweller_id", userId);

    if (deactivateError) {
      throw new Error(`Could not deactivate the previous API key: ${deactivateError.message}`);
    }

    const { data: inserted, error } = await supabase
      .from("api_keys")
      .insert({
        jeweller_id: userId,
        key_hash: hash,
        key_prefix: prefix,
        label: "Live feed",
        is_active: true,
      })
      .select("id, key_prefix, is_active, last_used_at, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      key: inserted,
      rawKey: raw,
    };
  });

export const getOrCreateActiveApiKeyId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, account_types, is_approved")
      .eq("id", userId)
      .single();

    if (!profile || !isJeweller(profile as any)) {
      throw new Error("Only jeweller accounts can manage feed selections.");
    }

    if (!profile.is_approved) {
      throw new Error("Your account is pending approval.");
    }

    const { data: existing } = await supabase
      .from("api_keys")
      .select("id")
      .eq("jeweller_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return { apiKeyId: existing.id, created: false };
    }

    const raw = generateApiKey();
    const hash = await sha256(raw);
    const prefix = raw.slice(0, 12);

    const { data: created, error } = await supabase
      .from("api_keys")
      .insert({
        jeweller_id: userId,
        key_hash: hash,
        key_prefix: prefix,
        label: "Live feed",
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !created) {
      throw new Error(error?.message ?? "Could not create an API key for feed selections.");
    }

    return { apiKeyId: created.id, created: true };
  });

export const toggleFeedSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => selectionSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { userId, supabase } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, account_types, is_approved")
      .eq("id", userId)
      .single();

    if (!profile || !isJeweller(profile as any)) {
      throw new Error("Only jeweller accounts can manage feed selections.");
    }

    if (!profile.is_approved) {
      throw new Error("Your account is pending approval.");
    }

    let { data: activeKey } = await supabase
      .from("api_keys")
      .select("id")
      .eq("jeweller_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeKey?.id) {
      const raw = generateApiKey();
      const hash = await sha256(raw);
      const prefix = raw.slice(0, 12);
      const { data: created, error: createdError } = await supabase
        .from("api_keys")
        .insert({
          jeweller_id: userId,
          key_hash: hash,
          key_prefix: prefix,
          label: "Live feed",
          is_active: true,
        })
        .select("id")
        .single();

      if (createdError || !created) {
        throw new Error(createdError?.message ?? "Could not prepare an API key for this feed.");
      }

      activeKey = created;
    }

    const column = data.selectionType === "dealer_follow" ? "dealer_id" : "stone_id";
    const value = data.selectionType === "dealer_follow" ? data.dealerId : data.stoneId;

    if (!value) {
      throw new Error("The selected item is missing its ID.");
    }

    const { data: existing } = await supabase
      .from("feed_selections")
      .select("id")
      .eq("api_key_id", activeKey.id)
      .eq("selection_type", data.selectionType)
      .eq(column, value)
      .maybeSingle();

    if (data.enabled) {
      if (existing?.id) return { ok: true };

      const payload = {
        api_key_id: activeKey.id,
        selection_type: data.selectionType,
        dealer_id: data.selectionType === "dealer_follow" ? value : null,
        stone_id: data.selectionType === "stone_pin" ? value : null,
      };

      const { error } = await supabase.from("feed_selections").insert(payload);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (!existing?.id) return { ok: true };

    const { error } = await supabase.from("feed_selections").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getApprovedDealersWithStoneCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, account_types")
      .eq("id", userId)
      .single();

    if (!profile || !isJeweller(profile as any)) {
      throw new Error("Only jeweller accounts can view approved dealers.");
    }

    const { data: dealers, error } = await supabaseAdmin
      .from("profiles")
      .select("id, company_name, full_name, country, dealer_profiles(*)")
      .eq("is_approved", true)
      .or("account_type.eq.dealer,account_types.cs.{dealer}");

    if (error) throw new Error(error.message);

    const dealerIds = (dealers ?? []).map((dealer: any) => dealer.id);
    const counts = new Map<string, number>();

    if (dealerIds.length) {
      const { data: stones, error: stonesError } = await supabaseAdmin
        .from("stones")
        .select("dealer_id")
        .in("dealer_id", dealerIds)
        .eq("status", "available")
        .eq("is_test", false);

      if (stonesError) throw new Error(stonesError.message);

      for (const row of stones ?? []) {
        counts.set(row.dealer_id, (counts.get(row.dealer_id) ?? 0) + 1);
      }
    }

    return (dealers ?? []).map((profile: any) => {
      const dp = profile.dealer_profiles?.[0];
      return {
        id: profile.id,
        slug: dp?.slug ?? `dealer-${profile.id.slice(0, 8)}`,
        specialities: dp?.specialities ?? [],
        profiles: {
          company_name: profile.company_name,
          country: profile.country,
          is_approved: true,
        },
        stoneCount: counts.get(profile.id) ?? 0,
      };
    });
  });