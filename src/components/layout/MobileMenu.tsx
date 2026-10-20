"use client";

import Link from "next/link";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { site } from "@/content/site";
import { Logo } from "@/components/brand/Logo";

const ease = [0.76, 0, 0.24, 1] as const;

/**
 * Full-screen menu for small screens. Uses a native <dialog> (focus trap, Esc, inert
 * background for free) and animates a circular "porthole" reveal from the button.
 */
export function MobileMenu({ pathname }: { pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  const openMenu = () => {
    dialogRef.current?.showModal();
    setOpen(true);
  };
  const closeMenu = () => setOpen(false);

  const origin = "calc(100% - 2.25rem) 2.75rem";
  const panel = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { clipPath: `circle(0% at ${origin})` },
        animate: { clipPath: `circle(150% at ${origin})` },
        exit: { clipPath: `circle(0% at ${origin})` },
      };

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink lg:hidden"
      >
        <span className="sr-only">{site.header.menuOpen}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={site.header.menuTitle}
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-transparent"
      >
        <AnimatePresence onExitComplete={() => dialogRef.current?.close()}>
          {open && (
            <m.div
              key="menu"
              {...panel}
              transition={{ duration: reduce ? 0.15 : 0.6, ease }}
              className="on-dark flex h-full flex-col bg-navy text-white"
            >
              <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                <Logo className="text-white" />
                <button
                  type="button"
                  onClick={closeMenu}
                  autoFocus
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white"
                >
                  <span className="sr-only">{site.header.menuClose}</span>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <nav
                aria-label={site.header.navLabel}
                className="flex flex-1 flex-col justify-center px-6 pb-16"
              >
                <ul className="space-y-2">
                  {site.nav.map((item, i) => {
                    const current = item.href === pathname;
                    return (
                      <li key={item.href} className="overflow-hidden">
                        <m.div
                          initial={reduce ? false : { y: "110%" }}
                          animate={{ y: 0 }}
                          exit={reduce ? undefined : { y: "110%", transition: { duration: 0.25 } }}
                          transition={{ delay: 0.18 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <Link
                            href={item.href}
                            onClick={closeMenu}
                            aria-current={current ? "page" : undefined}
                            className={`block py-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl ${
                              current ? "text-accent-strong" : "text-white hover:text-accent-strong"
                            }`}
                          >
                            {item.label}
                          </Link>
                        </m.div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-10 max-w-sm text-sm text-white/80">{site.demoStrip}</p>
              </nav>
            </m.div>
          )}
        </AnimatePresence>
      </dialog>
    </>
  );
}
