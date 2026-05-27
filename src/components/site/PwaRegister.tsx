import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isPreviewHost = () =>
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com"));

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export function PwaRegister() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // In preview/iframe contexts, proactively unregister any SW so changes
    // are not blocked by stale caches.
    if (isPreviewHost() || isInIframe()) {
      navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }

    if ("serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      };
      window.addEventListener("load", onLoad);

      const onBeforeInstall = (e: Event) => {
        e.preventDefault();
        const dismissed = localStorage.getItem("chaos-install-dismissed");
        const sessionShown = sessionStorage.getItem("chaos-install-shown");
        if (dismissed || sessionShown) return;
        setPrompt(e as BeforeInstallPromptEvent);
        setHidden(false);
        sessionStorage.setItem("chaos-install-shown", "1");
      };
      window.addEventListener("beforeinstallprompt", onBeforeInstall);

      return () => {
        window.removeEventListener("load", onLoad);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }
  }, []);

  if (hidden || !prompt) return null;

  const dismiss = () => {
    localStorage.setItem("chaos-install-dismissed", "1");
    setHidden(true);
  };

  const install = async () => {
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } finally {
      setHidden(true);
      setPrompt(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Install Chaos"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-emerald)] p-3 text-[#F5F0E0] shadow-2xl md:left-1/2 md:right-auto md:-translate-x-1/2"
    >
      <div className="flex-1 text-sm">
        <div className="font-medium">Add Chaos to your home screen</div>
        <div className="text-xs opacity-70">Quick access to the marketplace anytime.</div>
      </div>
      <button
        onClick={install}
        className="rounded-md bg-[var(--color-gold)] px-3 py-1.5 text-sm font-semibold text-[#0F1B3D] hover:opacity-90"
      >
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-md p-1.5 text-white/70 hover:bg-white/10"
      >
        ×
      </button>
    </div>
  );
}