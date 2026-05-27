import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { LegalShell, LegalSection } from "@/components/site/LegalShell";

export const Route = createFileRoute("/legal/terms-jewellers")({
  head: () => ({
    meta: [
      { title: "Jeweller Terms of Service — Chaos" },
      { name: "description", content: "Terms of Service for trade jewellers sourcing gemstones on the Chaos marketplace." },
    ],
  }),
  component: TermsJewellersPage,
});

function TermsJewellersPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <LegalShell
        eyebrow="Legal"
        title="Jeweller Terms of Service"
        updated="Effective 27 May 2026"
      >
        <LegalSection n="1" title="Trade-only access">
          <p>
            Chaos is a B2B platform open only to verified trade buyers —
            jewellery designers, ateliers, retailers, and bench jewellers
            purchasing for resale or commissioned work. It is not open to the
            general public. By creating a Jeweller account you confirm you are
            acting in the course of a registered trade or business.
          </p>
        </LegalSection>
        <LegalSection n="2" title="Retail pricing &amp; customer relationships">
          <p>
            You are solely responsible for the retail price you charge your
            customers, for your own warranties, and for your direct customer
            relationships. Chaos has no involvement in your downstream sales.
          </p>
        </LegalSection>
        <LegalSection n="3" title="API feed data">
          <p>
            Stone availability, pricing, and metadata exposed through your API
            key are provided in good faith but cannot be guaranteed to be
            real-time. Dealers may mark a stone reserved or sold at any moment;
            you must confirm availability before quoting a customer a firm
            price or delivery date.
          </p>
        </LegalSection>
        <LegalSection n="4" title="Provenance &amp; representation">
          <p>
            Stones sourced via Chaos originate from independent third-party
            dealers. You must not represent these stones as your own
            manufactured or mined product to your customers. Honest provenance
            disclosure to your customers is your responsibility.
          </p>
        </LegalSection>
        <LegalSection n="5" title="Disputes">
          <p>
            Any commercial dispute arising from a transaction — including but
            not limited to misdescription, late delivery, damage in transit,
            certification disagreements, or refund requests — is a matter
            between you and the dealer. Chaos provides messaging tools and may,
            at its discretion, mediate, but is not a party to the transaction
            and accepts no liability for losses arising from it.
          </p>
        </LegalSection>
        <LegalSection n="6" title="Account suspension">
          <p>
            Chaos reserves the right to suspend or terminate any account that
            breaches these Terms, abuses the API, or harms dealers or other
            users of the platform.
          </p>
        </LegalSection>
        <LegalSection n="7" title="Governing law">
          <p>
            These Terms are governed by the laws of England and Wales. The
            courts of England and Wales have exclusive jurisdiction over any
            dispute arising from or in connection with these Terms.
          </p>
        </LegalSection>
      </LegalShell>
      <SiteFooter />
    </div>
  );
}