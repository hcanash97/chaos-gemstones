import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Copy, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller as checkJ } from "@/lib/auth.utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getJewellerApiStatus, generateJewellerApiKey } from "@/lib/jeweller-feed.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/jeweller/api")({
  component: ApiPage,
});

function mapError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("pending approval") || lower.includes("must be approved")) {
    return "Your account must be approved before you can generate an API key. Contact enquiries@chaosgemstones.com if you have been waiting more than 24 hours.";
  }
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("violates")) {
    return `Permission denied while saving your API key: ${message}`;
  }
  return message;
}

function ApiPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getJewellerApiStatus);
  const createKey = useServerFn(generateJewellerApiKey);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  const isJeweller = checkJ(profile);

  const { data: status, refetch } = useQuery({
    queryKey: ["jeweller-api-status", user?.id],
    enabled: !!user?.id && isJeweller,
    queryFn: () => fetchStatus(),
  });

  const { data: preview } = useQuery({
    queryKey: ["feed-preview", user?.id, status?.selections?.length ?? 0],
    enabled: !!user?.id && isJeweller,
    queryFn: async () => {
      const selections = status?.selections ?? [];
      const [j, sels] = await Promise.all([
        supabase.from("jeweller_profiles").select("markup_global").eq("id", user!.id).maybeSingle(),
        Promise.resolve({ data: selections }),
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

  const activeKey = status?.key ?? null;
  const approvalCopy = status?.profile?.is_approved
    ? "Approved"
    : "Pending";
  const hasKeyCopy = activeKey ? "Key exists" : "No API key yet";
  const keyForSnippet = revealed ?? (activeKey?.key_prefix ? `${activeKey.key_prefix}…YOUR_FULL_KEY` : "YOUR_API_KEY");
  const feedUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/feed?key=${keyForSnippet}` : `/api/public/feed?key=${keyForSnippet}`;

  const shopifyEmbed = useMemo(() => `<div id="chaos-feed" class="chaos-grid"></div>
<script>
(async function() {
  const res = await fetch("${feedUrl}");
  const data = await res.json();
  const stones = data.stones || [];
  const root = document.getElementById('chaos-feed');
  root.innerHTML = stones.map(function(s) {
    return '<div>' + s.stone_type + ' – $' + Number(s.retail_price || 0).toLocaleString() + '</div>';
  }).join('');
})();
</script>`, [feedUrl]);

  async function generate() {
    setGenerating(true);
    setInlineError(null);
    try {
      const result = await createKey();
      setRevealed(result.rawKey);
      await refetch();
      qc.invalidateQueries({ queryKey: ["jeweller-overview"] });
      const res = await fetch(`/api/public/feed?key=${encodeURIComponent(result.rawKey)}`);
      const body = await res.json();
      if (!res.ok || !body || typeof body !== "object" || !Array.isArray(body.stones)) {
        throw new Error("Feed endpoint did not return valid JSON.");
      }
      toast.success("API key generated.");
      if (typeof window !== "undefined" && !localStorage.getItem("chaos-referral-nudge-shown")) {
        setReferralOpen(true);
        localStorage.setItem("chaos-referral-nudge-shown", "1");
      }
    } catch (error) {
      const message = mapError(error instanceof Error ? error.message : "Server error");
      setInlineError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  if (!isJeweller) return <div>Jewellers only.</div>;

  return (
    <div>
      <ReferralDialog open={referralOpen} onOpenChange={setReferralOpen} />
      <h1 className="font-serif text-3xl">API Feed</h1>
      <p className="text-sm text-muted-foreground">Stream your curated catalogue into any website.</p>

      <HelpPanel feedUrl={feedUrl} hasKey={!!activeKey} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4 text-sm"><div className="text-xs text-muted-foreground">Approval status</div><div className="mt-1 font-medium">{approvalCopy}</div></div>
        <div className="rounded-md border border-border bg-card p-4 text-sm"><div className="text-xs text-muted-foreground">API key status</div><div className="mt-1 font-medium">{hasKeyCopy}</div></div>
      </div>
      {!status?.profile?.is_approved && (
        <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
          Your account must be approved before you can generate an API key. Contact enquiries@chaosgemstones.com if you have been waiting more than 24 hours.
        </div>
      )}
      {inlineError && <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">{inlineError}</div>}

      <Link to="/docs/api" className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--color-gold)] hover:underline">
        <BookOpen className="h-3.5 w-3.5" />
        Full embed guide
      </Link>

      <div className="mt-6 rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your API key</div>
            <div className="mt-1 font-mono text-sm text-foreground">{revealed ?? (activeKey ? `${activeKey.key_prefix ?? "chaos_"}${"•".repeat(40)}` : "No key yet")}</div>
            {activeKey?.last_used_at && <div className="mt-1 text-xs text-muted-foreground">Last used {new Date(activeKey.last_used_at).toLocaleString()}</div>}
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
                <Button size="sm" disabled={!status?.profile?.is_approved} className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
                  <RefreshCw className="mr-1 h-3 w-3" /> {activeKey ? "Regenerate" : "Generate"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Generate a new API key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {activeKey ? "This will deactivate your current key." : "A new API key will be generated. Copy it immediately — it cannot be retrieved later."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={generate} disabled={generating}>{generating ? "Generating…" : "Generate"}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl">Integration snippets</h2>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shopifyEmbed); toast.success("Embed code copied"); }}>
          <Copy className="mr-1 h-3 w-3" /> Copy embed code
        </Button>
      </div>
      <Tabs defaultValue="js" className="mt-3">
        <TabsList>
          <TabsTrigger value="js">JavaScript</TabsTrigger>
          <TabsTrigger value="php">PHP</TabsTrigger>
          <TabsTrigger value="liquid">Shopify</TabsTrigger>
        </TabsList>
        <TabsContent value="js"><pre className="overflow-x-auto rounded-md border border-border bg-foreground/95 p-4 text-xs text-background">{`const res = await fetch("${feedUrl}");\nconst { stones } = await res.json();\nstones.forEach((stone) => console.log(stone.stone_type, "$" + stone.retail_price));`}</pre></TabsContent>
        <TabsContent value="php"><pre className="overflow-x-auto rounded-md border border-border bg-foreground/95 p-4 text-xs text-background">{`<?php\n$data = json_decode(file_get_contents("${feedUrl}"), true);\nforeach (($data['stones'] ?? []) as $stone) {\n  echo $stone['stone_type'] . ' — $' . $stone['retail_price'] . "\\n";\n}`}</pre></TabsContent>
        <TabsContent value="liquid"><pre className="overflow-x-auto rounded-md border border-border bg-foreground/95 p-4 text-xs text-background">{shopifyEmbed}</pre></TabsContent>
      </Tabs>

      <h2 className="mt-8 font-serif text-xl">Live preview (first 10 stones)</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr><th className="px-4 py-2 text-left">Stone</th><th className="px-4 py-2 text-right">Wholesale</th><th className="px-4 py-2 text-right">Retail</th></tr></thead>
          <tbody>
            {(preview ?? []).map((s: any) => <tr key={s.id} className="border-t border-border"><td className="px-4 py-2 capitalize">{s.carat_weight ? `${Number(s.carat_weight).toFixed(2)}ct ` : ""}{s.shape} {s.stone_type}</td><td className="px-4 py-2 text-right font-mono text-muted-foreground">${Number(s.wholesale_price_usd ?? 0).toLocaleString()}</td><td className="px-4 py-2 text-right font-mono font-semibold">{s.retail ? `$${Number(s.retail).toLocaleString()}` : "—"}</td></tr>)}
            {!preview?.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">No stones in your feed yet — follow some vendors first.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReferralDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const message =
    "I just connected my website to Chaos Gemstones — it's a B2B marketplace for verified independent dealers in Jaipur, Bangkok and Sri Lanka. Worth a look if you're looking for a better way to source: https://chaosgemstones.com";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Your feed is live</DialogTitle>
          <DialogDescription>
            Most jewellers on Chaos found us through a peer. If you know a colleague who'd benefit, sharing
            the platform takes 10 seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
          {message}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Maybe later</Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(message);
              toast.success("Copied — paste it anywhere");
            }}
          >
            <Copy className="mr-1 h-3 w-3" /> Copy message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HelpPanel({ feedUrl, hasKey }: { feedUrl: string; hasKey: boolean }) {
  const [open, setOpen] = useState(!hasKey);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-4 rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium">
        <span>How does this work?</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-[var(--color-gold)]/30 px-4 py-4 text-sm">
        <ol className="space-y-2">
          <li><strong>1.</strong> Follow dealers on the Vendors & Stones page — their stones enter your feed.</li>
          <li><strong>2.</strong> Set your markup — e.g. 2.5x means a $1,000 wholesale stone appears as $2,500 on your site.</li>
          <li><strong>3.</strong> Copy the embed code below and paste it into your website.</li>
          <li><strong>4.</strong> Stones appear live on your site — sold stones disappear automatically.</li>
        </ol>
        <div className="mt-4 rounded-md border border-border bg-background p-3 font-mono text-xs">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Your feed URL (for developers)</div>
          {feedUrl}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          This returns a JSON array of all your available stones with retail prices applied.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}