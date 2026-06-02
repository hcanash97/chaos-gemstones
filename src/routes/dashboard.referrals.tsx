import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, MessageCircle, Share2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isDealer as checkD } from "@/lib/auth.utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/referrals")({
  component: ReferralsPage,
});

type Credit = {
  id: string;
  credit_type: string;
  credit_months: number;
  credit_gbp: number;
  reason: string;
  status: string;
  qualifying_event: string;
  qualifying_event_at: string | null;
  created_at: string;
  cross_side: boolean;
  referral_id: string | null;
};

type Referred = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  account_type: string;
  created_at: string;
  is_approved: boolean;
};

function ReferralsPage() {
  const { user, profile } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [referred, setReferred] = useState<Referred[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: cr }, { data: ref }] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
        supabase
          .from("referral_credits")
          .select("*")
          .eq("beneficiary_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, company_name, account_type, created_at, is_approved")
          .eq("referred_by", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setCode(prof?.referral_code ?? null);
      setCredits((cr ?? []) as Credit[]);
      setReferred((ref ?? []) as Referred[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading || !profile) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const base = "https://chaosgemstones.com";
  const dealerLink = `${base}/sign-up/dealer?ref=${code}`;
  const jewellerLink = `${base}/sign-up/jeweller?ref=${code}`;
  const shortLink = `${base}?ref=${code}`;

  const totalMonths = credits
    .filter((c) => c.status === "active" && c.credit_type === "free_months")
    .reduce((t, c) => t + c.credit_months, 0);
  const totalGbp = credits
    .filter((c) => c.status === "active" && c.credit_type === "credit_gbp")
    .reduce((t, c) => t + Number(c.credit_gbp), 0);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  };

  const isDealer = checkD(profile);
  const waMessage = isDealer
    ? `I've been using Chaos Gemstones to list my stones with jewellers worldwide. Sign up here: ${shortLink}`
    : `I've been using Chaos Gemstones to source certified gemstones directly from dealers in India and Sri Lanka. Sign up here: ${shortLink}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Referrals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring your contacts onto Chaos. You both earn credit when they qualify.
        </p>
      </div>

      {/* Your referral link */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your referral link</h2>
        <div className="mt-4 space-y-3">
          <LinkRow label="Invite a dealer" url={dealerLink} k="dealer" copied={copied} onCopy={copy} />
          <LinkRow label="Invite a jeweller" url={jewellerLink} k="jeweller" copied={copied} onCopy={copy} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" /> Share on WhatsApp
          </a>
          <Button variant="outline" size="sm" onClick={() => copy(waMessage, "msg")}>
            <Share2 className="mr-2 h-4 w-4" /> {copied === "msg" ? "Copied" : "Copy message"}
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">How it works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          <Step n={1} title="Share your link" text="Send your referral link to dealers or jewellers you know." />
          <Step n={2} title="They qualify" text="They sign up and either list 10 stones or activate their API feed." />
          <Step n={3} title="You both earn" text="3 months free when pricing launches. Cross-side referrals earn 6 months." />
        </ol>
      </section>

      {/* Credits summary */}
      <section className="rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your credits</h2>
        <p className="mt-3 text-base">
          You have earned <strong>{totalMonths} months free</strong> and <strong>£{totalGbp.toLocaleString()}</strong> in credits. These apply automatically when Chaos introduces subscription pricing.
        </p>
      </section>

      {/* Your referrals */}
      <section>
        <h2 className="font-serif text-xl">Your referrals</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
          {referred.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You haven't referred anyone yet. Share your link to start earning credits.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Referred</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Credit earned</th>
                </tr>
              </thead>
              <tbody>
                {referred.map((r) => {
                  const earned = credits.filter((c) => c.referral_id === r.id);
                  const months = earned.reduce((t, c) => t + c.credit_months, 0);
                  const gbp = earned.reduce((t, c) => t + Number(c.credit_gbp), 0);
                  const qualified = earned.length > 0;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.company_name || r.full_name || "—"}</div>
                        {r.full_name && r.company_name && (
                          <div className="text-xs text-muted-foreground">{r.full_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{r.account_type}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                            qualified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {qualified ? "Qualified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {months > 0 && <div>{months} months free</div>}
                        {gbp > 0 && <div>£{gbp.toLocaleString()}</div>}
                        {months === 0 && gbp === 0 && <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Questions? <Link to="/about" className="underline">Get in touch</Link>.
      </p>
    </div>
  );
}

function LinkRow({
  label,
  url,
  k,
  copied,
  onCopy,
}: {
  label: string;
  url: string;
  k: string;
  copied: string | null;
  onCopy: (t: string, k: string) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-xs">{url}</code>
        <Button size="sm" variant="outline" onClick={() => onCopy(url, k)}>
          {copied === k ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-gold)] text-xs font-medium text-[var(--color-gold)]">
        {n}
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-1 text-xs text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}