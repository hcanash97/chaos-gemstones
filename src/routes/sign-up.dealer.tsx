import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { LaunchBanner } from "@/components/site/LaunchBanner";

export const Route = createFileRoute("/sign-up/dealer")({
  component: () => <SignUpForm accountType="dealer" />,
});

const SPECIALITIES = [
  "Sapphires", "Rubies", "Emeralds", "Spinels", "Diamonds", "Lab-grown diamonds",
  "Tanzanite", "Tourmaline", "Aquamarine", "Opal", "Garnet", "Topaz",
  "Pearls", "Jade", "Antique cuts", "Fancy colour diamonds",
];

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
            {i < total - 1 && (
              <div className={`h-px flex-1 ${i < step ? "bg-[var(--color-gold)]" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {labels.map((l, i) => (
          <span key={l} className={i === step ? "text-foreground" : ""}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export function SignUpForm({ accountType }: { accountType: "dealer" | "jeweller" }) {
  const navigate = useNavigate();
  const isDealer = accountType === "dealer";
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({
    email: "", password: "", full_name: "", company_name: "", country: "", city: "",
    phone: "", website: "", bio: "", specialities: [] as string[], terms_accepted: false,
  });

  const labels = isDealer
    ? ["Account", "Company", "Specialities"]
    : ["Account", "Business"];
  const total = labels.length;

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.full_name) return "Please enter your full name";
      if (!form.email) return "Please enter your email";
      if (form.password.length < 8) return "Password must be at least 8 characters";
      if (!form.terms_accepted) return "You must agree to the Terms of Service and Privacy Policy";
    }
    if (step === 1) {
      if (!form.company_name) return "Company name is required";
      if (!form.country) return "Country is required";
    }
    return null;
  }

  async function submit() {
    setLoading(true);
    const { data: signUp, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          account_type: accountType,
          full_name: form.full_name,
          company_name: form.company_name,
          country: form.country,
        },
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }

    const uid = signUp.user?.id;
    if (uid) {
      await supabase.from("profiles").update({
        city: form.city || null,
        phone: form.phone || null,
        website: form.website || null,
        terms_accepted_at: new Date().toISOString(),
      }).eq("id", uid);
      if (isDealer) {
        await supabase.from("dealer_profiles").update({
          bio: form.bio || null,
          specialities: form.specialities,
        }).eq("id", uid);
      } else {
        await supabase.from("jeweller_profiles").update({
          bio: form.bio || null,
          website: form.website || null,
        }).eq("id", uid);
      }
    }
    setLoading(false);
    toast.success("Account created — pending approval");
    navigate({ to: "/pending-approval" });
  }

  function next() {
    const err = validateStep();
    if (err) return toast.error(err);
    if (step < total - 1) setStep(step + 1);
    else submit();
  }

  const title = isDealer ? "Become a verified dealer" : "Create a jeweller account";
  const sub = isDealer
    ? "List your inventory and reach jewellers worldwide."
    : "Source verified stones from trusted dealers.";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
          {isDealer ? "For Dealers" : "For Jewellers"}
        </div>
        <h1 className="mt-2 font-serif text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>

        {isDealer && <div className="mt-6"><LaunchBanner /></div>}

        <div className="mt-10">
          <Progress step={step} total={total} labels={labels} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {step === 0 && <StepAccount form={form} setForm={setForm} />}
              {step === 1 && <StepCompany form={form} setForm={setForm} isDealer={isDealer} />}
              {isDealer && step === 2 && <StepSpecialities form={form} setForm={setForm} />}
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
            Already registered? <Link to="/login" className="text-foreground hover:text-[var(--color-gold)]">Log in</Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function StepAccount({ form, setForm }: StepProps) {
  const linkClass = "text-[var(--color-gold)] underline-offset-4 hover:underline";
  return (
    <>
      <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" /></div>
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" /></div>
      <div><Label>Password</Label><Input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" /><p className="mt-1 text-[11px] text-muted-foreground">At least 8 characters.</p></div>
      <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs text-muted-foreground">
        <Checkbox
          checked={!!form.terms_accepted}
          onCheckedChange={(v) => setForm({ ...form, terms_accepted: !!v })}
          className="mt-0.5"
        />
        <span>
          I agree to the{" "}
          <Link to="/legal/terms-dealers" target="_blank" className={linkClass}>Dealer Terms</Link>
          {" / "}
          <Link to="/legal/terms-jewellers" target="_blank" className={linkClass}>Jeweller Terms</Link>
          {" "}and the{" "}
          <Link to="/legal/privacy" target="_blank" className={linkClass}>Privacy Policy</Link>.
        </span>
      </label>
    </>
  );
}

function StepCompany({ form, setForm, isDealer }: StepProps & { isDealer: boolean }) {
  return (
    <>
      <div><Label>Company name</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1.5" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1.5" /></div>
        <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1.5" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
        <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" className="mt-1.5" /></div>
      </div>
      <div>
        <Label>{isDealer ? "Short company bio" : "About your business"}</Label>
        <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1.5" placeholder={isDealer ? "Founded in 1982, we specialise in…" : "Bespoke fine jewellery atelier based in…"} />
      </div>
    </>
  );
}

function StepSpecialities({ form, setForm }: StepProps) {
  function toggle(s: string) {
    const cur: string[] = form.specialities;
    setForm({ ...form, specialities: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  }
  return (
    <>
      <Label>Select the categories you trade in</Label>
      <p className="mt-1 text-xs text-muted-foreground">Pick all that apply. You can refine later.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SPECIALITIES.map((s) => {
          const on = form.specialities.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                on
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-gold-foreground)]"
                  : "border-border text-foreground hover:border-[var(--color-gold)]"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {form.specialities.length > 0 && (
        <div className="mt-4 text-xs text-muted-foreground">
          Selected: <Badge variant="secondary">{form.specialities.length}</Badge>
        </div>
      )}
    </>
  );
}