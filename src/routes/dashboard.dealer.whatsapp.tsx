import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  Layers,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  XCircle,
  XOctagon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  parseWhatsAppMessageFn,
  saveWhatsAppDraftFn,
  type ParsedWhatsAppStone,
} from "@/lib/whatsapp-intake.functions";

export const Route = createFileRoute("/dashboard/dealer/whatsapp")({
  component: WhatsAppIntakePage,
});

// ─── Constants ───────────────────────────────────────────────────────────────

const SAMPLE_MESSAGES = [
  {
    label: "Clean message",
    text: "Blue Sapphire oval 2.30ct unheated GIA 74839211\nSri Lanka origin\nPrice USD 4200\nVideo available",
  },
  {
    label: "Messy / typos",
    text: "saphier 3.12 ct cushon shape\nno heat NH\nGIS cert 6204718392\ncolumbia\n5800 usd\nphoto available on request",
  },
  {
    label: "Local language + LKR",
    text: "neelam 1.95ct rd\nroyal blue no garam\nprice LKR 620000\nBurma origin\nLoose stone only",
  },
  {
    label: "Withdrawal message",
    text: "sorry bhai stone already sold this morning\ncannot supply",
  },
  {
    label: "Multi-stone",
    text: "Ruby oval 1.8ct heated Mozambique $2100\nBlue Sapphire round 0.95ct unheated GIA Sri Lanka $1450\nboth available",
  },
];

const DEALER_REQUEST_TEMPLATE = `Please send one stone per message:

Stone:
Shape:
Carat:
Colour:
Treatment (heated / unheated / lab):
Cert lab:
Cert number:
Origin:
Price (include currency):
Photo/video: yes / link

Example:
Blue Sapphire / Oval / 2.30ct / Royal blue / Unheated / GIA / 74839211 / Sri Lanka / USD 4200 / Video available`;

// ─── Page ────────────────────────────────────────────────────────────────────

