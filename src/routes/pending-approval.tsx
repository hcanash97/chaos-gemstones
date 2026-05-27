import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/pending-approval")({ component: Pending });

function Pending() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <Clock className="mx-auto h-10 w-10 text-[var(--color-gold)]" />
        <h1 className="mt-4 font-serif text-3xl">Account pending approval</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Thanks for joining Chaos. New accounts are reviewed by our team before dashboard access is granted. You'll receive an email once you're approved.
        </p>
        <Link to="/" className="mt-6 inline-block"><Button variant="outline">Back to homepage</Button></Link>
      </div>
      <SiteFooter />
    </div>
  );
}