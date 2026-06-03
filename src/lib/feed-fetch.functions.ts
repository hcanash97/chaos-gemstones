import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const target = new URL(data.url);
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      throw new Error("Only http(s) URLs are supported");
    }
    // Basic SSRF guard: block obviously private hostnames.
    const host = target.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "::1" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^fd[0-9a-f]{2}:/i.test(host) ||
      /^fe80:/i.test(host)
    ) {
      throw new Error("Private or local hosts are not allowed");
    }

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
        redirect: "follow",
      };
      if (data.method === "POST" && data.body) {
        (init.headers as Record<string, string>)["Content-Type"] = "application/json";
        init.body = data.body;
      }
      res = await fetch(target.toString(), init);
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
