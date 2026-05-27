import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { generateApiKey, sha256 } from "@/lib/api-keys";

export const Route = createFileRoute("/dashboard/jeweller/api")({
  component: ApiPage,
});

function ApiPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  if (profile?.account_type !== "jeweller") return <div>Jewellers only.</div>;

  const { data: key, refetch } = useQuery({
    queryKey: ["api-key", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("api_keys")
        .select("id, key_prefix, is_active, last_used_at, created_at")
        .eq("jeweller_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: preview } = useQuery({
    queryKey: ["feed-preview", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [j, sels] = await Promise.all([
        supabase.from("jeweller_profiles").select("markup_global").eq("id", user!.id).maybeSingle(),
        supabase.from("feed_selections").select("selection_type, stone_id, dealer_id, markup_override"),
      ]);
      const g = Number(j.data?.markup_global ?? 2);
      const follows = (sels.data ?? []).filter((s) => s.selection_type === "dealer_follow");
      const pins = (sels.data ?? []).filter((s) => s.selection_type === "stone_pin");
      const stones: any[] = [];
      if (follows.length) {
        const { data } = await supabase
          .from("stones")
          .select("id, stone_type, shape, carat_weight, wholesale_price_usd, dealer_id")
          .in("dealer_id", follows.map((f) => f.dealer_id as string))
          .eq("status", "available")
          .limit(10);
        (data ?? []).forEach((s: any) => {
          const o = follows.find((f) => f.dealer_id === s.dealer_id)?.markup_override;
          const m = o != null ? Number(o) : g;
          stones.push({ ...s, retail: s.wholesale_price_usd ? Number(s.wholesale_price_usd) * m : null });
        });
      }
      if (pins.length && stones.length < 10) {
        const { data } = await supabase
          .from("stones")
          .select("id, stone_type, shape, carat_weight, wholesale_price_usd")
          .in("id", pins.map((p) => p.stone_id as string))
          .eq("status", "available")
          .limit(10 - stones.length);
        (data ?? []).forEach((s: any) => {
          const o = pins.find((p) => p.stone_id === s.id)?.markup_override;
          const m = o != null ? Number(o) : g;
          stones.push({ ...s, retail: s.wholesale_price_usd ? Number(s.wholesale_price_usd) * m : null });
        });
      }
      return stones.slice(0, 10);
    },
  });

  async function generate() {
    if (!user) return;
    setGenerating(true);
    // Deactivate existing
    await supabase.from("api_keys").update({ is_active: false }).eq("jeweller_id", user.id);
    const raw = generateApiKey();
    const hash = await sha256(raw);
    const prefix = raw.slice(0, 12);
    const { error } = await supabase.from("api_keys").insert({
      jeweller_id: user.id,
      key_hash: hash,
      key_prefix: prefix,
      label: "Live feed",
      is_active: true,
    });
    setGenerating(false);
    if (error) return toast.error(error.message);
    setRevealed(raw);
    refetch();
    qc.invalidateQueries({ queryKey: ["jeweller-overview"] });
    toast.success("API key generated. Copy it now — it will not be shown again.");
  }

  const keyForSnippet = revealed ?? (key?.key_prefix ? `${key.key_prefix}…YOUR_FULL_KEY` : "YOUR_API_KEY");
  const feedUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/feed?key=${keyForSnippet}` : `/api/public/feed?key=${keyForSnippet}`;

  const shopifyEmbed = `<div id="chaos-feed" class="chaos-grid"></div>
<style>
  .chaos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
  .chaos-card { border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; background: #fff; }
  .chaos-card img { width: 100%; aspect-ratio: 1; object-fit: cover; }
  .chaos-body { padding: 0.75rem 1rem 1rem; }
  .chaos-title { font-family: serif; font-size: 1rem; margin: 0 0 0.25rem; text-transform: capitalize; }
  .chaos-meta { color: #777; font-size: 0.75rem; }
  .chaos-price { margin-top: 0.5rem; font-weight: 600; font-family: ui-monospace, monospace; }
</style>
<script>
(async function() {
  const res = await fetch("${feedUrl}");
  const { stones } = await res.json();
  const root = document.getElementById('chaos-feed');
  root.innerHTML = stones.map(function(s) {
    var img = (s.stone_images && s.stone_images[0] && s.stone_images[0].storage_url) || '';
    var ct = s.carat_weight ? (Number(s.carat_weight).toFixed(2) + 'ct ') : '';
    return '<div class="chaos-card">' +
      (img ? '<img src="' + img + '" alt="">' : '') +
      '<div class="chaos-body">' +
        '<div class="chaos-title">' + ct + (s.shape || '') + ' ' + s.stone_type + '</div>' +
        '<div class="chaos-meta">' + (s.cert_lab || '') + (s.country_of_origin ? ' · ' + s.country_of_origin : '') + '</div>' +
        '<div class="chaos-price">$' + Number(s.retail_price || 0).toLocaleString() + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
})();
</script>`;

  function copyEmbed() {
    navigator.clipboard.writeText(shopifyEmbed);
    toast.success("Embed code copied to clipboard");
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">API Feed</h1>
      <p className="text-sm text-muted-foreground">Stream your curated catalogue into any website.</p>

      <div className="mt-6 rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Your API key</div>
            <div className="mt-1 font-mono">
              {revealed ?? (key ? `${key.key_prefix ?? "chaos_"}${"•".repeat(40)}` : "No key yet")}
            </div>
            {key?.last_used_at && (
              <div className="mt-1 text-xs text-muted-foreground">
                Last used {new Date(key.last_used_at).toLocaleString()}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {revealed && (
              <>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(revealed); toast.success("Copied"); }}>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRevealed(null)}>
                  <EyeOff className="mr-1 h-3 w-3" /> Hide
                </Button>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                  <RefreshCw className="mr-1 h-3 w-3" /> {key ? "Regenerate" : "Generate"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Generate a new API key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {key ? "This will deactivate your current key. Any websites using it will stop working until updated." : "A new API key will be generated. Copy it immediately — it cannot be retrieved later."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={generate} disabled={generating}>
                    {generating ? "Generating…" : "Generate"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <h2 className="mt-8 font-serif text-xl">Integration snippets</h2>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {revealed
            ? "Snippets use your live API key — copy now, it won't be shown again."
            : key
            ? "Snippets show your key prefix. Regenerate above to reveal the full key."
            : "Generate an API key to populate the snippets below."}
        </p>
        <Button size="sm" variant="outline" onClick={copyEmbed}>
          <Copy className="mr-1 h-3 w-3" /> Copy embed code
        </Button>
      </div>
      <Tabs defaultValue="js" className="mt-3">
        <TabsList>
          <TabsTrigger value="js">JavaScript</TabsTrigger>
          <TabsTrigger value="php">PHP</TabsTrigger>
          <TabsTrigger value="liquid">Shopify (Liquid)</TabsTrigger>
        </TabsList>
        <TabsContent value="js">
          <pre className="overflow-x-auto rounded-md border border-border bg-foreground/95 p-4 text-xs text-background">
{`// Fetch your CHAOS feed
const res = await fetch("${feedUrl}");
const { stones } = await res.json();
stones.forEach(stone => {
  console.log(stone.stone_type, "$" + stone.retail_price);
});`}
          </pre>
        </TabsContent>
        <TabsContent value="php">
          <pre className="overflow-x-auto rounded-md border border-border bg-foreground/95 p-4 text-xs text-background">
{`<?php
$response = file_get_contents("${feedUrl}");
$feed = json_decode($response, true);
foreach ($feed['stones'] as $stone) {
  echo $stone['stone_type'] . ' — $' . $stone['retail_price'] . "\\n";
}`}
          </pre>
        </TabsContent>
        <TabsContent value="liquid">
          <pre className="overflow-x-auto rounded-md border border-border bg-foreground/95 p-4 text-xs text-background">
{`{% comment %} Server-side fetch via Shopify section settings {% endcomment %}
<div id="chaos-feed"></div>
<script>
  fetch("${feedUrl}")
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('chaos-feed');
      el.innerHTML = data.stones.map(s =>
        \`<div class="stone">\${s.stone_type} – $\${s.retail_price}</div>\`
      ).join('');
    });
</script>`}
          </pre>
        </TabsContent>
      </Tabs>

      <h2 className="mt-8 font-serif text-xl">Live preview (first 10 stones)</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Stone</th>
              <th className="px-4 py-2 text-right">Wholesale</th>
              <th className="px-4 py-2 text-right">Retail (your price)</th>
            </tr>
          </thead>
          <tbody>
            {(preview ?? []).map((s: any) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2 capitalize">{s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : ""}{s.shape} {s.stone_type}</td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground">${Number(s.wholesale_price_usd ?? 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">${s.retail ? Number(s.retail).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!preview?.length && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">No stones in your feed yet — follow some vendors first.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}