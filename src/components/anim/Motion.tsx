import { motion, useInView, useMotionValue, useTransform, animate, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export const stagger = (delay = 0.08): Variants => ({
  hidden: {},
  show:   { transition: { staggerChildren: delay, delayChildren: 0.05 } },
});

/** Fade-up section that triggers when scrolled into view. */
export function FadeUp({
  children,
  delay = 0,
  className,
  as: As = "div" as any,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: any;
}) {
  const MotionTag = (motion as any)[As as string] ?? motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </MotionTag>
  );
}

/** Container that staggers its motion children once in view. */
export function StaggerGroup({
  children,
  className,
  delay = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/** Animate a number from 0 → value when it scrolls into view. */
export function CountUp({
  value,
  duration = 1.6,
  className,
  format,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => (format ? format(v) : Math.round(v).toLocaleString()));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [inView, value, duration, mv]);

  return <motion.span ref={ref} className={className}>{rounded}</motion.span>;
}

/** Split a string into words and fade each one in sequentially. */
export function WordReveal({
  text,
  className,
  delay = 0,
  wordDelay = 0.08,
}: {
  text: string;
  className?: string;
  delay?: number;
  wordDelay?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: delay + i * wordDelay }}
        >
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </span>
  );
}