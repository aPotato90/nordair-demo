"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { site } from "@/content/site";
import { THEME_KEY } from "./head-script";

type Theme = "light" | "dark";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
const getServerSnapshot = (): Theme | null => null;

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(next: Theme, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  const commit = () => {
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage unavailable: theme still applies for this page view */
    }
  };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !origin || typeof document.startViewTransition !== "function") {
    commit();
    return;
  }

  // Circular "sunrise" reveal of the new theme from the toggle button.
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  const transition = document.startViewTransition(commit);
  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        {
          duration: 550,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // React's dev-mode remount can clear the attribute the head script set; restore it.
  useLayoutEffect(() => {
    const saved = storedTheme();
    if (saved && document.documentElement.getAttribute("data-theme") !== saved) {
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  // Before hydration the theme is unknown; default to the light-theme label.
  const label = theme === "dark" ? site.header.themeToLight : site.header.themeToDark;

  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        applyTheme(getSnapshot() === "dark" ? "light" : "dark", {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }}
      aria-label={label}
      title={label}
      className={`relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent-ink ${className}`}
    >
      {/* Sun (shown in light theme) */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="absolute h-5 w-5 transition-transform duration-500 ease-out dark:translate-y-8 dark:rotate-90"
      >
        <circle cx="12" cy="12" r="4.5" fill="var(--accent)" />
        <g stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </g>
      </svg>
      {/* Moon (shown in dark theme) */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="absolute h-5 w-5 -translate-y-8 -rotate-90 transition-transform duration-500 ease-out dark:translate-y-0 dark:rotate-0"
      >
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="var(--accent-ink)" />
      </svg>
    </button>
  );
}