function WhatsAppIntakePage() {
  const [message, setMessage]           = useState(SAMPLE_MESSAGES[0].text);
  const [parsing, setParsing]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [result, setResult]             = useState<ParsedWhatsAppStone | null>(null);
  const [parseError, setParseError]     = useState<string | null>(null);
  const [savedId, setSavedId]           = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate]   = useState(false);
  const [dupeError, setDupeError]       = useState<string | null>(null);

  // ── Parse ─────────────────────────────────────────────────────────────────
  async function handleParse() {
    if (!message.trim()) { toast.error("Paste a message first."); return; }
    setParsing(true);
    setResult(null);
    setParseError(null);
    setSavedId(null);
    setIsDuplicate(false);
    setDupeError(null);

    try {
      const res = await parseWhatsAppMessageFn({ data: { message } });
      if (res.ok) {
        setResult(res.stone);
        const warns = res.stone.warnings?.length ?? 0;
        if (res.stone.is_withdrawal) {
          toast.info("Withdrawal detected — this looks like a 'stone sold' message, not a new listing.");
        } else if (res.stone.is_multi_stone) {
          toast.warning("Multiple stones detected in one message — only the first was extracted. Send one stone per message.");
        } else if (warns > 0) {
          toast.warning(`Extracted with ${warns} warning${warns !== 1 ? "s" : ""} — review carefully.`);
        } else {
          toast.success("Extraction complete.");
        }
      } else {
        setParseError(res.error);
        toast.error("Extraction failed.");
      }
    } catch (err) {
      const msg = String(err);
      setParseError(msg);
      toast.error("Unexpected error during extraction.");
    } finally {
      setParsing(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!result || !result.stone_type) { toast.error("Stone type is required."); return; }
    setSaving(true);
    setIsDuplicate(false);
    setDupeError(null);

    const carat = result.carat_weight ? parseFloat(result.carat_weight) : null;
    const price = result.wholesale_price_usd ? parseFloat(result.wholesale_price_usd) : null;

    try {
      const res = await saveWhatsAppDraftFn({
        data: {
          stone_type:          result.stone_type,
          shape:               result.shape || null,
          carat_weight:        Number.isFinite(carat) ? carat : null,
          colour_grade:        result.colour_grade || null,
          clarity_grade:       result.clarity_grade || null,
          cert_lab:            result.cert_lab || null,
          cert_number:         result.cert_number || null,
          treatment:           result.treatment || null,
          country_of_origin:   result.country_of_origin || null,
          wholesale_price_usd: Number.isFinite(price) ? price : null,
          price_currency:      result.price_currency || "USD",
          notes_for_buyers:    null,
          raw_message:         message,
          extracted_json:      result as unknown as Record<string, unknown>,
          confidence:          result.confidence,
          warnings:            result.warnings ?? [],
          raw_price_text:      result.raw_price_text || null,
          original_currency:   result.price_currency || null,
        },
      });

      if (res.ok) {
        setSavedId(res.stoneId);
        toast.success("Stone saved. Pending admin review before going live.");
      } else if (res.isDuplicate) {
        setIsDuplicate(true);
        setDupeError(res.error);
        toast.error("Duplicate cert number detected.");
      } else {
        toast.error(`Save failed: ${res.error}`);
      }
    } catch (err) {
      toast.error(`Save error: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function copyTemplate() {
    await navigator.clipboard.writeText(DEALER_REQUEST_TEMPLATE);
    toast.success("Template copied.");
  }

  const fieldsDone = result
    ? [result.stone_type, result.shape, result.carat_weight, result.colour_grade,
       result.cert_lab, result.cert_number, result.treatment, result.country_of_origin,
       result.wholesale_price_usd].filter(Boolean).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl">WhatsApp intake</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Paste a dealer message. AI extracts trade data, flags uncertainties, detects duplicates,
            and saves a hidden draft for review. Works on typos, transliterations, and any currency.
          </p>
        </div>
        <Link to="/dashboard/stones/new">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Manual listing
          </Button>
        </Link>
      </div>

      {/* Workflow */}
      <section className="grid gap-3 sm:grid-cols-3">
        <WorkflowCard icon={<Send className="h-4 w-4" />} step="1" title="Request stock"
          text="Send the template. Works even if dealers ignore the format — AI handles messy input, typos, and local language." />
        <WorkflowCard icon={<Sparkles className="h-4 w-4" />} step="2" title="AI extraction"
          text="Paste the message. Live FX conversion, cert validation, price plausibility check, duplicate detection." />
        <WorkflowCard icon={<CheckCircle2 className="h-4 w-4" />} step="3" title="Review and publish"
          text="Stone saves as hidden. Admin approves before it goes live. Availability caveat appears automatically on the listing." />
      </section>

      {/* Availability caveat notice */}
      <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Every WhatsApp stone is saved as a hidden draft</p>
          <p className="mt-1 text-xs leading-5">
            It won't appear on the marketplace until an admin approves it. When published, the listing
            automatically shows: <span className="italic">"Availability should be confirmed with the
            dealer before proceeding — this stone may have been offered to multiple buyers simultaneously."</span>
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_440px]">

        {/* Left — input */}
        <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-[var(--color-gold)]" />
              Incoming message
            </div>
            <Button variant="outline" size="sm" onClick={copyTemplate}>
              <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
              Copy template
            </Button>
          </div>

          <Textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); setResult(null); setParseError(null); setSavedId(null); setIsDuplicate(false); }}
            rows={11}
            className="font-mono text-sm"
            placeholder="Paste a WhatsApp message here..."
          />

          {/* Sample buttons */}
          <div className="flex flex-wrap gap-2">
            {SAMPLE_MESSAGES.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setMessage(s.text); setResult(null); setParseError(null); setSavedId(null); setIsDuplicate(false); }}
                className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setMessage(""); setResult(null); setParseError(null); setSavedId(null); setIsDuplicate(false); }}
              className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Clear
            </button>
          </div>

          <Button
            onClick={handleParse}
            disabled={parsing || !message.trim()}
            className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
          >
            {parsing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Extract with AI</>
            )}
          </Button>
        </section>

        {/* Right — result */}
        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-[var(--color-gold)]" />
              Extracted fields
            </div>
            {result && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {fieldsDone}/9 fields
              </span>
            )}
          </div>

          {/* Error */}
          {parseError && (
            <div className="mt-4 flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Extraction failed</p>
                <p className="mt-1 font-mono text-xs break-all">{parseError}</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !parseError && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Paste a message and click <strong>Extract with AI</strong>.
            </p>
          )}

          {/* Withdrawal detected */}
          {result?.is_withdrawal && (
            <div className="mt-4 flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <XOctagon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Withdrawal message</p>
                <p className="mt-1 text-xs leading-5">
                  This message indicates the stone has been sold or is no longer available.
                  If you have an existing listing for this stone, mark it as sold from your{" "}
                  <Link to="/dashboard/stones" className="underline">listings page</Link>.
                </p>
              </div>
            </div>
          )}

          {/* Multi-stone detected */}
          {result?.is_multi_stone && !result.is_withdrawal && (
            <div className="mt-4 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Layers className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Multiple stones detected</p>
                <p className="mt-1 text-xs leading-5">
                  This message contains more than one stone. Only the first has been extracted.
                  Ask the dealer to send one stone per message, then process each separately.
                </p>
              </div>
            </div>
          )}

          {/* Fields */}
          {result && !result.is_withdrawal && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ConfidenceBadge confidence={result.confidence} />
              </div>

              {/* Warnings */}
              {(result.warnings?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-1.5">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex gap-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-2">
                <DraftRow label="Stone type"  value={result.stone_type}         required />
                <DraftRow label="Shape"        value={result.shape} />
                <DraftRow label="Carat"        value={result.carat_weight} />
                <DraftRow label="Colour"       value={result.colour_grade} />
                <DraftRow label="Clarity"      value={result.clarity_grade} />
                <DraftRow label="Cert lab"     value={result.cert_lab} />
                <DraftRow label="Cert number"  value={result.cert_number} />
                <DraftRow label="Treatment"    value={result.treatment}
                  urgent={!result.treatment}
                  urgentNote="Ambiguous — must be set before publishing" />
                <DraftRow label="Origin"       value={result.country_of_origin} />
                <DraftRow
                  label="Price (USD)"
                  value={result.wholesale_price_usd ? `$${Number(result.wholesale_price_usd).toLocaleString()}` : ""}
                  subValue={result.raw_price_text && result.price_currency !== "USD"
                    ? `Original: ${result.raw_price_text} ${result.price_currency}` : undefined}
                />
              </div>

              {/* Review note */}
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                <p className="font-medium">Human review required before publishing</p>
                <p className="mt-1 leading-5">
                  Verify cert number, treatment, and price. Treatment must be confirmed — misrepresenting
                  heated vs unheated is a serious compliance issue. Stone saves hidden until admin approves.
                </p>
              </div>

              {/* Duplicate error */}
              {isDuplicate && dupeError && (
                <div className="mt-4 flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Duplicate cert number</p>
                    <p className="mt-1 text-xs leading-5">{dupeError}</p>
                  </div>
                </div>
              )}

              {/* Save success */}
              {savedId ? (
                <div className="mt-4 flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Draft saved — pending admin approval</p>
                    <p className="mt-0.5 text-xs">
                      <Link to="/dashboard/stones/$id/edit" params={{ id: savedId }} className="underline inline-flex items-center gap-1">
                        Edit listing {savedId.slice(0, 8)}…
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </p>
                  </div>
                </div>
              ) : (
                !isDuplicate && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving || !result.stone_type}
                      className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
                    >
                      {saving ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" />Save as draft</>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      const text = [
                        `Stone: ${result.stone_type}`, `Shape: ${result.shape}`,
                        `Carat: ${result.carat_weight}`, `Colour: ${result.colour_grade}`,
                        `Clarity: ${result.clarity_grade}`, `Cert: ${result.cert_lab} ${result.cert_number}`,
                        `Treatment: ${result.treatment}`, `Origin: ${result.country_of_origin}`,
                        `Price: $${result.wholesale_price_usd} USD`,
                      ].filter((l) => !l.endsWith(": ")).join("\n");
                      await navigator.clipboard.writeText(text);
                      toast.success("Fields copied.");
                    }}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy fields
                    </Button>
                  </div>
                )
              )}
            </>
          )}
        </section>
      </div>

      {/* Automation path */}
      <section className="rounded-md border border-border bg-card p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase 2 — Full automation</div>
        <h2 className="mt-2 font-serif text-2xl">How this becomes zero-effort intake</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FutureStep label="Twilio inbox" text="Connect a WhatsApp Business number. Dealer messages hit a Chaos webhook automatically — no copy-paste." />
          <FutureStep label="Phone whitelist" text="Only approved dealer numbers are processed. Unknown numbers get an auto-reply with an onboarding link." />
          <FutureStep label="Media + OCR" text="Photo of a cert card? AI reads the report number. Video attached? Stored and linked to the listing automatically." />
          <FutureStep label="Approval queue" text="Admin sees a queue of pending drafts in one panel. One click to publish, one click to reject." />
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function WorkflowCard({ icon, step, title, text }: { icon: ReactNode; step: string; title: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)]">{icon}</div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{step}</span>
      </div>
      <h2 className="mt-3 text-sm font-medium">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function FutureStep({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-gold)]">{label}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function DraftRow({
  label, value, required, urgent, urgentNote, subValue,
}: {
  label: string; value: string; required?: boolean;
  urgent?: boolean; urgentNote?: string; subValue?: string;
}) {
  const empty = !value;
  return (
    <div className={[
      "grid grid-cols-[130px_1fr] gap-3 rounded-md border px-3 py-2 text-sm",
      urgent ? "border-amber-300 bg-amber-50" :
      empty && required ? "border-destructive/40 bg-destructive/5" : "border-border",
    ].join(" ")}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>
        <div className={empty ? (required ? "italic text-destructive text-xs" : "italic text-muted-foreground text-xs") : "font-mono text-xs"}>
          {empty ? (required ? "Required — not found" : "Not found") : value}
        </div>
        {urgentNote && <div className="mt-0.5 text-[10px] text-amber-700">{urgentNote}</div>}
        {subValue && <div className="mt-0.5 text-[10px] text-amber-700">{subValue}</div>}
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const map = {
    high:   { label: "High confidence",   cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    medium: { label: "Medium confidence", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    low:    { label: "Low confidence",    cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const { label, cls } = map[confidence] ?? map.low;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
