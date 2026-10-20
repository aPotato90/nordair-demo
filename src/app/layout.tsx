import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { headScript } from "@/components/layout/head-script";
import { Intro } from "@/components/layout/Intro";
import { Providers } from "@/components/layout/Providers";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  ...pageMetadata("/", site.home.meta),
  title: {
    default: site.home.meta.title,
    template: `%s · ${site.name} (fictional demo)`,
  },
  description: site.description,
  applicationName: `${site.name} demo`,
  // Canonical URLs are set per page.
  alternates: undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#070f22" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-bg text-ink antialiased">
        <a
          href="#main"
          className="sr-only z-[200] rounded-full bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {site.skipLink}
        </a>
        <Intro />
        <p className="bg-navy px-4 py-1.5 text-center text-xs font-medium text-white">
          <span className="mr-2 rounded bg-accent px-1.5 py-0.5 font-bold text-on-accent">
            {site.demoLabel}
          </span>
          {site.demoStrip}
        </p>
        <Providers>
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
