import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { captureRefFromUrl, applyStoredRefForUser } from "@/lib/referral";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { LaunchBanner } from "@/components/site/LaunchBanner";

export const Route = createFileRoute("/sign-up/jeweller")({
  component: JewellerSignUp,
});

const MARKETS = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "France",
  "Germany",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Italy",
  "Spain",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Austria",
  "Portugal",
  "Singapore",
  "Hong Kong",
  "Japan",
  "United Arab Emirates",
  "South Africa",
  "Other",
];

function JewellerSignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<{ message: string; action?: "login" } | null>(null);
  useEffect(() => { captureRefFromUrl(); }, []);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    company_name: "",
    country: "",
    terms_accepted: false,
  });

  function validateForm(): string | null {
    if (!form.full_name) return "Please enter your full name";
    if (!form.company_name) return "Company name is required";
    if (!form.country) return "Please select your country";
    if (!form.email) return "Please enter your email";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (!form.terms_accepted) return "You must agree to the Terms of Service and Privacy Policy";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const err = validateForm();
    if (err) {
      setFormError({ message: err });
      toast.error(err);
      return;
    }
    setLoading(true);
    const { data: signUp, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          account_type: "jeweller",
          full_name: form.full_name,
          company_name: form.company_name,
          country: form.country,
        },
      },
    });
    if (error) {
      setLoading(false);
      const msg = error.message || "Sign-up failed";
      const lower = msg.toLowerCase();
      if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
        setFormError({
          message: "An account with this email already exists. Try logging in instead, or use the password reset link.",
          action: "login",
        });
      } else if (lower.includes("password")) {
        setFormError({ message: `${msg}. Try a longer, less common password (mix of letters, numbers, symbols).` });
      } else if (lower.includes("email") || lower.includes("invalid")) {
        setFormError({ message: msg });
      } else {
        setFormError({ message: msg });
      }
      toast.error(msg);
      return;
    }

    const uid = signUp.user?.id;
    if (uid) {
      await supabase
        .from("profiles")
        .update({
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("id", uid);
      await supabase
        .from("jeweller_profiles")
        .update({
          primary_market: form.country || null,
        })
        .eq("id", uid);
      await applyStoredRefForUser(uid);
    }
    setLoading(false);
    toast.success("Account created — pending approval");
    navigate({ to: "/pending-approval" });
  }

  const linkClass = "text-[var(--color-gold)] underline-offset-4 hover:underline";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">For Jewellers</div>
        <h1 className="mt-2 font-serif text-4xl">Create a jeweller account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Source verified stones from trusted dealers.</p>

        <div className="mt-6">
          <LaunchBanner />
        </div>

        <form className="mt-10 space-y-4" onSubmit={submit}>
          {formError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p>{formError.message}</p>
                {formError.action === "login" && (
                  <Link to="/login" className="mt-1 inline-block font-medium underline underline-offset-4">
                    Go to log in →
                  </Link>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Full name <span className="text-destructive">*</span></Label>
            <Input
              value={form.full_name}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, full_name: v.replace(/\b\w/g, (c) => c.toUpperCase()) });
              }}
              placeholder="e.g. Jane Smith"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Company name <span className="text-destructive">*</span></Label>
            <Input
              value={form.company_name}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, company_name: v.replace(/\b\w/g, (c) => c.toUpperCase()) });
              }}
              placeholder="e.g. Smith Jewellers"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Country <span className="text-destructive">*</span></Label>
            <select
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            >
              <option value="">Select your country…</option>
              {MARKETS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Password <span className="text-destructive">*</span></Label>
            <Input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1.5"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">At least 8 characters.</p>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs text-muted-foreground">
            <Checkbox
              checked={!!form.terms_accepted}
              onCheckedChange={(v) => setForm({ ...form, terms_accepted: !!v })}
              className="mt-0.5"
            />
            <span>
              I agree to the{" "}
              <Link to="/legal/terms-jewellers" target="_blank" className={linkClass}>
                Jeweller Terms
              </Link>{" "}
              and the{" "}
              <Link to="/legal/privacy" target="_blank" className={linkClass}>
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <div className="mt-8 flex items-center justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
            >
              {loading ? "Creating…" : "Create Account"}
            </Button>
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground">
            New accounts require admin approval before dashboard access is granted.
          </p>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="text-foreground hover:text-[var(--color-gold)]">
              Log in
            </Link>
          </div>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}
