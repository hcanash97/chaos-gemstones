import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { LegalShell, LegalSection } from "@/components/site/LegalShell";

export const Route = createFileRoute("/legal/terms-dealers")({
  head: () => ({
    meta: [
      { title: "Dealer Terms of Service — Chaos" },
      { name: "description", content: "Terms of Service for gemstone dealers listing inventory on the Chaos marketplace." },
    ],
  }),
  component: TermsDealersPage,
});

function TermsDealersPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <LegalShell
        eyebrow="Legal"
        title="Dealer Terms of Service"
        updated="Effective 27 May 2026"
      >
        <LegalSection n="1" title="The platform">
          <p>
            Chaos (“we”, “our”) operates an online B2B marketplace connecting
            independent gemstone dealers (“you”, “Dealer”) with verified trade
            jewellers. By creating a Dealer account you agree to these Terms.
          </p>
        </LegalSection>
        <LegalSection n="2" title="Listing accuracy">
          <p>
            You are solely responsible for the accuracy of every piece of data
            you upload, including but not limited to species, variety, carat
            weight, dimensions, certification details, lab name and report
            number, treatment disclosure, country of origin, and price.
            Misrepresentation — whether negligent or wilful — is grounds for
            immediate removal of the listing and suspension of your account.
          </p>
        </LegalSection>
        <LegalSection n="3" title="Role of Chaos">
          <p>
            Chaos acts solely as a marketplace facilitator. We are not a party
            to any transaction between you and a jeweller, do not take title to
            any goods, and do not guarantee payment, delivery, or condition. We
            provide listing infrastructure, discovery, messaging, and an API
            feed; the underlying commercial relationship is between you and the
            buyer.
          </p>
        </LegalSection>
        <LegalSection n="4" title="Fulfilment">
          <p>
            Once a sale is confirmed through the platform you must fulfil the
            order in a timely manner, ship using a tracked, insured service,
            and keep the buyer informed of dispatch and any delays.
          </p>
        </LegalSection>
        <LegalSection n="5" title="Content licence">
          <p>
            You grant Chaos a worldwide, non-exclusive, royalty-free licence to
            display, reproduce, resize and distribute your stone images,
            videos, certification scans, and listing data on the Chaos website,
            in API feeds you have authorised, and in marketing material
            promoting the platform itself.
          </p>
        </LegalSection>
        <LegalSection n="6" title="Suspension &amp; removal">
          <p>
            Chaos reserves the right, at its sole discretion and without
            liability, to remove any listing or suspend or terminate any
            account that breaches these Terms, applicable law, or that we
            reasonably believe harms other users or the integrity of the
            marketplace.
          </p>
        </LegalSection>
        <LegalSection n="7" title="Fees">
          <p>
            Listing on Chaos is currently free during the platform’s
            introductory period. When subscription or transaction fees are
            introduced you will be given at least 30 days’ written notice.
            Subscription fees, once paid, are non-refundable.
          </p>
        </LegalSection>
        <LegalSection n="8" title="Governing law">
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