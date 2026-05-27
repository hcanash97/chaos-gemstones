import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Returns a short-lived signed URL for a stone's cert PDF stored in the
 * private `cert-scans` bucket. Only resolves when the stone is publicly
 * available so anonymous browsers can't enumerate dealer cert paths.
 */
export const getCertSignedUrl = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ stoneId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: stone } = await supabaseAdmin
      .from("stones")
      .select("cert_url, status")
      .eq("id", data.stoneId)
      .maybeSingle();
    if (!stone?.cert_url) return { url: null as string | null };
    if (stone.status !== "available") return { url: null };

    // cert_url may be a storage path (preferred) or a full https URL (legacy).
    if (/^https?:\/\//i.test(stone.cert_url)) {
      return { url: stone.cert_url };
    }
    const { data: signed, error } = await supabaseAdmin.storage
      .from("cert-scans")
      .createSignedUrl(stone.cert_url, 60 * 10);
    if (error) return { url: null };
    return { url: signed.signedUrl };
  });