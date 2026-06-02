import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { LegalShell, LegalSection } from "@/components/site/LegalShell";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Chaos" },
      { name: "description", content: "How Chaos collects, uses and protects personal data under UK GDPR." },
      { property: "og:title", content: "Privacy Policy — Chaos" },
      { property: "og:description", content: "How Chaos collects, uses and protects personal data under UK GDPR." },
      { property: "og:url", content: "/legal/privacy" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <LegalShell
        eyebrow="Legal"
        title="Privacy Policy"
        updated="Effective 27 May 2026"
      >
        <LegalSection n="1" title="What we collect">
          <p>We collect the following categories of personal data:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Account details — name, email, password hash, company name, country, city, phone, website.</li>
            <li>Uploaded content — stone listings, photographs, videos, certification scans, pricing.</li>
            <li>Enquiry messages exchanged between dealers and jewellers on the platform.</li>
            <li>API key usage logs — timestamps, IP addresses, and request volume for each key.</li>
            <li>Basic analytics — page views, referrer, device and browser type.</li>
          </ul>
        </LegalSection>
        <LegalSection n="2" title="How we use it">
          <p>We use your data only to:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Operate the platform — display your listings, deliver enquiries, serve API feeds.</li>
            <li>Send transactional notifications (new enquiries, replies, approval emails).</li>
            <li>Detect abuse, fraud, or breaches of our Terms.</li>
            <li>Improve the service through aggregate analytics.</li>
          </ul>
          <p className="mt-3">We do not sell personal data and we do not run advertising on the platform.</p>
        </LegalSection>
        <LegalSection n="3" title="Third-party processors">
          <p>
            We rely on a small number of trusted infrastructure providers who
            process data on our behalf:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Database, authentication, and file storage hosting.</li>
            <li>Transactional email delivery for notifications.</li>
            <li>Application hosting and CDN.</li>
          </ul>
          <p className="mt-3">All processors are bound by their own data-processing agreements and operate in jurisdictions providing an adequate level of protection.</p>
        </LegalSection>
        <LegalSection n="4" title="Your rights (UK GDPR)">
          <p>You have the right to:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Access the personal data we hold about you.</li>
            <li>Have inaccurate data corrected (rectification).</li>
            <li>Have your data deleted (erasure), subject to legal retention rules.</li>
            <li>Restrict or object to processing.</li>
            <li>Receive your data in a portable format.</li>
            <li>Lodge a complaint with the UK Information Commissioner&rsquo;s Office (ICO).</li>
          </ul>
        </LegalSection>
        <LegalSection n="5" title="Data requests">
          <p>
            To exercise any of these rights, email us at the address shown on
            this page once our custom domain is live. We aim to respond within
            30 days. We are registered with the UK ICO.
          </p>
        </LegalSection>
        <LegalSection n="6" title="Governing law">
          <p>
            This policy is governed by the laws of England and Wales and the
            UK Data Protection Act 2018 (UK GDPR).
          </p>
        </LegalSection>
      </LegalShell>
      <SiteFooter />
    </div>
  );
}