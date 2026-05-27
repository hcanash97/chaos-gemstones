import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-serif text-4xl">Log in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to CHAOS.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
          <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in…" : "Log in"}</Button>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          New to CHAOS?{" "}
          <Link to="/sign-up/jeweller" className="text-foreground hover:text-[var(--color-gold)]">Jeweller sign up</Link>
          {" · "}
          <Link to="/sign-up/dealer" className="text-foreground hover:text-[var(--color-gold)]">Dealer sign up</Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}