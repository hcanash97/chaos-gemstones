import { ShieldCheck } from "lucide-react";
import { FadeUp } from "@/components/anim/Motion";

const LABS = ["GIA", "IGI", "HRD", "GRS", "AGL", "Gübelin", "SSEF", "Lotus", "GIT", "GCAL"];

// Duplicated for seamless infinite scroll
const TRACK = [...LABS, ...LABS];

export function CertLabBar({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={`border-y border-border bg-secondary/40 ${compact ? "py-8" : "py-12"}`}
      aria-label="Certification labs"
    >
      <FadeUp>
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Certified by the world&rsquo;s leading gemological laboratories
          </div>
        </div>
      </FadeUp>
      <div className="cert-ticker-wrap mt-5">
        <div className="cert-ticker-track gap-2.5 px-2">
          {TRACK.map((l, i) => (
            <span
              key={i}
              className="mx-1.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--gold-border)] bg-card px-3.5 py-1.5 font-mono text-xs tracking-wide text-foreground shadow-sm"
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
