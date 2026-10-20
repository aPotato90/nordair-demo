import Link from "next/link";
import { site } from "@/content/site";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="on-dark mt-auto bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <Logo className="text-white" />
          <h2 className="mt-6 font-display text-lg font-semibold text-[#ffc59b]">
            {site.footer.disclaimerTitle}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">{site.footer.disclaimer}</p>
          <p className="mt-4 text-sm text-white/70">{site.footer.builtWith}</p>
        </div>
        <nav aria-label={site.footer.navLabel}>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block py-2 text-white/85 hover:text-white hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/70 sm:px-6">© {site.footer.copyright}</p>
      </div>
    </footer>
  );
}
