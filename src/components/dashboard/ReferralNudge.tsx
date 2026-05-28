import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const KEY = "chaos_referral_nudge_dismissed_until";

export function ReferralNudge() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!user) return;
    const dismissedUntil = Number(localStorage.getItem(KEY) || "0");
    if (Date.now() < dismissedUntil) return;
    setHidden(false);
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setCode(data?.referral_code ?? null));
  }, [user]);

  if (hidden || !code) return null;

  const url = `https://chaosgemstones.com?ref=${code}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Referral link copied");
  };

  const dismiss = () => {
    localStorage.setItem(KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setHidden(true);
  };

  return (
    <div className="relative mb-6 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Sparkles className="mt-0.5 h-5 w-5 text-[var(--color-gold)]" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            Know someone who should be on Chaos?
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Share your referral link — you both get 3 months free when pricing launches. Cross-side referrals earn 6 months.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="truncate rounded bg-background px-2 py-1 text-xs">{url}</code>
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="mr-1 h-3 w-3" /> Copy
            </Button>
            <Link to="/dashboard/referrals" className="text-xs underline text-[var(--color-gold)]">
              Manage referrals →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}