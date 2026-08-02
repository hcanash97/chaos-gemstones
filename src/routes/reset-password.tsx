import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(!!data.session);
      setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage({ kind: "error", text: "Please use at least 8 characters for your new password." });
      return;
    }
    if (password !== confirm) {
      setMessage({ kind: "error", text: "The two passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ kind: "error", text: error.message });
        toast.error(error.message);
        return;
      }
      setMessage({ kind: "success", text: "Password updated. You can now log in with the new password." });
      toast.success("Password updated");
      setTimeout(() => navigate({ to: "/login" }), 1200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-serif text-4xl">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the reset link from your email, then enter your new password below.
        </p>
        {checkingSession ? (
          <p className="mt-8 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            Checking reset link...
          </p>
        ) : !hasSession ? (
          <div className="mt-8 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-900">
            This reset link is missing, expired, or has already been used. Please request a new password reset email.
            <div className="mt-3">
              <Link to="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5"
                autoComplete="new-password"
              />
            </div>
            {message && (
              <div
                role="status"
                className={`rounded-md border px-3 py-2 text-sm ${
                  message.kind === "error"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                }`}
              >
                {message.text}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Update password"}
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
