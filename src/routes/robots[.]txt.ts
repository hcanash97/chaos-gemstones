import { createFileRoute } from "@tanstack/react-router";

const ROBOTS = `User-agent: *
Allow: /

Disallow: /dashboard
Disallow: /admin
Disallow: /login
Disallow: /embed/
Disallow: /api/

Sitemap: https://chaosgemstones.com/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(ROBOTS, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
