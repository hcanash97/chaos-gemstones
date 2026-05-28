import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { STONE_FIELDS, CLARITY_VALUES, CERT_LABS } from "@/lib/import-fields";

export const Route = createFileRoute("/docs/dealer-api")({
  component: DealerApiDocs,
  head: () => ({
    meta: [
      { title: "Dealer Write API — Chaos" },
      { name: "description", content: "Programmatically create, update, and remove stone listings on Chaos via REST API." },
    ],
    links: [{ rel: "canonical", href: "/docs/dealer-api" }],
  }),
});

const BASE = "https://chaosgemstones.com";

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-[var(--color-ink)] p-4 text-xs leading-relaxed text-[#e8edf3]">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({ method, path, desc, req, res, curl, js }: {
  method: string; path: string; desc: string; req?: string; res: string; curl: string; js: string;
}) {
  return (
    <div className="mt-8 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="rounded bg-[var(--color-gold)]/15 px-2 py-0.5 font-mono text-xs uppercase text-[var(--color-gold)]">{method}</span>
        <code className="text-sm">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      {req && (<><h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request body</h4><Code>{req}</Code></>)}
      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Response</h4><Code>{res}</Code>
      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">curl</h4><Code>{curl}</Code>
      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">JavaScript (fetch)</h4><Code>{js}</Code>
    </div>
  );
}

