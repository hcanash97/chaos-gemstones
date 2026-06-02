import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SUPPORTED_CURRENCIES, formatPrice, convertPrice } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

export const Route = createFileRoute("/dashboard/jeweller/markup")({
  component: MarkupPage,
});

const MIN_MARKUP = 1.0;
const MAX_MARKUP = 10.0;

function validateMarkup(value: string): { ok: true; value: number } | { ok: false; error: string } {
  const n = parseFloat(value);
  if (!isFinite(n)) return { ok: false, error: "Enter a number." };
  if (n < MIN_MARKUP) return { ok: false, error: `Markup must be at least ${MIN_MARKUP.toFixed(1)} (below this you'd sell at a loss).` };
  if (n > MAX_MARKUP) return { ok: false, error: `Markup cannot exceed ${MAX_MARKUP.toFixed(1)}.` };
  return { ok: true, value: n };
}

function MarkupPage() {
  const { user, profile } = useAuth();
  const [global, setGlobal] = useState("2.0");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [displayCurrency, setDisplayCcy] = useState<string>("USD");
  const [feedCurrency, setFeedCcy] = useState<string>("USD");
  const { setDisplayCurrency: ctxSetDisplay, rates } = useCurrency();

  const isJeweller = checkJ(profile);

  const { data, refetch } = useQuery({
    queryKey: ["markup-data", user?.id],
    enabled: !!user?.id && isJeweller,
    queryFn: async () => {
      // Active API key — required for per-vendor overrides
      const { data: key } = await supabase
        .from("api_keys")
        .select("id")
        .eq("jeweller_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

        // Global markup — upsert default if row missing
      let { data: jp } = await supabase
        .from("jeweller_profiles")
        .select("markup_global, display_currency, feed_currency")
        .eq("id", user!.id)
        .maybeSingle();
      if (!jp) {
        const { data: created } = await supabase
          .from("jeweller_profiles")
          .upsert({ id: user!.id, markup_global: 2.0 }, { onConflict: "id" })
          .select("markup_global, display_currency, feed_currency")
          .maybeSingle();
        jp = created ?? { markup_global: 2.0, display_currency: "USD", feed_currency: "USD" };
      }

      // Approved dealers (publicly readable)
      const { data: dealers } = await supabase
        .from("profiles")
        .select("id, company_name, country")
        .eq("account_type", "dealer")
        .eq("is_approved", true)
        .order("company_name", { ascending: true });

      // Existing per-vendor overrides scoped to this jeweller's active key
      let selections: Array<{ id: string; dealer_id: string | null; markup_override: number | null }> = [];
      if (key?.id) {
        const { data: sels } = await supabase
          .from("feed_selections")
          .select("id, dealer_id, markup_override")
          .eq("api_key_id", key.id)
          .eq("selection_type", "dealer_follow");
        selections = (sels ?? []) as any;
      }

      return {
        apiKeyId: key?.id ?? null,
        global: Number(jp?.markup_global ?? 2),
        displayCurrency: (jp as any)?.display_currency ?? "USD",
        feedCurrency: (jp as any)?.feed_currency ?? "USD",
        dealers: dealers ?? [],
        selections,
      };
    },
  });

  useEffect(() => {
    if (!data) return;
    setGlobal(String(data.global));
    setDisplayCcy(data.displayCurrency || "USD");
    setFeedCcy(data.feedCurrency || "USD");
    const o: Record<string, string> = {};
    data.selections.forEach((s) => {
      if (s.dealer_id) o[s.dealer_id] = s.markup_override != null ? String(s.markup_override) : "";
    });
    setOverrides(o);
  }, [data]);

  const globalValidation = useMemo(() => validateMarkup(global), [global]);

  async function save() {
    if (!user) return;
    setSaveError(null);
    setSavedAt(null);

    const v = validateMarkup(global);
    if (!v.ok) {
      setSaveError(v.error);
      return;
    }

    setSaving(true);
    try {
      // Upsert so the row is created if it doesn't exist yet
      const { error: jpError } = await supabase
        .from("jeweller_profiles")
        .upsert(
          {
            id: user.id,
            markup_global: v.value,
            display_currency: displayCurrency,
            feed_currency: feedCurrency,
          },
          { onConflict: "id" },
        );
      if (jpError) throw new Error(jpError.message);
      // Sync the live platform display currency immediately.
      ctxSetDisplay(displayCurrency as any);

      // Per-vendor overrides — only when an active API key exists
      if (data?.apiKeyId) {
        for (const [dealerId, raw] of Object.entries(overrides)) {
          const trimmed = raw.trim();
          let value: number | null = null;
          if (trimmed !== "") {
            const vv = validateMarkup(trimmed);
            if (!vv.ok) throw new Error(`Override for one dealer is invalid: ${vv.error}`);
            value = vv.value;
          }
          const existing = data.selections.find((s) => s.dealer_id === dealerId);
          if (existing) {
            const { error } = await supabase
              .from("feed_selections")
              .update({ markup_override: value })
              .eq("id", existing.id);
            if (error) throw new Error(error.message);
          } else if (value != null) {
            const { error } = await supabase.from("feed_selections").insert({
              api_key_id: data.apiKeyId,
              selection_type: "dealer_follow",
              dealer_id: dealerId,
              markup_override: value,
            });
            if (error) throw new Error(error.message);
          }
        }
      }

      setSavedAt(Date.now());
      toast.success("Markup saved");
      refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save markup.";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // Auto-dismiss the green "Saved" pill after 3s
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  if (!isJeweller) return <div className="text-sm text-muted-foreground">Jewellers only.</div>;

  // Live preview: $1,000 USD wholesale × markup, displayed in feed currency.
  const previewMarkup = Number(global) || 2;
  const sampleConverted = convertPrice(1000, "USD", feedCurrency, rates) * previewMarkup;
  const sampleFeedLine = `A stone priced at $1,000 USD with your ${previewMarkup}× markup will appear as ${formatPrice(sampleConverted, feedCurrency)} in your feed (at current rates).`;

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl">Markup Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A markup of 2.5 means a stone priced at $1,000 wholesale will appear as $2,500 on your website.
        This is applied automatically by the API feed — your wholesale costs are never exposed to your customers.
      </p>

      <div className="mt-6 max-w-md rounded-md border border-border bg-card p-5">
        <Label>Global multiplier</Label>
        <Input
          type="number"
          step="0.01"
          min={MIN_MARKUP}
          max={MAX_MARKUP}
          value={global}
          onChange={(e) => setGlobal(e.target.value)}
          className="mt-1 font-mono"
          aria-invalid={!globalValidation.ok}
        />
        {!globalValidation.ok ? (
          <p className="mt-1 text-xs text-destructive">{globalValidation.error}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Allowed range {MIN_MARKUP.toFixed(1)}–{MAX_MARKUP.toFixed(1)}. e.g. 2.5 means retail = 2.5× wholesale.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <Label>Display currency (Chaos platform)</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            The currency you see prices in when browsing Chaos.
          </p>
          <select
            className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={displayCurrency}
            onChange={(e) => setDisplayCcy(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <Label>Feed output currency</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Your API feed will return prices pre-converted to this currency.
          </p>
          <select
            className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={feedCurrency}
            onChange={(e) => setFeedCcy(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} — {c.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">{sampleFeedLine}</p>
        </div>
      </div>

      <h2 className="mt-8 font-serif text-xl">Per-vendor override</h2>
      <p className="text-xs text-muted-foreground">Leave a field blank to use the global multiplier.</p>

      {!data?.apiKeyId ? (
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          Generate an API key first to set per-vendor markup overrides.{" "}
          <Link to="/dashboard/jeweller/api" className="font-medium text-[var(--color-gold)] underline">
            Go to API page →
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {(data?.dealers ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground">No approved dealers are listed yet.</div>
          )}
          {(data?.dealers ?? []).map((d: any) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
              <div>
                <div className="text-sm font-medium">{d.company_name ?? "Unnamed dealer"}</div>
                {d.country && <div className="text-xs text-muted-foreground">{d.country}</div>}
              </div>
              <Input
                type="number"
                step="0.01"
                min={MIN_MARKUP}
                max={MAX_MARKUP}
                placeholder={`Default (${global})`}
                value={overrides[d.id] ?? ""}
                onChange={(e) => setOverrides({ ...overrides, [d.id]: e.target.value })}
                className="w-32 font-mono"
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={save}
          disabled={saving || !globalValidation.ok}
          className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
        >
          {saving ? "Saving…" : "Save markup settings"}
        </Button>
        {savedAt && (
          <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Saved
          </span>
        )}
        {saveError && (
          <span className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}