import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/docs/api")({
  component: ApiDocs,
  head: () => ({
    meta: [
      { title: "API & Embeds — Chaos" },
      { name: "description", content: "Embed your Chaos feed into any website — Shopify, Wix, Squarespace, Webflow, WordPress, or a custom site." },
      { property: "og:title", content: "Chaos API & Embed Docs" },
      { property: "og:description", content: "Drop-in widget, raw JSON feed, and iframe embed for every website builder." },
    ],
    links: [{ rel: "canonical", href: "/docs/api" }],
  }),
});

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border border-border bg-[var(--color-ink)] p-4 text-xs leading-relaxed text-[#e8edf3]">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          toast.success("Copied");
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-3 top-3 rounded-md border border-white/10 bg-white/5 p-1.5 text-white/70 hover:bg-white/10"
        aria-label="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ApiDocs() {
  const base = typeof window !== "undefined" ? window.location.origin : "https://chaos.app";
  const KEY = "YOUR_API_KEY";

  const snippetWidget = `<div id="chaos-feed"></div>
<script src="${base}/api/public/chaos.js" data-chaos-key="${KEY}"></script>`;

  const snippetIframe = `<iframe
  src="${base}/embed/${KEY}"
  style="width:100%; height:1200px; border:0;"
  loading="lazy"
  title="Chaos inventory"></iframe>`;

  const snippetCurl = `curl "${base}/api/public/feed?key=${KEY}"`;

  const snippetJs = `const res = await fetch("${base}/api/public/feed?key=${KEY}");
const { stones } = await res.json();
stones.forEach(s => {
  console.log(s.stone_type, s.carat_weight, s.retail_price);
});`;

  const snippetReact = `import { useEffect, useState } from "react";

export function ChaosFeed({ apiKey }) {
  const [stones, setStones] = useState([]);
  useEffect(() => {
    fetch(\`${base}/api/public/feed?key=\${apiKey}\`)
      .then(r => r.json()).then(d => setStones(d.stones));
  }, [apiKey]);
  return (
    <div className="grid grid-cols-3 gap-4">
      {stones.map(s => (
        <div key={s.id} className="border rounded p-3">
          <div>{s.carat_weight}ct {s.stone_type}</div>
          <div>$\{s.retail_price?.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Jewellers</div>
          <h1 className="mt-2 font-serif text-5xl">Embed your Chaos feed</h1>
          <p className="mt-3 max-w-2xl text-base opacity-80">
            Show live inventory from the dealers you follow on your own website — Shopify, Wix,
            Squarespace, Webflow, WordPress, or anything custom. Prices are auto-marked-up using
            your global or per-dealer markup.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard/jeweller/api">
              <Button className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                Get your API key
              </Button>
            </Link>
            <a href="#platforms" className="rounded-md border border-white/20 px-4 py-2 text-sm hover:bg-white/5">
              Jump to platform guides
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-serif text-3xl">Three ways to integrate</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick the one that matches your skill level.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { tag: "Easiest", title: "Drop-in widget", body: "Paste two lines of HTML. Renders a styled grid in any site that lets you add custom code." },
            { tag: "Code-free", title: "iframe embed", body: "Paste an <iframe>. Works in Wix, Squarespace, Webflow content blocks, and HTML elements." },
            { tag: "For developers", title: "JSON API", body: "Hit one endpoint, render the stones however you like. Full control over markup and styling." },
          ].map((c) => (
            <div key={c.title} className="rounded-lg border border-border bg-card p-6">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)]">{c.tag}</div>
              <div className="mt-2 font-serif text-xl">{c.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <Tabs defaultValue="widget" className="w-full">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="widget">Drop-in widget</TabsTrigger>
            <TabsTrigger value="iframe">iframe</TabsTrigger>
            <TabsTrigger value="json">JSON API</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
          </TabsList>

          <TabsContent value="widget" className="mt-6 space-y-3">
            <h3 className="font-serif text-xl">Drop-in widget</h3>
            <p className="text-sm text-muted-foreground">
              Paste this anywhere on your page. The script finds the <code>#chaos-feed</code> div
              and renders your inventory. No build step, no framework required.
            </p>
            <CopyBlock code={snippetWidget} />
            <p className="text-xs text-muted-foreground">
              Optional: change the mount point with <code>data-target=".my-class"</code>.
            </p>
          </TabsContent>

          <TabsContent value="iframe" className="mt-6 space-y-3">
            <h3 className="font-serif text-xl">iframe embed</h3>
            <p className="text-sm text-muted-foreground">
              The simplest option for no-code site builders. The embed page is responsive and adapts
              to any width.
            </p>
            <CopyBlock code={snippetIframe} />
          </TabsContent>

          <TabsContent value="json" className="mt-6 space-y-3">
            <h3 className="font-serif text-xl">JSON feed</h3>
            <p className="text-sm text-muted-foreground">
              Authenticated by your API key as a query parameter. CORS is enabled, so you can call
              it directly from the browser.
            </p>
            <CopyBlock code={snippetCurl} />
            <CopyBlock code={snippetJs} />
            <p className="text-xs text-muted-foreground">
              Response shape:{" "}
              <code>{"{ count, last_updated, stones: [{ id, stone_type, shape, carat_weight, origin, cert_lab, retail_price, markup_applied, stone_images, ... }] }"}</code>
            </p>
          </TabsContent>

          <TabsContent value="react" className="mt-6 space-y-3">
            <h3 className="font-serif text-xl">React component</h3>
            <CopyBlock code={snippetReact} />
          </TabsContent>
        </Tabs>
      </section>

      <section id="platforms" className="bg-[color-mix(in_oklab,var(--color-gold)_8%,var(--color-sand))]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-serif text-3xl">Platform guides</h2>
          <p className="mt-1 text-sm text-muted-foreground">Step-by-step for the major website builders.</p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Platform
              title="Shopify"
              steps={[
                "Admin → Online Store → Themes → Edit code.",
                "Open the page or section where you want the feed.",
                "Paste the Drop-in widget snippet.",
                "Save. Refresh the live page.",
              ]}
              note="Currently render-only. A full product-sync app is coming — let us know if you need it."
            />
            <Platform
              title="Wix"
              steps={[
                "Editor → Add → Embed Code → Embed HTML.",
                "Paste the iframe snippet.",
                "Drag the corner to size it. Publish.",
              ]}
              note="Wix sandboxes inline scripts, so the iframe option is more reliable than the widget."
            />
            <Platform
              title="Squarespace"
              steps={[
                "Edit page → Add Block → Code.",
                "Paste either the widget or iframe snippet.",
                "Save and publish.",
              ]}
            />
            <Platform
              title="Webflow"
              steps={[
                "Add an Embed element where you want the feed.",
                "Paste the Drop-in widget snippet.",
                "Publish.",
              ]}
            />
            <Platform
              title="WordPress"
              steps={[
                "Edit page → add a Custom HTML block.",
                "Paste the Drop-in widget snippet.",
                "Update.",
              ]}
              note="On classic editor, switch to Text mode before pasting."
            />
            <Platform
              title="Custom site"
              steps={[
                "Use the JSON feed for full control.",
                "Or paste the widget — it works in any HTML.",
                "Set caching to whatever matches your traffic.",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-serif text-3xl">Notes</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>• Replace <code>YOUR_API_KEY</code> with the key from your <Link to="/dashboard/jeweller/api" className="text-foreground underline">API dashboard</Link>.</li>
          <li>• Prices in the response are wholesale × markup. Set your global markup or per-dealer override on the Markup page.</li>
          <li>• Stones marked sold or reserved are removed automatically.</li>
          <li>• The feed is rate-limited and cached for 5 minutes at the edge.</li>
          <li>• Treat your API key like a password. Rotate it from the API dashboard if it's exposed.</li>
        </ul>
      </section>

      <SiteFooter />
    </div>
  );
}

function Platform({ title, steps, note }: { title: string; steps: string[]; note?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-serif text-xl">{title}</h3>
      <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {steps.map((s, i) => (
          <li key={i}><span className="mr-2 text-[var(--color-gold)]">{i + 1}.</span>{s}</li>
        ))}
      </ol>
      {note && <p className="mt-3 text-xs text-muted-foreground italic">{note}</p>}
    </div>
  );
}