import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const accountSettingsSchema = z.object({
  full_name: z.string().max(120).nullable(),
  company_name: z.string().max(160).nullable(),
  website: z.string().max(300).nullable(),
  country: z.string().max(100).nullable(),
  city: z.string().max(100).nullable(),
  phone: z.string().max(80).nullable(),
});

export const updateMyAccountSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSettingsSchema.parse(input))
  .handler(async ({ context, data }) => {
    const payload = {
      full_name: data.full_name?.trim() || null,
      company_name: data.company_name?.trim() || null,
      website: data.website?.trim() || null,
      country: data.country?.trim() || null,
      city: data.city?.trim() || null,
      phone: data.phone?.trim() || null,
    };

    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(payload)
      .eq("id", context.userId)
      .select("id, full_name, company_name, website, country, city, phone")
      .single();

    if (error) throw new Error(error.message);
    return { profile: row };
  });

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [
      { data: profile },
      { data: jeweller },
      { data: dealer },
      { data: apiKeys },
      { data: enquiriesFrom },
      { data: enquiriesTo },
      { data: ordersAsJeweller },
      { data: ordersAsDealer },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("jeweller_profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("dealer_profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("api_keys")
        .select("id, key_type, key_prefix, label, is_active, last_used_at, created_at, jeweller_id")
        .eq("jeweller_id", userId),
      supabase.from("enquiries").select("*").eq("from_jeweller_id", userId),
      supabase.from("enquiries").select("*").eq("to_dealer_id", userId),
      supabase.from("orders").select("*").eq("jeweller_id", userId),
      supabase.from("orders").select("*").eq("dealer_id", userId),
    ]);

    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile,
      jeweller_profile: jeweller,
      dealer_profile: dealer,
      api_keys: apiKeys ?? [],
      enquiries: [...(enquiriesFrom ?? []), ...(enquiriesTo ?? [])],
      orders: [...(ordersAsJeweller ?? []), ...(ordersAsDealer ?? [])],
    };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // 1. Soft-delete profile
    await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", userId);

    // 2. Remove this user's API keys
    await supabaseAdmin.from("api_keys").delete().eq("jeweller_id", userId);

    // 3. If dealer, mark all their stones as inactive (archived)
    await supabaseAdmin
      .from("stones")
      .update({ feed_inactive: true, status: "sold" })
      .eq("dealer_id", userId);

    // 4. Anonymise enquiry messages from this user
    await supabaseAdmin
      .from("enquiry_messages")
      .update({ message: "[removed]" })
      .eq("sender_id", userId);

    // 5. Delete the auth user
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true };
  });
