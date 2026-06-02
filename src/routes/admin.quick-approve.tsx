import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const search = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/admin/quick-approve")({
  validateSearch: (s) => search.parse(s),
  component: QuickApprovePage,
});

function QuickApprovePage() {
  const { token } = useSearch({ from: "/admin/quick-approve" });
  const { isAdmin, loading } = useAuth();
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !isAdmin || !token || state !== "idle") return;
    (async () => {
      setState("running");
      try {
        const res = await fetch("/api/public/admin/quick-approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string; alreadyApproved?: boolean; profile?: { full_name: string | null; email: string | null } };
        if (!json.ok) {
          setState("error");
          setMessage(json.error || "Could not approve.");
          return;
        }
        setName(json.profile?.full_name || json.profile?.email || "the user");
        setMessage(json.alreadyApproved ? "Already approved." : "Approved.");
        setState("done");
      } catch (e) {
        setState("error");
        setMessage(e instanceof Error ? e.message : "Network error.");
      }
    })();
  }, [loading, isAdmin, token, state]);

  if (loading) return <Wrapper>Loading…</Wrapper>;
  if (!isAdmin) return <Wrapper>Sign in as an admin to use quick approve. <Link to="/login" className="underline">Log in</Link></Wrapper>;
  if (!token) return <Wrapper>Missing token.</Wrapper>;

  return (
    <Wrapper>
      {state === "running" && <p>Approving account…</p>}
      {state === "done" && (
        <>
          <h1 className="font-serif text-2xl">{message}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{name} can now access their dashboard.</p>
          <Link to="/admin" className="mt-6 inline-block rounded-md bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-gold-foreground)]">
            Open admin panel
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <h1 className="font-serif text-2xl text-destructive">Couldn't approve</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <Link to="/admin" className="mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm">Go to admin panel</Link>
        </>
      )}
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}