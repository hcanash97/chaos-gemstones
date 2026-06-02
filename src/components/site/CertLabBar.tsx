import { ShieldCheck } from "lucide-react";

const LABS = ["GIA", "IGI", "HRD", "GRS", "AGL", "Gübelin", "SSEF", "Lotus"];

export function CertLabBar({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={`border-y border-border bg-secondary/40 ${compact ? "py-8" : "py-12"}`}
      aria-label="Certification labs"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Certified by the world&rsquo;s leading gemological laboratories
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {LABS.map((l) => (
            <span
              key={l}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold-border)] bg-card px-3.5 py-1.5 font-mono text-xs tracking-wide text-foreground shadow-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-gold)]" />
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
