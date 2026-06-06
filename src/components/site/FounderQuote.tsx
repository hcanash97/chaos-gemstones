import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export function FounderQuote() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative overflow-hidden bg-background py-20">
      {/* Subtle radial gold bloom behind the quote */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 70% at 50% 60%, rgba(232,201,122,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif text-6xl leading-none text-[var(--color-gold)]"
        >
          &ldquo;
        </motion.div>
        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="mt-1 font-serif text-2xl leading-relaxed text-foreground md:text-3xl"
        >
          Chaos was built by a working jeweller who was tired of the same broken
          supply chain. This is the platform I wished existed.
        </motion.blockquote>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground"
        >
          Founder · À Vie Diamonds
        </motion.div>
        {/* Decorative ruled lines */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.55 }}
          className="mx-auto mt-8 h-px max-w-xs origin-center"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(232,201,122,0.4), transparent)",
          }}
          aria-hidden
        />
      </div>
    </section>
  );
}
