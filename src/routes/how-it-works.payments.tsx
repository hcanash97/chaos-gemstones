import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { LaunchBanner } from "@/components/site/LaunchBanner";
import { Badge } from "@/components/ui/badge";
import { Building2, Send, CreditCard, Sparkles } from "lucide-react";

export const Route = createFileRoute("/how-it-works/payments")({
  head: () => ({
    meta: [
      { title: "How payments work — Chaos" },
      {
        name: "description",
        content:
          "Payments on Chaos: direct dealer-to-jeweller settlement, recommended methods (Bank/Wise/PayPal). Free during launch beta — no fees, no subscriptions.",
      },
      { property: "og:title", content: "How payments work — Chaos" },
      { property: "og:description", content: "Direct dealer-to-jeweller payments. Free during launch beta." },
      { property: "og:url", content: "/how-it-works/payments" },
    ],
    links: [{ rel: "canonical", href: "/how-it-works/payments" }],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-gold)]">How it works</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Payments on Chaos</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Transparent, low-fee, and dealer-first. Here&rsquo;s exactly how money moves on the platform today
          and what&rsquo;s coming next.
        </p>

        <LaunchBanner className="mt-8" />

        <section className="mt-12">
          <h2 className="font-serif text-2xl">1. How payments work</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            Chaos currently operates as a lead-generation and data distribution platform. Payments for stones
            are made <span className="font-medium">directly between the jeweller and the dealer</span> using
            their preferred method. Chaos does not hold or process funds at this stage. Once both parties
            agree terms on an enquiry, you settle outside the platform and confirm the order back inside Chaos.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">2. Recommended payment methods</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Method
              icon={<Building2 className="h-4 w-4" />}
              title="Bank transfer"
              note="SWIFT / IBAN for international. Most secure for large orders; settlement 1–3 business days."
            />
            <Method
              icon={<Send className="h-4 w-4" />}
              title="Wise"
              note="Recommended for India ↔ UK / US transfers. Mid-market FX, low fees, often same-day."
              tag="Best for India"
            />
            <Method
              icon={<CreditCard className="h-4 w-4" />}
              title="PayPal Business"
              note="Fast for smaller first orders. Higher fees, but useful buyer/seller protection."
            />
          </div>
        </section>

        <section className="mt-12 rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-gold)]" />
            <h2 className="font-serif text-2xl">3. Fees</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            Chaos is completely free during our launch beta. There are no listing fees, no subscription fees,
            and no transaction fees. We will introduce a small platform fee in the future — dealers and jewellers
            will receive at least 30 days notice before any fees apply, and the fee structure will always be
            transparent and performance-based. We only earn when you do.
          </p>
          <Badge className="mt-4 bg-[var(--color-gold)]/15 text-[var(--color-gold)]">Free during launch beta</Badge>
        </section>

        <div className="mt-12 text-sm text-muted-foreground">
          See also:{" "}
          <Link to="/how-it-works/shipping" className="text-foreground hover:text-[var(--color-gold)]">
            Shipping &amp; customs guidance
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Method({ icon, title, note, tag }: { icon: React.ReactNode; title: string; note: string; tag?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[var(--color-gold)]">{icon}<span className="font-serif text-lg text-foreground">{title}</span></div>
      {tag && <Badge className="mt-2 bg-[var(--color-gold)]/15 text-[var(--color-gold)] text-[10px]">{tag}</Badge>}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}
