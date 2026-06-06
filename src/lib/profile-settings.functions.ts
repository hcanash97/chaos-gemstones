import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Owner-only reads/writes for columns that are no longer SELECT-able by the
// authenticated role at the column-privilege level (markup/currency/sourcing
// on jeweller_profiles, and external feed credentials on dealer_profiles).
// All access goes through supabaseAdmin (service_role) scoped to context.userId.

export const getJewellerSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("jeweller_profiles")
      .select("markup_global, display_currency, feed_currency, sourcing_method")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const JewellerSettingsSchema = z.object({
  markup_global: z.number().min(1).max(10).optional(),
  display_currency: z.string().min(2).max(8).optional(),
  feed_currency: z.string().min(2).max(8).optional(),
  sourcing_method: z.string().max(200).nullable().optional(),
  ensure_row: z.boolean().optional(),
});

export const upsertJewellerSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => JewellerSettingsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { id: context.userId };
    if (data.markup_global !== undefined) patch.markup_global = data.markup_global;
    if (data.display_currency !== undefined) patch.display_currency = data.display_currency;
    if (data.feed_currency !== undefined) patch.feed_currency = data.feed_currency;
    if (data.sourcing_method !== undefined) patch.sourcing_method = data.sourcing_method;
    const { error } = await supabaseAdmin
      .from("jeweller_profiles")
      .upsert(patch, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDealerFeedConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("dealer_profiles")
      .select("external_feed_url, external_feed_method, external_feed_body")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const DealerFeedConfigSchema = z.object({
  external_feed_url: z.string().url().max(2048).nullable().optional(),
  external_feed_method: z.enum(["GET", "POST"]).nullable().optional(),
  external_feed_body: z.string().max(8000).nullable().optional(),
});

export const updateDealerFeedConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DealerFeedConfigSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.external_feed_url !== undefined) patch.external_feed_url = data.external_feed_url;
    if (data.external_feed_method !== undefined) patch.external_feed_method = data.external_feed_method;
    if (data.external_feed_body !== undefined) patch.external_feed_body = data.external_feed_body;
    const { error } = await supabaseAdmin
      .from("dealer_profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });