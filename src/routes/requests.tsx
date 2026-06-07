import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { isJeweller as checkJ, isDealer as checkD } from "@/lib/auth.utils";
import { STONE_TYPES, STONE_TYPE_LABELS, SHAPES, SHAPE_LABELS } from "@/lib/marketplace/filters";
import { countryFlag } from "@/lib/countries";
import { MessageCircle, Search } from "lucide-react";

export const Route = createFileRoute("/requests")({
  component: RequestsPage,
  head: () => ({
    meta: [
      { title: "Stone Sourcing Requests — Chaos" },
      {
        name: "description",
        content:
          "Active sourcing requests from jewellers worldwide. Post your specific gemstone requirements or supply what buyers are looking for.",
      },
      { property: "og:title", content: "Stone Sourcing Requests — Chaos" },
      {
        property: "og:description",
        content: "Post or fulfil specific gemstone sourcing requirements from verified trade buyers.",
      },
      { property: "og:url", content: "/requests" },
    ],
    links: [{ rel: "canonical", href: "/requests" }],
  }),
});

const CERT_OPTIONS = ["Any", "GIA", "IGI", "GRS", "AGL", "None"];
const TREATMENT_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "unheated", label: "Unheated only" },
  { value: "heat-ok", label: "Heat treated OK" },
];
const DURATIONS = [30, 60, 90];
const SOURCING_STAGES = [
  { value: "cut", label: "Cut stone" },
  { value: "polished", label: "Finished/polished" },
  { value: "rough", label: "Rough stone" },
  { value: "cutting_service", label: "Cutting/polishing service" },
  { value: "any", label: "Open to options" },
];
const RESPONSE_CHANNELS = [
  { value: "chaos", label: "Chaos replies only" },
  { value: "whatsapp_ok", label: "WhatsApp sourcing OK" },
  { value: "whatsapp_preferred", label: "WhatsApp preferred" },
];

type RequestRow = {
  id: string;
  jeweller_id: string;
  stone_type: string;
  shape: string[] | null;
  min_carat: number | null;
  max_carat: number | null;
  colour_description: string | null;
  max_budget_usd: number | null;
  cert_lab: string | null;
  treatment: string | null;
  notes: string | null;
  allow_whatsapp_sourcing: boolean | null;
  preferred_response_channel: string | null;
  sourcing_stage: string | null;
  created_at: string;
  expires_at: string;
  profiles: { company_name: string | null; country: string | null } | null;
};

function timeAgo(iso: string): string {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function RequestsPage() {
  const { user, profile } = useAuth();
  const isJeweller = checkJ(profile);
  const isDealer = checkD(profile);
  const isApprovedJeweller = isJeweller && !!profile?.is_approved;
  const qc = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["stone-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stone_requests")
        .select(
          "id, jeweller_id, stone_type, shape, min_carat, max_carat, colour_description, max_budget_usd, cert_lab, treatment, notes, allow_whatsapp_sourcing, preferred_response_channel, sourcing_stage, created_at, expires_at, profiles:jeweller_id(company_name, country)",
        )
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
  });

  // Dealer: which requests have I already responded to?
  const { data: myResponses } = useQuery({
    queryKey: ["my-request-responses", user?.id],
    enabled: !!user && isDealer,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("stone_request_responses")
        .select("request_id")
        .eq("dealer_id", user!.id);
      return new Set((data ?? []).map((r: any) => r.request_id as string));
    },
  });

  // Response counts visible to everyone via aggregate-from-list — small N so it's fine.
  const { data: responseCounts } = useQuery({
    queryKey: ["request-response-counts", (requests ?? []).map((r) => r.id).join(",")],
    enabled: !!requests && requests.length > 0,
    queryFn: async () => {
      const ids = (requests ?? []).map((r) => r.id);
      if (!ids.length) return {} as Record<string, number>;
      const { data } = await (supabase as any)
        .from("stone_request_responses")
        .select("request_id")
        .in("request_id", ids);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        counts[r.request_id] = (counts[r.request_id] ?? 0) + 1;
      });
      return counts;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">Sourcing Board</div>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">Stone requests</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Jewellers post what they're looking for. Verified dealers respond directly with what they
            can supply.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[380px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {isApprovedJeweller ? (
              <PostRequestForm
                onPosted={() => qc.invalidateQueries({ queryKey: ["stone-requests"] })}
              />
            ) : (
              <div className="rounded-md border border-border bg-card p-6">
                <h2 className="font-serif text-xl">Post a sourcing request</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {user
                    ? "Approved jeweller accounts can post sourcing requests. Your account is pending review."
                    : "Sign in as a jeweller to post specific sourcing requirements."}
                </p>
                {!user && (
                  <div className="mt-4 flex gap-2">
                    <Link to="/login">
                      <Button variant="outline" size="sm">Log in</Button>
                    </Link>
                    <Link to="/sign-up/jeweller">
                      <Button
                        size="sm"
                        className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
                      >
                        Sign up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </aside>

          <section>
            <div className="flex items-end justify-between">
              <h2 className="font-serif text-2xl">Active requests</h2>
              {requests && (
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {requests.length} open
                </span>
              )}
            </div>

            {isLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
            ) : !requests || requests.length === 0 ? (
              <div className="mt-6 rounded-md border border-dashed border-border py-16 text-center">
                <Search className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No sourcing requests yet. Be the first to post what you're looking for.
                </p>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                {requests.map((r) => (
                  <RequestCard
                    key={r.id}
                    r={r}
                    isDealer={isDealer}
                    hasResponded={!!myResponses?.has(r.id)}
                    responseCount={responseCounts?.[r.id] ?? 0}
                    onResponded={() => {
                      qc.invalidateQueries({ queryKey: ["my-request-responses", user?.id] });
                      qc.invalidateQueries({ queryKey: ["request-response-counts"] });
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function PostRequestForm({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const [stoneType, setStoneType] = useState("sapphire");
  const [shapes, setShapes] = useState<string[]>([]);
  const [minCarat, setMinCarat] = useState("");
  const [maxCarat, setMaxCarat] = useState("");
  const [colour, setColour] = useState("");
  const [budget, setBudget] = useState("");
  const [cert, setCert] = useState("Any");
  const [treatment, setTreatment] = useState("any");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState(30);
  const [allowWhatsApp, setAllowWhatsApp] = useState(false);
  const [responseChannel, setResponseChannel] = useState("chaos");
  const [sourcingStage, setSourcingStage] = useState("cut");
  const [busy, setBusy] = useState(false);

  function toggleShape(s: string) {
    setShapes((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));
  }

  async function submit() {
    if (!user) return;
    setBusy(true);
    const expiresAt = new Date(Date.now() + duration * 86400000).toISOString();
    const { error } = await (supabase as any).from("stone_requests").insert({
      jeweller_id: user.id,
      stone_type: stoneType,
      shape: shapes,
      min_carat: minCarat ? Number(minCarat) : null,
      max_carat: maxCarat ? Number(maxCarat) : null,
      colour_description: colour || null,
      max_budget_usd: budget ? Number(budget) : null,
      cert_lab: cert === "Any" ? null : cert,
      treatment: treatment === "any" ? null : treatment,
      notes: notes || null,
      allow_whatsapp_sourcing: allowWhatsApp || responseChannel !== "chaos",
      preferred_response_channel: responseChannel,
      sourcing_stage: sourcingStage,
      status: "open",
      expires_at: expiresAt,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request posted");
    setColour("");
    setBudget("");
    setNotes("");
    setMinCarat("");
    setMaxCarat("");
    setShapes([]);
    setAllowWhatsApp(false);
    setResponseChannel("chaos");
    setSourcingStage("cut");
    onPosted();
  }

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h2 className="font-serif text-xl">Post a sourcing request</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Approved dealers will see this and respond if they can supply.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stone type</Label>
          <Select value={stoneType} onValueChange={setStoneType}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STONE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {STONE_TYPE_LABELS[t] ?? t.replace(/-/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Shape (optional)</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SHAPES.slice(0, 10).map((s) => {
              const on = shapes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleShape(s)}
                  className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${
                    on
                      ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {SHAPE_LABELS[s] ?? s.replace(/-/g, " ")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Min carat</Label>
            <Input className="mt-1.5" type="number" step="0.01" value={minCarat} onChange={(e) => setMinCarat(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max carat</Label>
            <Input className="mt-1.5" type="number" step="0.01" value={maxCarat} onChange={(e) => setMaxCarat(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Colour description</Label>
          <Input
            className="mt-1.5"
            value={colour}
            placeholder="e.g. unheated Burmese pigeon blood"
            onChange={(e) => setColour(e.target.value)}
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Max budget (USD)</Label>
          <Input className="mt-1.5" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Certification</Label>
            <Select value={cert} onValueChange={setCert}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CERT_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Treatment</Label>
            <Select value={treatment} onValueChange={setTreatment}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TREATMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
          <Textarea
            className="mt-1.5"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Include timing, client use, preferred origin, whether rough/cutting options are acceptable..."
          />
        </div>

        <div className="rounded-md border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={allowWhatsApp}
              onCheckedChange={(v) => {
                const next = !!v;
                setAllowWhatsApp(next);
                if (next && responseChannel === "chaos") setResponseChannel("whatsapp_ok");
                if (!next) setResponseChannel("chaos");
              }}
              className="mt-0.5"
            />
            <div>
              <Label className="text-sm font-medium">Allow WhatsApp-first sourcing</Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Use this when Chaos or a dealer may source from suppliers who trade mainly through WhatsApp.
                Availability and price should be confirmed before quoting your client.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Request stage</Label>
              <Select value={sourcingStage} onValueChange={setSourcingStage}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCING_STAGES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Response channel</Label>
              <Select
                value={responseChannel}
                onValueChange={(v) => {
                  setResponseChannel(v);
                  setAllowWhatsApp(v !== "chaos");
                }}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESPONSE_CHANNELS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Open for</Label>
          <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={submit}
          disabled={busy}
          className="w-full bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
        >
          {busy ? "Posting…" : "Post request"}
        </Button>
      </div>
    </div>
  );
}

function RequestCard({
  r,
  isDealer,
  hasResponded,
  responseCount,
  onResponded,
}: {
  r: RequestRow;
  isDealer: boolean;
  hasResponded: boolean;
  responseCount: number;
  onResponded: () => void;
}) {
  const headline = `${STONE_TYPE_LABELS[r.stone_type] ?? r.stone_type.replace(/-/g, " ")}${
    r.shape && r.shape.length ? " · " + r.shape.map((s) => SHAPE_LABELS[s] ?? s).join(", ") : ""
  }`;
  const carats =
    r.min_carat || r.max_carat
      ? `${r.min_carat ?? "?"}–${r.max_carat ?? "?"}ct`
      : null;
  const company = r.profiles?.company_name || "A verified jeweller";
  const country = r.profiles?.country;
  const stageLabel = SOURCING_STAGES.find((o) => o.value === r.sourcing_stage)?.label;
  const wantsWhatsApp = !!r.allow_whatsapp_sourcing || r.preferred_response_channel === "whatsapp_ok" || r.preferred_response_channel === "whatsapp_preferred";

  return (
    <article className="rounded-md border border-border bg-card p-5 transition-shadow hover:shadow-[0_18px_40px_-22px_rgba(15,27,61,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl capitalize">{headline}</h3>
          <div className="mt-1 text-sm text-muted-foreground">
            {carats}
            {carats && r.max_budget_usd ? " · " : ""}
            {r.max_budget_usd ? `Up to $${Number(r.max_budget_usd).toLocaleString()}` : ""}
          </div>
          {(r.colour_description || r.treatment || r.cert_lab || stageLabel || wantsWhatsApp) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.cert_lab && <Badge variant="outline" className="text-[10px]">{r.cert_lab}</Badge>}
              {r.treatment && (
                <Badge variant="outline" className="text-[10px] capitalize">
                  {r.treatment.replace("-", " ")}
                </Badge>
              )}
              {r.colour_description && (
                <Badge variant="secondary" className="text-[10px]">{r.colour_description}</Badge>
              )}
              {stageLabel && (
                <Badge variant="outline" className="text-[10px]">{stageLabel}</Badge>
              )}
              {wantsWhatsApp && (
                <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                  <MessageCircle className="mr-1 h-3 w-3" />
                  WhatsApp sourcing OK
                </Badge>
              )}
            </div>
          )}
          {r.notes && <p className="mt-3 text-sm text-muted-foreground">{r.notes}</p>}
        </div>
        <span className="whitespace-nowrap text-[10px] uppercase tracking-wider text-muted-foreground">
          {timeAgo(r.created_at)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <div className="text-muted-foreground">
          Posted by {company}
          {country ? ` · ${countryFlag(country)} ${country}` : ""}
        </div>
        <div className="flex items-center gap-3">
          {responseCount > 0 && (
            <span className="text-muted-foreground">
              {responseCount} response{responseCount === 1 ? "" : "s"}
            </span>
          )}
          {isDealer && (
            <RespondDialog
              requestId={r.id}
              headline={headline}
              wantsWhatsApp={wantsWhatsApp}
              hasResponded={hasResponded}
              onResponded={onResponded}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function RespondDialog({
  requestId,
  headline,
  wantsWhatsApp,
  hasResponded,
  onResponded,
}: {
  requestId: string;
  headline: string;
  wantsWhatsApp: boolean;
  hasResponded: boolean;
  onResponded: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user || !message.trim()) return;
    setBusy(true);
    const { error } = await (supabase as any).from("stone_request_responses").insert({
      request_id: requestId,
      dealer_id: user.id,
      message: message.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Response sent");
    setMessage("");
    setOpen(false);
    onResponded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={hasResponded ? "outline" : "default"}
          className={hasResponded ? "" : "bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"}
        >
          {hasResponded ? "Responded ✓" : "I can supply this"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Respond to request</DialogTitle>
          <DialogDescription>{headline}</DialogDescription>
        </DialogHeader>
        {wantsWhatsApp && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
            This buyer is open to WhatsApp-first sourcing. Include whether the stone is currently in hand,
            rough/cutting status, and when availability was last confirmed.
          </div>
        )}
        <Textarea
          rows={6}
          placeholder={
            wantsWhatsApp
              ? "Describe what you can supply — origin, treatment, price, lead time, WhatsApp availability status, and whether photos/video can be provided..."
              : "Describe what you can supply — origin, treatment, price, lead time…"
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={busy || !message.trim()}
            className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
          >
            {busy ? "Sending…" : "Send response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
