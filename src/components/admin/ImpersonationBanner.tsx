import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { clearImpersonation, getImpersonation, onImpersonationChange, type ImpersonationState } from "@/lib/impersonation";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setState(getImpersonation());
    return onImpersonationChange(() => setState(getImpersonation()));
  }, []);

  if (!state) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow">
      <span>Viewing as {state.userName}</span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-amber-900 bg-white/80 text-amber-950 hover:bg-white"
        onClick={() => {
          clearImpersonation();
          navigate({ to: "/admin", replace: true });
        }}
      >
        Exit impersonation
      </Button>
    </div>
  );
}