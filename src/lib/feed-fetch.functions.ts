import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { safeFetch, assertSafeUrl } from "@/lib/safe-fetch.server";

const InputSchema = z.object({
  url: z.string().url().max(2048),
  method: z.enum(["GET", "POST"]).default("GET"),
  body: z.string().max(4000).optional(),
});

export type FeedFetchResult = {
  contentType: string;
  format: "csv" | "json" | "unknown";
  body: string;
  bytes: number;
};

export const fetchExternalFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<FeedFetchResult> => {
    const target = assertSafeUrl(data.url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let res: Response;
    try {
      const init: RequestInit = {
        method: data.method,
        headers: {
          "User-Agent": "Chaos-Feed-Importer/1.0",
          Accept: "text/csv, application/json;q=0.9, */*;q=0.5",
        },
        signal: controller.signal,
      };
      if (data.method === "POST" && data.body) {
        (init.headers as Record<string, string>)["Content-Type"] = "application/json";
        init.body = data.body;
      }
      // safeFetch enforces redirect: 'manual' and re-validates each hop
      // against the private-IP blocklist to defeat redirect-based SSRF.
      res = await safeFetch(target.toString(), init);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`Feed returned ${res.status}`);
    const text = await res.text();
    if (text.length > 10 * 1024 * 1024) throw new Error("Feed too large (>10MB)");
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    let format: FeedFetchResult["format"] = "unknown";
    if (contentType.includes("json") || text.trim().startsWith("[") || text.trim().startsWith("{")) format = "json";
    else if (
      contentType.includes("csv") ||
      contentType.includes("text/plain") ||
      /,|\t/.test(text.split("\n")[0] || "")
    )
      format = "csv";
    return { contentType, format, body: text, bytes: text.length };
  });