function DealerApiDocs() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Dealers</div>
          <h1 className="mt-2 font-serif text-5xl">Dealer Write API</h1>
          <p className="mt-3 max-w-2xl text-base opacity-80">
            Programmatically create, update, and remove stone listings on Chaos without using the
            dashboard. Ideal for syncing from your existing inventory management system.
          </p>
          <div className="mt-6">
            <Link to="/dashboard/dealer/api" className="rounded-md bg-[var(--color-gold)] px-4 py-2 text-sm text-[var(--color-gold-foreground)]">
              Generate your API key
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
          This API is for <strong>dealer accounts</strong> only. If you are a jeweller looking to
          embed stone feeds into your website, see the <Link to="/docs/api" className="underline">Jeweller API docs</Link>.
        </div>

        <h2 className="mt-12 font-serif text-3xl">Authentication</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a write API key from your <Link to="/dashboard/dealer/api" className="underline">Developer API dashboard</Link>.
          Pass it as a Bearer token in the <code>Authorization</code> header on every request.
        </p>
        <Code>{`Authorization: Bearer chaos_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
        <p className="mt-2 text-xs text-muted-foreground">
          Treat the key like a password. Rotate it from the dashboard if it leaks.
        </p>

        <h2 className="mt-12 font-serif text-3xl">Rate limits</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          120 requests per minute per API key. Exceeded requests receive HTTP 429 with a
          <code> Retry-After</code> header and body <code>{`{"error":"Rate limit exceeded","retry_after":60}`}</code>.
        </p>

        <h2 className="mt-12 font-serif text-3xl">Endpoints</h2>

        <Endpoint
          method="POST" path="/api/dealer/v1/stones"
          desc="Create a new stone. Required: stone_type, shape, carat_weight, wholesale_price_usd."
          req={`{
  "stone_type": "diamond",
  "shape": "round",
  "carat_weight": 1.05,
  "wholesale_price_usd": 4200,
  "colour_grade": "F",
  "clarity_grade": "VS1",
  "cert_lab": "GIA",
  "cert_number": "2191234567"
}`}
          res={`201 Created
{ "id": "uuid", "stone_type": "diamond", ... }

422 Unprocessable Entity
{ "error": "Validation failed", "errors": [{ "field": "carat_weight", "message": "Must be between 0.01 and 100" }] }`}
          curl={`curl -X POST ${BASE}/api/dealer/v1/stones \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"stone_type":"diamond","shape":"round","carat_weight":1.05,"wholesale_price_usd":4200}'`}
          js={`await fetch("${BASE}/api/dealer/v1/stones", {
  method: "POST",
  headers: { Authorization: "Bearer YOUR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ stone_type: "diamond", shape: "round", carat_weight: 1.05, wholesale_price_usd: 4200 }),
});`}
        />

        <Endpoint
          method="GET" path="/api/dealer/v1/stones"
          desc="List your stones. Query params: status (available|reserved|sold|all, default all), limit (max 200, default 50), offset."
          res={`{ "total_count": 124, "limit": 50, "offset": 0, "stones": [ { ... } ] }`}
          curl={`curl "${BASE}/api/dealer/v1/stones?status=available&limit=50" -H "Authorization: Bearer YOUR_KEY"`}
          js={`const res = await fetch("${BASE}/api/dealer/v1/stones?limit=100", { headers: { Authorization: "Bearer YOUR_KEY" } });
const { stones } = await res.json();`}
        />

        <Endpoint
          method="GET" path="/api/dealer/v1/stones/:id"
          desc="Get a single stone by ID. Must belong to your account."
          res={`200 OK — full stone object
404 Not Found — { "error": "Stone not found" }`}
          curl={`curl ${BASE}/api/dealer/v1/stones/STONE_ID -H "Authorization: Bearer YOUR_KEY"`}
          js={`const res = await fetch("${BASE}/api/dealer/v1/stones/STONE_ID", { headers: { Authorization: "Bearer YOUR_KEY" } });`}
        />

        <Endpoint
          method="PUT" path="/api/dealer/v1/stones/:id"
          desc="Partial update — only fields you include are changed. Returns the updated stone."
          req={`{ "wholesale_price_usd": 4500, "status": "reserved" }`}
          res={`200 OK — updated stone object`}
          curl={`curl -X PUT ${BASE}/api/dealer/v1/stones/STONE_ID \\
  -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \\
  -d '{"wholesale_price_usd": 4500}'`}
          js={`await fetch("${BASE}/api/dealer/v1/stones/STONE_ID", {
  method: "PUT",
  headers: { Authorization: "Bearer YOUR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ wholesale_price_usd: 4500 }),
});`}
        />

        <Endpoint
          method="DELETE" path="/api/dealer/v1/stones/:id"
          desc="Delete a stone permanently. Must belong to your account."
          res={`{ "deleted": true }`}
          curl={`curl -X DELETE ${BASE}/api/dealer/v1/stones/STONE_ID -H "Authorization: Bearer YOUR_KEY"`}
          js={`await fetch("${BASE}/api/dealer/v1/stones/STONE_ID", { method: "DELETE", headers: { Authorization: "Bearer YOUR_KEY" } });`}
        />

        <Endpoint
          method="POST" path="/api/dealer/v1/stones/:id/mark-sold"
          desc="Mark a stone as sold. Optionally records an order row. Removes the stone from all jeweller feeds."
          req={`{ "sale_price_usd": 1200, "notes": "sold to UK buyer", "jeweller_id": "optional-uuid" }`}
          res={`200 OK — updated stone with status: "sold"`}
          curl={`curl -X POST ${BASE}/api/dealer/v1/stones/STONE_ID/mark-sold \\
  -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \\
  -d '{"sale_price_usd": 1200}'`}
          js={`await fetch("${BASE}/api/dealer/v1/stones/STONE_ID/mark-sold", {
  method: "POST",
  headers: { Authorization: "Bearer YOUR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ sale_price_usd: 1200 }),
});`}
        />

        <Endpoint
          method="POST" path="/api/dealer/v1/stones/bulk"
          desc="Bulk create or update — up to 200 stones per request. Existing stones are matched by cert_number and updated; new ones are created."
          req={`[
  { "stone_type": "diamond", "shape": "round", "carat_weight": 1.05, "wholesale_price_usd": 4200, "cert_number": "2191234567", "cert_lab": "GIA" },
  { "stone_type": "sapphire", "shape": "oval", "carat_weight": 2.10, "wholesale_price_usd": 3800 }
]`}
          res={`{ "created": 45, "updated": 12, "errors": [ { "row": 3, "field": "carat_weight", "message": "Must be between 0.01 and 100" } ] }`}
          curl={`curl -X POST ${BASE}/api/dealer/v1/stones/bulk \\
  -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \\
  --data @stones.json`}
          js={`// Sync your external inventory once a day:
const stones = await loadFromYourSystem(); // [{stone_type, shape, carat_weight, wholesale_price_usd, cert_number, ...}]
const res = await fetch("${BASE}/api/dealer/v1/stones/bulk", {
  method: "POST",
  headers: { Authorization: "Bearer YOUR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify(stones),
});
const { created, updated, errors } = await res.json();`}
        />

        <h2 className="mt-12 font-serif text-3xl">Field reference</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          All fields accepted by the create / update / bulk endpoints. Required fields are marked.
        </p>
        <div className="mt-4 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Field</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Required</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {STONE_FIELDS.map((f) => (
                <tr key={f.key} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{f.key}</td>
                  <td className="px-3 py-2 text-xs">{f.type}</td>
                  <td className="px-3 py-2 text-xs">{f.required ? "yes" : "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {f.enumValues ? `One of: ${f.enumValues.join(", ")}` : f.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Enum reference — clarity_grade: {CLARITY_VALUES.join(", ")}. cert_lab: {CERT_LABS.join(", ")}.
          listing_type: single | parcel.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}