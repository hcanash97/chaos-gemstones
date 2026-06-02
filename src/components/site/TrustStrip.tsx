const COUNTRIES = [
  { flag: "🇮🇳", name: "India" },
  { flag: "🇱🇰", name: "Sri Lanka" },
  { flag: "🇹🇭", name: "Thailand" },
  { flag: "🇲🇲", name: "Myanmar" },
  { flag: "🇨🇴", name: "Colombia" },
];

export function TrustStrip() {
  return (
    <div className="border-b border-border bg-secondary/30 py-5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 text-xs text-muted-foreground">
        <span className="uppercase tracking-[0.2em]">Trusted by dealers in</span>
        {COUNTRIES.map((c) => (
          <span key={c.name} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="text-base">{c.flag}</span>
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
