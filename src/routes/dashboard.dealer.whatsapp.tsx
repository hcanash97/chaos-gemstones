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
  // Now an array — every parsed message can yield 1..N stones.
  const [results, setResults]           = useState<ParsedWhatsAppStone[] | null>(null);
  const [parseError, setParseError]     = useState<string | null>(null);
  const [savedIds, setSavedIds]         = useState<Record<number, string>>({});
  const [dupeErrors, setDupeErrors]     = useState<Record<number, string>>({});

  function resetResults() {
    setResults(null);
    setParseError(null);
    setSavedIds({});
    setDupeErrors({});
  }

  // ── Parse ─────────────────────────────────────────────────────────────────
  async function handleParse() {
    if (!message.trim()) { toast.error("Paste a message first."); return; }
    setParsing(true);
    resetResults();

    try {
      const res = await parseWhatsAppMessageFn({ data: { message } });
      if (res.ok) {
        setResults(res.stones);
        const totalWarns = res.stones.reduce((n, s) => n + (s.warnings?.length ?? 0), 0);
        if (res.stones.some((s) => s.is_withdrawal)) {
          toast.info("Withdrawal detected in message.");
        } else if (res.stones.length > 1) {
          toast.success(`${res.stones.length} stones extracted. Review each before saving.`);
        } else if (totalWarns > 0) {
          toast.warning(`Extracted with ${totalWarns} warning${totalWarns !== 1 ? "s" : ""} — review carefully.`);
        } else {
          toast.success("Extraction complete.");
        }
      } else {
        setParseError(res.error);
        toast.error("Extraction failed.");
      }
    } catch (err) {
      setParseError(String(err));
      toast.error("Unexpected error during extraction.");
    } finally {
      setParsing(false);
    }
  }

  // ── Save a single stone ───────────────────────────────────────────────────
  async function saveStone(idx: number, stone: ParsedWhatsAppStone) {
    const carat = stone.carat_weight ? parseFloat(stone.carat_weight) : null;
    const price = stone.wholesale_price_usd ? parseFloat(stone.wholesale_price_usd) : null;
    const res = await saveWhatsAppDraftFn({
      data: {
        stone_type:          stone.stone_type,
        shape:               stone.shape || null,
        carat_weight:        Number.isFinite(carat) ? carat : null,
        colour_grade:        stone.colour_grade || null,
        clarity_grade:       stone.clarity_grade || null,
        cert_lab:            stone.cert_lab || null,
        cert_number:         stone.cert_number || null,
        treatment:           stone.treatment || null,
        country_of_origin:   stone.country_of_origin || null,
        wholesale_price_usd: Number.isFinite(price) ? price : null,
        price_currency:      stone.price_currency || "USD",
        notes_for_buyers:    null,
        raw_message:         message,
        extracted_json:      stone as unknown as Record<string, unknown>,
        confidence:          stone.confidence,
        warnings:            stone.warnings ?? [],
        raw_price_text:      stone.raw_price_text || null,
        original_currency:   stone.price_currency || null,
      },
    });
    if (res.ok) {
      setSavedIds((s) => ({ ...s, [idx]: res.stoneId }));
      return true;
    }
    if (res.isDuplicate) {
      setDupeErrors((d) => ({ ...d, [idx]: res.error }));
    } else {
      toast.error(`Save failed (stone ${idx + 1}): ${res.error}`);
    }
    return false;
  }

  async function handleSaveAll() {
    if (!results) return;
    setSaving(true);
    let saved = 0;
    for (let i = 0; i < results.length; i++) {
      if (savedIds[i]) continue;
      if (!results[i].stone_type) continue;
      const ok = await saveStone(i, results[i]);
      if (ok) saved++;
    }
    setSaving(false);
    if (saved > 0) toast.success(`${saved} stone${saved !== 1 ? "s" : ""} saved as hidden drafts — pending admin approval.`);
  }

  async function copyTemplate() {
    await navigator.clipboard.writeText(DEALER_REQUEST_TEMPLATE);
    toast.success("Template copied.");
  }

  const onMessageChange = (text: string) => {
    setMessage(text);
    resetResults();
  };

  const stonesToSave = results
    ? results.filter((s, i) => !savedIds[i] && !dupeErrors[i] && s.stone_type && !s.is_withdrawal).length
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
            onChange={(e) => onMessageChange(e.target.value)}
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
                onClick={() => onMessageChange(s.text)}
                className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onMessageChange("")}
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
              Extracted stones
            </div>
            {results && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {results.length} stone{results.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {parseError && (
            <div className="mt-4 flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Extraction failed</p>
                <p className="mt-1 font-mono text-xs break-all">{parseError}</p>
              </div>
            </div>
          )}

          {!results && !parseError && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Paste a message and click <strong>Extract with AI</strong>.
            </p>
          )}

          {results && results.length > 1 && (
            <div className="mt-4 flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <Layers className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{results.length} stones detected</p>
                <p className="mt-1 text-xs leading-5">
                  Each one will be saved as its own hidden draft and require admin approval before going live.
                </p>
              </div>
            </div>
          )}

          {results && stonesToSave > 0 && (
            <div className="mt-4">
              <Button
                onClick={handleSaveAll}
                disabled={saving}
                className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
              >
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" />Save {stonesToSave} draft{stonesToSave !== 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          )}

          {results && (
            <div className="mt-4 space-y-5">
              {results.map((stone, idx) => (
                <StoneResultCard
                  key={idx}
                  index={idx}
                  total={results.length}
                  stone={stone}
                  savedId={savedIds[idx] ?? null}
                  dupeError={dupeErrors[idx] ?? null}
                />
              ))}
            </div>
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

function StoneResultCard({
  index, total, stone, savedId, dupeError,
}: {
  index: number;
  total: number;
  stone: ParsedWhatsAppStone;
  savedId: string | null;
  dupeError: string | null;
}) {
  if (stone.is_withdrawal) {
    return (
      <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <XOctagon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Withdrawal message</p>
          <p className="mt-1 text-xs leading-5">
            Stone {index + 1} of {total} is a sold/withdrawn notice — not a new listing.
            Mark any matching live listing as sold from your{" "}
            <Link to="/dashboard/stones" className="underline">listings page</Link>.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Stone {index + 1}{total > 1 ? ` of ${total}` : ""}
        </div>
        <ConfidenceBadge confidence={stone.confidence} />
      </div>

      {(stone.warnings?.length ?? 0) > 0 && (
        <div className="mt-3 space-y-1.5">
          {stone.warnings.map((w, i) => (
            <div key={i} className="flex gap-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <DraftRow label="Stone type" value={stone.stone_type} required />
        <DraftRow label="Shape" value={stone.shape} />
        <DraftRow label="Carat" value={stone.carat_weight} />
        <DraftRow label="Colour" value={stone.colour_grade} />
        <DraftRow label="Clarity" value={stone.clarity_grade} />
        <DraftRow label="Cert lab" value={stone.cert_lab} />
        <DraftRow label="Cert number" value={stone.cert_number} />
        <DraftRow label="Treatment" value={stone.treatment}
          urgent={!stone.treatment}
          urgentNote="Ambiguous — must be set before publishing" />
        <DraftRow label="Origin" value={stone.country_of_origin} />
        <DraftRow
          label="Price (USD)"
          value={stone.wholesale_price_usd ? `$${Number(stone.wholesale_price_usd).toLocaleString()}` : ""}
          subValue={stone.raw_price_text && stone.price_currency !== "USD"
            ? `Original: ${stone.raw_price_text} ${stone.price_currency}` : undefined}
        />
      </div>

      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={async () => {
          const text = [
            `Stone: ${stone.stone_type}`,
            `Shape: ${stone.shape}`,
            `Carat: ${stone.carat_weight}`,
            `Colour: ${stone.colour_grade}`,
            `Clarity: ${stone.clarity_grade}`,
            `Cert: ${stone.cert_lab} ${stone.cert_number}`,
            `Treatment: ${stone.treatment}`,
            `Origin: ${stone.country_of_origin}`,
            `Price: $${stone.wholesale_price_usd} USD`,
          ].filter((line) => !line.endsWith(": ") && !line.endsWith("null")).join("\n");
          await navigator.clipboard.writeText(text);
          toast.success("Fields copied.");
        }}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy fields
        </Button>
      </div>

      {dupeError && (
        <div className="mt-3 flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">Duplicate cert number</p>
            <p className="mt-1 leading-5">{dupeError}</p>
          </div>
        </div>
      )}

      {savedId && (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Saved — pending admin approval</p>
            <p className="mt-0.5">
              <Link to="/dashboard/stones/$id/edit" params={{ id: savedId }} className="underline inline-flex items-center gap-1">
                Edit listing {savedId.slice(0, 8)}…
                <ExternalLink className="h-3 w-3" />
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

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
