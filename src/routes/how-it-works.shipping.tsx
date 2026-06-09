import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Plane, Package, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/how-it-works/shipping")({
  head: () => ({
    meta: [
      { title: "Gemstone Shipping Guide — International Delivery & Customs — Chaos Gemstones" },
      {
        name: "description",
        content:
          "How to ship loose gemstones internationally. Recommended carriers, customs guidance, insurance, and Incoterms for dealers and jewellers.",
      },
      { property: "og:title", content: "Gemstone Shipping Guide — International Delivery & Customs — Chaos Gemstones" },
      { property: "og:description", content: "How to ship gemstones internationally — carriers, customs, and packaging." },
      { property: "og:url", content: "/how-it-works/shipping" },
    ],
    links: [{ rel: "canonical", href: "https://chaosgemstones.com/how-it-works/shipping" }],
  }),
  component: ShippingPage,
});

const carriers = [
  {
    name: "Malca-Amit",
    note: "Specialist jewellery and high-value logistics. Fully insured door-to-door. 3–5 days door to door internationally. Recommended for orders above $10,000.",
  },
  {
    name: "Brinks",
    note: "Armoured carrier with declared-value insurance, used by the bullion and trade industry. Best for very high-value parcels.",
  },
  {
    name: "FedEx International Priority",
    note: "Declared value up to $50,000 (subject to FedEx limits and signed shipper's release). 2–3 working days India → UK. Good balance of speed and cost.",
  },
  {
    name: "DHL Express",
    note: "Reliable 2–4 day international service with declared value coverage. Strong tracking; widely accepted by jewellery insurers.",
  },
];

function ShippingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-gold)]">How it works</div>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Shipping &amp; customs</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Best-practice guidance for moving certified stones internationally. Chaos does not arrange or
          insure shipments — terms are agreed directly between dealer and jeweller, but these are the
          options we recommend.
        </p>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">Recommended carriers</h2>
          <div className="mt-4 grid gap-3">
            {carriers.map((c) => (
              <div key={c.name} className="rounded-md border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-[var(--color-gold)]" />
                  <span className="font-serif text-lg">{c.name}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">Customs &amp; duty (UK example)</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            Stones shipped from India to the UK are subject to UK import duty (currently{" "}
            <span className="font-medium">2.5% for cut diamonds</span>, varies by HS code for coloured
            stones) and <span className="font-medium">VAT at 20%</span> on the import value (stone +
            shipping + insurance + duty). The jeweller / importer of record is responsible for clearance
            and duty payment.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            Dealers should supply:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-foreground/85">
            <li>A commercial invoice stating the stone&rsquo;s wholesale value and HS code.</li>
            <li>A copy of the grading certificate (GIA, GRS, SSEF, IGI, etc.).</li>
            <li>Country-of-origin documentation where available.</li>
            <li>Kimberley Process certificate for rough/cut diamonds where required.</li>
          </ul>
        </section>

        <section className="mt-12 rounded-md border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--color-gold)]" />
            <h2 className="font-serif text-2xl">Risk &amp; responsibility</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            Chaos does not arrange or insure shipments. Shipping terms — who pays, who insures, and when
            risk transfers — should be agreed between dealer and jeweller <em>before</em> the order is
            confirmed. Our recommended default is{" "}
            <span className="font-medium">CIF (Cost, Insurance, Freight)</span> to the jeweller&rsquo;s
            address, so the dealer arranges insured carriage and risk transfers on delivery.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">For dealers — packaging tips</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground/85">
            <li>
              <span className="font-medium">Loose stones:</span> use a sealed gem paper inside a hard-shell
              gem jar, padded inside a small rigid carton. Never ship loose in a soft envelope.
            </li>
            <li>
              <span className="font-medium">Declare value accurately</span> on the commercial invoice — under-
              declaring voids insurance and can result in confiscation by customs.
            </li>
            <li>
              <span className="font-medium">Tamper-evident packaging:</span> use security tape and a sealed
              outer carton so any interference is visible on arrival.
            </li>
            <li>
              <span className="font-medium">No "diamond" or "gemstone" labelling</span> on the outer
              packaging — keep it discreet. Use a neutral description on the outer waybill where the
              carrier allows.
            </li>
            <li>
              <span className="font-medium">Photograph the parcel sealed</span> before handing it to the
              carrier — this protects both sides in any dispute.
            </li>
          </ul>
        </section>

        <div className="mt-12 text-sm text-muted-foreground">
          See also:{" "}
          <Link to="/how-it-works/payments" className="text-foreground hover:text-[var(--color-gold)]">
            How payments work
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}