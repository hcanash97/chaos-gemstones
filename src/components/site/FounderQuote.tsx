export function FounderQuote() {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="font-serif text-5xl leading-none text-[var(--color-gold)]">&ldquo;</div>
        <blockquote className="mt-2 font-serif text-2xl leading-relaxed text-foreground md:text-3xl">
          Chaos was built by a working jeweller who was tired of the same broken
          supply chain. This is the platform I wished existed.
        </blockquote>
        <div className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Founder · À Vie Diamonds
        </div>
      </div>
    </section>
  );
}
