import { useMemo, useState, type ReactNode } from "react";
import { Copy, FileText, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type QuoteStone = {
  id: string;
  stone_type?: string | null;
  shape?: string | null;
  carat_weight?: number | string | null;
  colour_grade?: string | null;
  clarity_grade?: string | null;
  cert_lab?: string | null;
  cert_number?: string | null;
  treatment?: string | null;
  country_of_origin?: string | null;
  wholesale_price_usd?: number | string | null;
  price_currency?: string | null;
  image?: string | null;
  stone_images?: Array<{ storage_url?: string | null; external_image_url?: string | null; is_primary?: boolean | null; sort_order?: number | null }> | null;
};

function stoneTitle(stone: QuoteStone) {
  const carat = stone.carat_weight ? `${Number(stone.carat_weight).toFixed(2)}ct ` : "";
  return `${carat}${stone.shape ?? ""} ${stone.stone_type ?? "stone"}`.replace(/\s+/g, " ").trim();
}

function imageFor(stone: QuoteStone) {
  if (stone.image) return stone.image;
  const images = [...(stone.stone_images ?? [])].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
  const primary = images.find((i) => i.is_primary) ?? images[0];
  return primary?.storage_url || primary?.external_image_url || null;
}

export function ClientQuoteDialog({
  stone,
  trigger,
}: {
  stone: QuoteStone;
  trigger?: ReactNode;
}) {
  const [clientName, setClientName] = useState("");
  const [quotePrice, setQuotePrice] = useState("");
  const [notes, setNotes] = useState("Subject to availability. Certificate details should be verified before purchase.");
  const title = stoneTitle(stone);
  const image = imageFor(stone);
  const defaultQuote = useMemo(() => {
    const wholesale = Number(stone.wholesale_price_usd ?? 0);
    return wholesale > 0 ? Math.round(wholesale * 2.2).toString() : "";
  }, [stone.wholesale_price_usd]);
  const displayQuote = quotePrice.trim() || defaultQuote;
  const quoteNumber = Number(displayQuote.replace(/[^0-9.]/g, ""));
  const stoneUrl = typeof window !== "undefined" ? `${window.location.origin}/stone/${stone.id}` : `/stone/${stone.id}`;

  const summary = [
    clientName.trim() ? `Client: ${clientName.trim()}` : null,
    `Stone: ${title}`,
    stone.colour_grade ? `Colour: ${stone.colour_grade}` : null,
    stone.clarity_grade ? `Clarity: ${stone.clarity_grade}` : null,
    stone.treatment ? `Treatment: ${stone.treatment}` : null,
    stone.country_of_origin ? `Origin: ${stone.country_of_origin}` : null,
    stone.cert_lab || stone.cert_number ? `Certificate: ${[stone.cert_lab, stone.cert_number].filter(Boolean).join(" ")}` : null,
    displayQuote && Number.isFinite(quoteNumber) ? `Client quote: USD ${quoteNumber.toLocaleString()}` : "Client quote: price on request",
    `Stone link: ${stoneUrl}`,
    notes.trim() ? `Notes: ${notes.trim()}` : null,
  ].filter(Boolean).join("\n");

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    toast.success("Client quote copied");
  }

  async function shareSummary() {
    if (navigator.share) {
      await navigator.share({ title: `Quote for ${title}`, text: summary, url: stoneUrl });
      return;
    }
    await copySummary();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Client quote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Stone Passport / Client Quote</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="overflow-hidden rounded-md border border-border bg-muted">
            {image ? (
              <img src={image} alt={title} className="aspect-square h-full w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center text-xs text-muted-foreground">No image</div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Client-facing summary</div>
              <h3 className="mt-1 font-serif text-2xl capitalize">{title}</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <Spec label="Colour" value={stone.colour_grade} />
                <Spec label="Clarity" value={stone.clarity_grade} />
                <Spec label="Treatment" value={stone.treatment} />
                <Spec label="Certificate" value={[stone.cert_lab, stone.cert_number].filter(Boolean).join(" ")} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="quote-client">Client name</Label>
                <Input id="quote-client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="quote-price">Client quote USD</Label>
                <Input
                  id="quote-price"
                  inputMode="numeric"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  placeholder={defaultQuote ? `Suggested ${Number(defaultQuote).toLocaleString()}` : "Price on request"}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="quote-notes">Notes</Label>
              <Textarea id="quote-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="rounded-md border border-border bg-background p-3 font-mono text-xs whitespace-pre-wrap">
              {summary}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copySummary}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button onClick={shareSummary}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Spec({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-xs">{value || "—"}</div>
    </div>
  );
}
