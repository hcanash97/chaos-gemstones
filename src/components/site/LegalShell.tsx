import { ReactNode } from "react";

export function LegalShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-gold)]">
        {eyebrow}
      </div>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">{title}</h1>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {updated}
      </p>
      <div className="mt-12 space-y-10">{children}</div>
    </div>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-2xl text-[var(--color-gold)]">{n}.</span>
        <h2 className="font-serif text-2xl">{title}</h2>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}