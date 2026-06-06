import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ClipboardList, Copy, MessageCircle, Plus, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard/dealer/whatsapp")({
  component: WhatsAppIntakePage,
});

type DraftStone = {
  stone_type: string;
  shape: string;
  carat_weight: string;
  colour_grade: string;
  clarity_grade: string;
  cert_lab: string;
  cert_number: string;
  treatment: string;
  price: string;
  notes: string;
};

const SAMPLE = `Blue Sapphire oval 2.30ct unheated GIA 74839211
Sri Lanka origin
Price USD 4200
Video available`;
const DEALER_REQUEST_TEMPLATE = `Please send one stone per message using this format:

Stone:
Shape:
Carat:
Colour:
Clarity:
Treatment:
Certificate lab:
Certificate number:
Origin:
Price:
Photo/video link:

Example:
Blue Sapphire
Oval
2.30ct
Royal blue
Eye clean
Unheated
GIA
74839211
Sri Lanka
USD 4200
Video available`;
const DRAFT_FIELDS: Array<keyof Omit<DraftStone, "notes">> = [
  "stone_type",
  "shape",
  "carat_weight",
  "colour_grade",
  "clarity_grade",
  "cert_lab",
  "cert_number",
  "treatment",
  "price",
];

function WhatsAppIntakePage() {
  const [message, setMessage] = useState(SAMPLE);
  const draft = useMemo(() => parseWhatsAppStone(message), [message]);
  const completion = DRAFT_FIELDS.filter((key) => draft[key].trim()).length;
  const draftText = DRAFT_FIELDS
    .filter((key) => draft[key].trim())
    .map((key) => `${key}: ${draft[key]}`)
    .join("\n");

  async function copyDraft() {
    await navigator.clipboard.writeText(draftText || message);
    toast.success("Draft fields copied");
  }

  async function copyRequestTemplate() {
    await navigator.clipboard.writeText(DEALER_REQUEST_TEMPLATE);
    toast.success("WhatsApp request template copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl">WhatsApp intake</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Paste a dealer's WhatsApp stock message and Chaos will turn the obvious details into a listing draft. Use this as the human-reviewed bridge before full WhatsApp automation.
          </p>
        </div>
        <Link to="/dashboard/stones/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New listing
          </Button>
        </Link>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <WorkflowCard
          icon={<Send className="h-4 w-4" />}
          title="1. Request stock"
          text="Send dealers a simple WhatsApp format so each message contains one stone and the key trade fields."
        />
        <WorkflowCard
          icon={<Sparkles className="h-4 w-4" />}
          title="2. Parse draft"
          text="Paste the message into Chaos. The parser extracts obvious fields while leaving uncertain values for review."
        />
        <WorkflowCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="3. Review and publish"
          text="Check certificate, treatment, price and media, then create the proper listing or API import record."
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-[var(--color-gold)]" />
              Incoming message
            </div>
            <Button variant="outline" size="sm" onClick={copyRequestTemplate}>
              <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
              Copy dealer template
            </Button>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={14}
            className="mt-3 font-mono text-sm"
            placeholder="Paste a WhatsApp message here..."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setMessage("")}>Clear</Button>
            <Button variant="outline" size="sm" onClick={() => setMessage(SAMPLE)}>Load sample</Button>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-[var(--color-gold)]" />
              Draft listing
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {completion}/9 fields
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <DraftRow label="Stone type" value={draft.stone_type} />
            <DraftRow label="Shape" value={draft.shape} />
            <DraftRow label="Carat" value={draft.carat_weight} />
            <DraftRow label="Colour" value={draft.colour_grade} />
            <DraftRow label="Clarity" value={draft.clarity_grade} />
            <DraftRow label="Certificate lab" value={draft.cert_lab} />
            <DraftRow label="Certificate number" value={draft.cert_number} />
            <DraftRow label="Treatment" value={draft.treatment} />
            <DraftRow label="Price" value={draft.price} />
          </div>

          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            <div className="font-medium">Human review required</div>
            <p className="mt-1">
              This parser is intentionally conservative. Check certificate numbers, treatment, price currency, and origin before publishing.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={copyDraft} disabled={!draftText}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy draft
            </Button>
            <Link to="/dashboard/stones/new">
              <Button size="sm" variant="outline">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Create listing
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <section className="rounded-md border border-border bg-card p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Automation path</div>
        <h2 className="mt-2 font-serif text-2xl">How this becomes full WhatsApp intake</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <FutureStep label="Inbox" text="Connect a WhatsApp Business number through Twilio or Meta." />
          <FutureStep label="Media" text="Store incoming photos, videos and certificate images against a draft." />
          <FutureStep label="AI review" text="Use OCR and extraction to identify cert number, carat, lab, price and treatment." />
          <FutureStep label="Approval" text="Dealer or admin approves the draft before it reaches the public marketplace." />
        </div>
      </section>
    </div>
  );
}

function WorkflowCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)]">
        {icon}
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

function DraftRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={value ? "font-mono" : "text-muted-foreground"}>{value || "Needs review"}</div>
    </div>
  );
}

function parseWhatsAppStone(input: string): DraftStone {
  const text = input.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const type = firstMatch(lower, [
    ["diamond", /\bdiamond\b/],
    ["sapphire", /\bsapphire\b/],
    ["ruby", /\bruby\b/],
    ["emerald", /\bemerald\b/],
    ["spinel", /\bspinel\b/],
    ["tourmaline", /\btourmaline\b/],
    ["tanzanite", /\btanzanite\b/],
    ["alexandrite", /\balexandrite\b/],
  ]);
  const shape = firstMatch(lower, [
    ["round", /\bround\b|\brbc\b|\brd\b/],
    ["oval", /\boval\b|\bov\b/],
    ["cushion", /\bcushion\b|\bcush\b/],
    ["emerald cut", /\bemerald cut\b|\bem\b/],
    ["pear", /\bpear\b|\bps\b/],
    ["marquise", /\bmarquise\b|\bmq\b/],
    ["radiant", /\bradiant\b|\brad\b/],
    ["princess", /\bprincess\b|\bprin\b/],
    ["asscher", /\basscher\b|\bass\b/],
    ["heart", /\bheart\b/],
  ]);
  const carat = text.match(/(\d+(?:\.\d+)?)\s*(?:ct|cts|carat|carats)\b/i)?.[1] ?? "";
  const lab = text.match(/\b(GIA|IGI|HRD|AGS|GCAL|EGL|GRS|SSEF|GUBELIN|GÜBELIN|AGL|LOTUS|GIT)\b/i)?.[1] ?? "";
  const certNumber = text.match(/\b(?:cert|certificate|report|lab)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9-]{5,})\b/i)?.[1]
    ?? (lab ? text.match(/\b[A-Z]{0,3}\d{6,}\b/)?.[0] ?? "" : "");
  const price = text.match(/\b(?:usd|us\$|\$)\s*([0-9,]+(?:\.\d+)?)\b/i)?.[1]
    ?? text.match(/\bprice\s*[:\-]?\s*([A-Z]{3})?\s*([0-9,]+(?:\.\d+)?)\b/i)?.[2]
    ?? "";
  const colour = text.match(/\b(D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z)\s*(?:colou?r)?\b/)?.[1]
    ?? firstMatch(lower, [
      ["blue", /\bblue\b/],
      ["pink", /\bpink\b/],
      ["yellow", /\byellow\b/],
      ["green", /\bgreen\b/],
      ["purple", /\bpurple\b/],
      ["orange", /\borange\b/],
      ["red", /\bred\b/],
    ]);
  const clarity = text.match(/\b(FL|IF|VVS1|VVS2|VS1|VS2|SI1|SI2|I1|I2|I3)\b/i)?.[1] ?? "";
  const treatment = firstMatch(lower, [
    ["unheated", /\bunheated\b|\bno heat\b/],
    ["heated", /\bheated\b|\bheat\b/],
    ["lab-grown", /\blab grown\b|\blab-grown\b|\blg\b/],
    ["natural", /\bnatural\b/],
  ]);

  return {
    stone_type: type,
    shape,
    carat_weight: carat,
    colour_grade: colour,
    clarity_grade: clarity,
    cert_lab: lab.toUpperCase(),
    cert_number: certNumber,
    treatment,
    price: price ? `USD ${price}` : "",
    notes: input,
  };
}

function firstMatch(text: string, entries: Array<[string, RegExp]>) {
  return entries.find(([, re]) => re.test(text))?.[0] ?? "";
}
