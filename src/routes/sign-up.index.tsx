import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { LaunchBanner } from "@/components/site/LaunchBanner";
import { GemMark } from "@/components/site/Logo";
import { GemParticles } from "@/components/site/GemParticles";
import { motion } from "framer-motion";
import { Gem, Store, Layers, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/sign-up/")({
  component: SignUpChoice,
  head: () => ({
    meta: [
      { title: "Join Chaos Gemstones — Sign up" },
      { name: "description", content: "Join Chaos as a dealer, jeweller, or both. Verified B2B marketplace for gemstones and diamonds." },
      { property: "og:title", content: "Join Chaos Gemstones" },
      { property: "og:description", content: "Pick how you want to use the platform — dealer, jeweller, or both." },
    ],
  }),
});

function SignUpChoice() {
  const cards = [
    {
      to: "/sign-up/dealer",
      icon: Store,
      kicker: "For Dealers",
      title: "I sell gemstones or diamonds",
      bullets: [
        "List your inventory on the marketplace",
        "Reach jewellers in UK, US, Canada, Australia",
        "Connect your existing inventory feed via API",
      ],
      cta: "Apply as a dealer",
      search: undefined as Record<string, string> | undefined,
    },
    {
      to: "/sign-up/jeweller",
      icon: Gem,
      kicker: "For Jewellers",
      title: "I buy stones for my jewellery business",
      bullets: [
        "Browse certified stones from verified dealers",
        "Embed a live feed into your own website",
        "Shopify, Wix, Squarespace, Webflow supported",
      ],
      cta: "Open a jeweller account",
      search: undefined,
    },
    {
      to: "/sign-up/dealer",
      icon: Layers,
      kicker: "Dual account",
      title: "I do both — I buy and sell",
      bullets: [
        "Full dealer and jeweller access",
        "Manage inventory and sourcing in one account",
        "Switch between dealer and jeweller dashboards",
      ],
      cta: "Create a dual account",
      search: { dual: "true" },
    },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">Join Chaos Gemstones</div>
          <h1 className="mt-3 font-serif text-5xl">How would you like to use the platform?</h1>
          <p className="mt-3 text-sm text-muted-foreground">Pick the option that fits — you can always change later.</p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl"><LaunchBanner /></div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.06 * i }}
              >
                <Link
                  to={c.to}
                  search={c.search as never}
                  className="group relative block h-full overflow-hidden rounded-lg border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-gold)] hover:shadow-[0_20px_50px_-20px_rgba(15,27,61,0.35)]"
                >
                  <div className="pointer-events-none absolute right-3 top-3 opacity-[0.06] transition-opacity group-hover:opacity-[0.12]">
                    <GemMark size={88} />
                  </div>
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <GemParticles count={6} />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">
                      <Icon className="h-4 w-4" />
                      {c.kicker}
                    </div>
                    <h2 className="mt-3 font-serif text-2xl leading-snug">{c.title}</h2>
                    <ul className="mt-5 space-y-2 text-sm text-foreground/85">
                      {c.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-gold)]" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-7 inline-flex items-center text-sm font-medium text-[var(--color-gold)]">
                      {c.cta}
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground hover:text-[var(--color-gold)]">Log in</Link>
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}