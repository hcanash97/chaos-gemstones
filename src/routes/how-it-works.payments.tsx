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
          "How payments work on Chaos: direct dealer–jeweller settlement, recommended methods (Bank/Wise/PayPal), and our 2% platform fee.",
      },
      { property: "og:title", content: "How payments work — Chaos" },
      { property: "og:description", content: "Direct dealer-to-jeweller payments, low platform fees, Stripe Connect coming soon." },
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

        <section className="mt-12">
          <h2 className="font-serif text-2xl">3. Transaction fees</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            Chaos charges a small platform fee on completed transactions. This is invoiced monthly to the
            jeweller based on self-reported completed orders. It covers platform running costs and is
            significantly lower than any existing trade platform.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <FeeBox label="Rate" value="2%" sub="of wholesale value" />
            <FeeBox label="Minimum" value="£5" sub="per transaction" />
            <FeeBox label="Maximum" value="£150" sub="per transaction" />
          </div>
        </section>

        <section className="mt-12 rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-gold)]" />
            <h2 className="font-serif text-2xl">4. Coming soon — Stripe Connect</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            On-platform payment processing via Stripe Connect is in development. This will automate fee
            collection, support card payments in your local currency, and add structured buyer/seller
            protection for stones shipped through Chaos.
          </p>
          <Badge className="mt-4 bg-[var(--color-gold)]/15 text-[var(--color-gold)]">In development</Badge>
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

function FeeBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-5 text-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-3xl text-[var(--color-gold)]">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}