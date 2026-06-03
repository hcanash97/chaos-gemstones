import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  email: z.string().email().max(255),
});

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const { error } = await supabaseAdmin
      .from("waitlist")
      .insert({ email } as never);
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const getWaitlistCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("waitlist")
      .select("id", { count: "exact", head: true });
    return { count: count ?? 0 };
  });