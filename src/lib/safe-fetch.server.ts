// Manual-redirect fetch that re-validates each Location hop against an
// SSRF blocklist. Used by both feed-fetch (jeweller) and dealer-sync to
// stop attacker-controlled URLs from bouncing into private/internal hosts.

const MAX_REDIRECTS = 5;

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "::1" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^fd[0-9a-f]{2}:/i.test(h) ||
    /^fe80:/i.test(h)
  );
}

export function assertSafeUrl(urlStr: string): URL {
  const u = new URL(urlStr);
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Only http(s) URLs are supported");
  }
  if (isPrivateHost(u.hostname)) {
    throw new Error("Private or local hosts are not allowed");
  }
  return u;
}

export async function safeFetch(urlStr: string, init: RequestInit = {}): Promise<Response> {
  let current = assertSafeUrl(urlStr).toString();
  let body = init.body;
  let method = (init.method ?? "GET").toUpperCase();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, { ...init, method, body, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      const next = new URL(loc, current);
      assertSafeUrl(next.toString()); // re-validate post-redirect destination
      current = next.toString();
      // RFC 7231: 303 always becomes GET; 301/302 in practice convert non-GET to GET as well.
      if (res.status === 301 || res.status === 302 || res.status === 303) {
        method = "GET";
        body = undefined;
      }
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}