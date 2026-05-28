import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import { LaunchBanner } from "@/components/site/LaunchBanner";

export const Route = createFileRoute("/sign-up/jeweller")({
  component: JewellerSignUp,
});

const MARKETS = ["United Kingdom", "United States", "Canada", "Australia", "Europe", "Other"];

const SOURCING_OPTIONS = ["Trade shows", "Personal contacts", "Existing platforms", "Social media", "Other"];

const INTEREST_OPTIONS = ["Natural diamonds", "Lab-grown diamonds", "Coloured gemstones", "All"];

type StepProps = { form: any; setForm: (v: any) => void };

function Progress({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                i < step
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-gold-foreground)]"
                  : i === step
                    ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                    : "border-border text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < total - 1 && <div className={`h-px flex-1 ${i < step ? "bg-[var(--color-gold)]" : "bg-border"}`} />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {labels.map((l, i) => (
          <span key={l} className={i === step ? "text-foreground" : ""}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function JewellerSignUp() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<{ message: string; action?: "login" } | null>(null);
  const [form, setForm] = useState<any>({
    email: "",
    password: "",
    full_name: "",
    company_name: "",
    primary_market: "",
    website: "",
    sourcing: "",
    interests: [] as string[],
    terms_accepted: false,
  });

  const labels = ["Account", "Business"];
  const total = 2;

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.full_name) return "Please enter your full name";
      if (!form.email) return "Please enter your email";
      if (form.password.length < 8) return "Password must be at least 8 characters";
      if (!form.terms_accepted) return "You must agree to the Terms of Service and Privacy Policy";
    }
    if (step === 1) {
      if (!form.company_name) return "Company name is required";
      if (!form.primary_market) return "Please select your primary market";
    }
    return null;
  }

  async function submit() {
    setLoading(true);
    setFormError(null);
    const { data: signUp, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          account_type: "jeweller",
          full_name: form.full_name,
          company_name: form.company_name,
          country: form.primary_market,
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
        setStep(0);
      } else if (lower.includes("email") || lower.includes("invalid")) {
        setFormError({ message: msg });
        setStep(0);
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
          website: form.website || null,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("id", uid);
      await supabase
        .from("jeweller_profiles")
        .update({
          website: form.website || null,
        })
        .eq("id", uid);
    }
    setLoading(false);
    toast.success("Account created — pending approval");
    navigate({ to: "/pending-approval" });
  }

  function next() {
    setFormError(null);
    const err = validateStep();
    if (err) {
      setFormError({ message: err });
      toast.error(err);
      return;
    }
    if (step < total - 1) setStep(step + 1);
    else submit();
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

        <div className="mt-10">
          <Progress step={step} total={total} labels={labels} />

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

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {step === 0 && (
                <>
                  <div>
                    <Label>Full name</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
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
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <Label>Company name</Label>
                    <Input
                      value={form.company_name}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Primary market</Label>
                    <select
                      className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.primary_market}
                      onChange={(e) => setForm({ ...form, primary_market: e.target.value })}
                    >
                      <option value="">Select your main market…</option>
                      {MARKETS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Website URL</Label>
                    <Input
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="https://"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>How do you currently source stones?</Label>
                    <div className="mt-2 space-y-2">
                      {SOURCING_OPTIONS.map((opt) => (
                        <label key={opt} className="flex cursor-pointer items-center gap-2.5 text-sm">
                          <input
                            type="radio"
                            name="sourcing"
                            value={opt}
                            checked={form.sourcing === opt}
                            onChange={() => setForm({ ...form, sourcing: opt })}
                            className="accent-[var(--color-gold)]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Primary interest</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map((opt) => {
                        const on = form.interests.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const cur: string[] = form.interests;
                              setForm({
                                ...form,
                                interests: on ? cur.filter((x: string) => x !== opt) : [...cur, opt],
                              });
                            }}
                            className={`rounded-full border px-3 py-1.5 text-xs transition ${
                              on
                                ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-gold-foreground)]"
                                : "border-border text-foreground hover:border-[var(--color-gold)]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0 || loading}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={next}
              disabled={loading}
              className="bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90"
            >
              {loading ? "Creating…" : step === total - 1 ? "Create account" : "Continue"}
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
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
