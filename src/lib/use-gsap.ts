"use client";

import { useEffect, type RefObject } from "react";

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerType = typeof import("gsap/ScrollTrigger").ScrollTrigger;

export interface GsapTools {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerType;
  mm: gsap.MatchMedia;
  root: HTMLElement;
}

/** Media query under which scroll-scrubbed motion runs. Everything else gets the static layout. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/**
 * Lazily loads GSAP + ScrollTrigger (kept out of the initial bundle) and runs `setup`
 * inside a gsap.matchMedia scoped to `scope`. Everything is reverted on unmount.
 * `setup` should be a stable (module-level) function.
 */
export function useGsap(scope: RefObject<HTMLElement | null>, setup: (tools: GsapTools) => void) {
  useEffect(() => {
    let cancelled = false;
    let mm: gsap.MatchMedia | undefined;

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      const root = scope.current;
      if (cancelled || !root) return;
      gsap.registerPlugin(ScrollTrigger);
      mm = gsap.matchMedia(root);
      setup({ gsap, ScrollTrigger, mm, root });
      // Fonts and images can change layout after load; re-measure once they settle.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    return () => {
      cancelled = true;
      mm?.revert();
    };
  }, [scope, setup]);
}
