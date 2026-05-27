import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)]">About CHAOS</div>
        <h1 className="mt-3 font-serif text-5xl leading-tight">
          A B2B marketplace built around the way the trade actually works.
        </h1>
        <div className="prose prose-neutral mt-8 max-w-none text-foreground">
          <p className="text-lg text-muted-foreground">
            CHAOS connects independent gemstone and diamond dealers — primarily in Jaipur, Surat, Bangkok and Colombo — with jewellers and jewellery businesses in the UK, US, Europe and Australia.
          </p>
          <h2 className="mt-10 font-serif text-2xl">Two functions, one dataset</h2>
          <p className="text-muted-foreground">
            The platform is both a searchable directory of verified stones and a live API feed layer. Western jewellers browse the marketplace to discover stones and vendors, then follow specific suppliers to receive their inventory as a JSON feed they can embed in their own websites. Dealers upload once; their stones appear on multiple jeweller websites automatically.
          </p>
          <h2 className="mt-10 font-serif text-2xl">Built for the trade</h2>
          <p className="text-muted-foreground">
            Every dealer is reviewed and approved before listing. Sold stones drop out of every connected feed within 60 seconds. Markup multipliers are set per vendor, retail prices calculated automatically.
          </p>
        </div>
        <div className="mt-10 flex gap-3">
          <Link to="/sign-up/jeweller"><Button>I'm a jeweller</Button></Link>
          <Link to="/sign-up/dealer"><Button variant="outline">I'm a dealer</Button></Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}