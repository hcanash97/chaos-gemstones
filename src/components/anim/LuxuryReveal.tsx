import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import type { SiteThemeSettings } from "@/lib/site-theme";

type LuxuryRevealProps = {
  children: ReactNode;
  preset?: SiteThemeSettings["animation_preset"];
  className?: string;
  delay?: number;
};

export function LuxuryReveal({ children, preset = "luxury-fade", className, delay = 0 }: LuxuryRevealProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  const variants: Variants =
    preset === "spring-slide"
      ? {
          hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
          show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 80, damping: 18, delay } },
        }
      : preset === "classic-fade"
      ? {
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut", delay } },
        }
      : {
          hidden: { opacity: 0, y: 18, filter: "blur(14px)" },
          show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const, delay } },
        };

  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={variants}>
      {children}
    </motion.div>
  );
}

export function ParallaxScroll({
  children,
  enabled = true,
  intensity = 40,
  className,
}: {
  children: ReactNode;
  enabled?: boolean;
  intensity?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, enabled && !reduceMotion ? -intensity : 0]);

  if (!enabled || reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
