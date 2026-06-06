import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import appCss from "../styles.css?url";
import { PwaRegister } from "@/components/site/PwaRegister";
import { CompareProvider } from "@/contexts/CompareContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CompareBar } from "@/components/site/CompareBar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteThemeBridge } from "@/components/site/SiteThemeBridge";
import { DEFAULT_SITE_THEME } from "@/lib/site-theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-serif italic text-xs uppercase tracking-[0.3em] text-[var(--color-gold)]">CHAOS</div>
        <h1 className="mt-4 font-serif text-7xl text-foreground">404</h1>
        <h2 className="mt-3 font-serif text-2xl text-foreground">This page is off the cutting wheel</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center rounded-md bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-gold-foreground)] transition-colors hover:opacity-90"
          >
            Back to marketplace
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: DEFAULT_SITE_THEME.seo_title },
      { name: "description", content: DEFAULT_SITE_THEME.seo_description },
      { property: "og:site_name", content: DEFAULT_SITE_THEME.site_name.toUpperCase() },
      { property: "og:title", content: DEFAULT_SITE_THEME.seo_title },
      { property: "og:description", content: DEFAULT_SITE_THEME.seo_description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: DEFAULT_SITE_THEME.accent_color },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: DEFAULT_SITE_THEME.site_name.toUpperCase() },
      { name: "twitter:title", content: DEFAULT_SITE_THEME.seo_title },
      { name: "twitter:description", content: DEFAULT_SITE_THEME.seo_description },
      { property: "og:image", content: DEFAULT_SITE_THEME.seo_image_url },
      { name: "twitter:image", content: DEFAULT_SITE_THEME.seo_image_url },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "alternate", hreflang: "en-gb", href: "https://chaosgemstones.com" },
      { rel: "alternate", hreflang: "en-us", href: "https://chaosgemstones.com" },
      { rel: "alternate", hreflang: "en-au", href: "https://chaosgemstones.com" },
      { rel: "alternate", hreflang: "en-ca", href: "https://chaosgemstones.com" },
      { rel: "alternate", hreflang: "en", href: "https://chaosgemstones.com" },
      { rel: "alternate", hreflang: "x-default", href: "https://chaosgemstones.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <CompareProvider>
          <TooltipProvider delayDuration={200}>
          <SiteThemeBridge />
          <ImpersonationBanner />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded focus:bg-[var(--color-gold)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--color-gold-foreground)]"
          >
            Skip to main content
          </a>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <main id="main-content" className="pb-16 md:pb-0"><Outlet /></main>
            </motion.div>
          </AnimatePresence>
          <CompareBar />
          <PwaRegister />
          </TooltipProvider>
        </CompareProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}
