"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/content/site";
import { Logo } from "@/components/brand/Logo";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={site.header.homeLabel} className="text-ink">
          <Logo />
        </Link>

        <nav aria-label={site.header.navLabel} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {site.nav.slice(1).map((item) => {
              const current = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`relative rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      current ? "text-ink" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-accent transition-transform duration-300 ${
                        current ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/book"
            className="hidden rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-transform hover:-translate-y-0.5 sm:inline-block"
          >
            {site.header.cta}
          </Link>
          <MobileMenu pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
