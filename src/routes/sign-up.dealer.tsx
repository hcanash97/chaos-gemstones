import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/sign-up/dealer")({ component: SignUpDealer });

function SignUpDealer() {
  return <SignUpForm accountType="dealer" />;
}

export function SignUpForm({ accountType }: { accountType: "dealer" | "jeweller" }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", company_name: "", country: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
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
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — pending approval");
    navigate({ to: "/pending-approval" });
  }

  const title = accountType === "dealer" ? "Become a verified dealer" : "Create a jeweller account";
  const sub = accountType === "dealer"
    ? "List your inventory and reach jewellers worldwide."
    : "Source verified stones from trusted dealers.";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
          {accountType === "dealer" ? "For Dealers" : "For Jewellers"}
        </div>
        <h1 className="mt-2 font-serif text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Company name</Label><Input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Country</Label><Input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Password</Label><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" /></div>
          <Button type="submit" disabled={loading} className="w-full bg-[var(--color-gold)] text-[var(--color-gold-foreground)] hover:opacity-90">
            {loading ? "Creating…" : "Create account"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            New accounts require admin approval before dashboard access is granted.
          </p>
        </form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already registered? <Link to="/login" className="text-foreground hover:text-[var(--color-gold)]">Log in</Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}