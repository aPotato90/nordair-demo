"use client";

import dynamic from "next/dynamic";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { Stage3D } from "@/components/three/Stage3D";
import { MOTION_OK, useGsap, type GsapTools } from "@/lib/use-gsap";

const copy = site.home.hero;

// three.js + React Three Fiber only download if the stage decides to mount the scene.
const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

/** Scroll progress shared with the 3D scene (one hero per page). */
const heroProgress = { value: 0 };

function setupHero({ gsap, mm, root }: GsapTools) {
  mm.add(MOTION_OK, () => {
    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top top+=64",
        end: "bottom bottom",
        // Track the scroll position directly; the 3D camera adds its own easing.
        scrub: true,
        onUpdate: (self) => {
          heroProgress.value = self.progress;
          // Drives the poster crossfade (dawn → midday → dusk) in CSS.
          root.style.setProperty("--hero-p", self.progress.toFixed(4));
        },
      },
    });
    tl.to(q("[data-hero-copy]"), { yPercent: -18, autoAlpha: 0, duration: 0.08 }, 0.1)
      .fromTo(q("[data-beat='0']"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.34)
      .to(q("[data-beat='0']"), { autoAlpha: 0, y: -40, duration: 0.08 }, 0.58)
      .fromTo(q("[data-beat='1']"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.8)
      .to(q("[data-sky-indicator]"), { xPercent: 200, duration: 1 }, 0)
      .to(q("[data-scroll-cue]"), { autoAlpha: 0, duration: 0.02 }, 0.02)
      // hold the final beat for a moment
      .to({}, { duration: 0.06 });

    return () => {
      heroProgress.value = 0;
      root.style.removeProperty("--hero-p");
    };
  });
}

/** Art-directed poster: a wide render for landscape screens, a tall one for portrait. */
function Poster({
  name,
  alt,
  eager = false,
  opacity,
}: {
  name: "dawn" | "midday" | "dusk";
  alt: string;
  eager?: boolean;
  /** CSS opacity expression (used for the scroll crossfade). */
  opacity?: string;
}) {
  const common = { alt, sizes: "100vw", loading: "eager" as const };
  const wide = getImageProps({ ...common, src: `/images/hero/${name}-wide.webp`, width: 1920, height: 1080 });
  const tall = getImageProps({ ...common, src: `/images/hero/${name}-tall.webp`, width: 860, height: 1530 });
  return (
    <picture>
      <source media="(orientation: landscape)" srcSet={wide.props.srcSet} sizes="100vw" />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img
        {...tall.props}
        fetchPriority={eager ? "high" : "low"}
        className="absolute inset-0 h-full w-full object-cover"
        style={opacity ? { opacity } : undefined}
      />
    </picture>
  );
}

/** The later posters only matter once the visitor starts scrolling. */
function useHasScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(true);
    window.addEventListener("scroll", on, { once: true, passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

function HeroPosters() {
  const scrolled = useHasScrolled();
  return (
    <div className="absolute inset-0">
      <Poster name="dawn" alt={copy.posterAlt} eager />
      {scrolled && (
        <div className="hidden motion-ok:block">
          {/* Short crossfades, so two camera angles are never blended for long. */}
          <Poster name="midday" alt="" opacity="clamp(0, calc((var(--hero-p, 0) - 0.28) * 14), 1)" />
          <Poster name="dusk" alt="" opacity="clamp(0, calc((var(--hero-p, 0) - 0.66) * 14), 1)" />
        </div>
      )}
    </div>
  );
}

const sceneProps = { progress: heroProgress };

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, setupHero);

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative motion-ok:h-[300vh]">
      <div
        data-hero-frame
        className="on-dark relative min-h-[calc(100svh-4rem)] overflow-hidden bg-navy text-white motion-ok:sticky motion-ok:top-16 motion-ok:h-[calc(100svh-4rem)] motion-ok:min-h-[34rem]"
      >
        <Stage3D
          scene={HeroScene}
          sceneProps={sceneProps}
          poster={<HeroPosters />}
          className="!absolute inset-x-0 top-0 h-[calc(100svh-4rem)] min-h-[34rem] motion-ok:inset-y-0 motion-ok:h-auto"
        />

        {/* Scrim keeps copy readable over bright sky (left on wide screens, bottom on phones). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100svh-4rem)] min-h-[34rem] bg-[linear-gradient(0deg,rgb(7_15_34/0.88)_0%,rgb(7_15_34/0.55)_42%,rgb(7_15_34/0)_72%)] md:bg-[linear-gradient(90deg,rgb(7_15_34/0.82)_0%,rgb(7_15_34/0.5)_36%,rgb(7_15_34/0)_62%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 motion-ok:h-full">
          {/* First screen: copy (bottom on phones, top-left on wide screens) and the time-of-day chip. */}
          <div className="flex min-h-[calc(100svh-4rem)] flex-col pt-10 pb-8 sm:pt-20 motion-ok:h-full motion-ok:min-h-0">
            <div
              data-hero-copy
              className="mt-auto max-w-2xl [text-shadow:0_1px_18px_rgb(11_27_58/0.45)] md:mt-0"
            >
              <p
                className="fade-rise text-sm font-semibold tracking-[0.2em] text-[#ffd2ad] uppercase"
                style={{ ["--d" as string]: "0s" }}
              >
                {copy.eyebrow}
              </p>
              <h1
                id="hero-title"
                className="mt-4 font-display text-5xl leading-[0.98] font-bold tracking-tight sm:text-7xl lg:text-8xl"
              >
                {copy.headline.map((word, i) => (
                  <span key={word} className="word-mask mr-[0.22em]">
                    <span
                      className={`word-rise ${word.startsWith(copy.accentWord) ? "bg-gradient-to-r from-[#ffc27a] to-[#ff8a4c] bg-clip-text text-transparent" : ""}`}
                      style={{ ["--i" as string]: i }}
                    >
                      {word}
                    </span>
                  </span>
                ))}
              </h1>
              <p
                className="fade-rise mt-6 max-w-xl text-lg leading-relaxed text-white sm:text-xl"
                style={{ ["--d" as string]: "0.45s" }}
              >
                {copy.body}
              </p>
              <div className="fade-rise mt-8 flex flex-wrap gap-3" style={{ ["--d" as string]: "0.6s" }}>
                <Link
                  href="/book"
                  className="rounded-full bg-accent px-6 py-3.5 font-semibold text-on-accent shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
                >
                  {copy.primaryCta}
                </Link>
                <Link
                  href="/destinations"
                  className="rounded-full border border-white/60 bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  {copy.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between gap-6 md:mt-auto">
              <div
                aria-hidden="true"
                className="w-64 rounded-2xl bg-navy/70 px-4 py-3 text-xs font-semibold tracking-[0.18em] text-white uppercase backdrop-blur"
              >
                <div className="flex justify-between">
                  {copy.skyLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <div className="relative mt-2 h-1 rounded-full bg-white/25">
                  <div
                    data-sky-indicator
                    className="absolute top-0 left-0 h-1 w-1/3 rounded-full bg-[#ffc27a]"
                  />
                </div>
              </div>
              <div
                data-scroll-cue
                aria-hidden="true"
                className="hidden items-center gap-3 rounded-full bg-navy/70 py-2 pr-2 pl-4 text-sm font-medium whitespace-nowrap text-white backdrop-blur motion-ok:flex"
              >
                {copy.scrollCue}
                <span className="relative h-9 w-5 rounded-full border-2 border-white/70">
                  <span className="scroll-cue-dot absolute top-1.5 left-1/2 h-2 w-1 -translate-x-1/2 rounded-full bg-white" />
                </span>
              </div>
            </div>
          </div>

          {/* Story beats: real text. Listed below the first screen when static; revealed by scroll otherwise. */}
          <ol className="grid gap-4 pb-12 sm:grid-cols-2 motion-ok:pointer-events-none motion-ok:absolute motion-ok:inset-0 motion-ok:block motion-ok:pb-0">
            {copy.beats.map((beat, i) => (
              <li
                key={beat.title}
                data-beat={i}
                className="max-w-md rounded-2xl border border-white/15 bg-navy/70 p-5 backdrop-blur-md sm:p-6 motion-ok:invisible motion-ok:absolute motion-ok:right-4 motion-ok:bottom-28 motion-ok:left-4 sm:motion-ok:right-auto md:motion-ok:top-1/2 md:motion-ok:bottom-auto md:motion-ok:left-6 md:motion-ok:-translate-y-1/2"
              >
                <p className="text-xs font-semibold tracking-[0.2em] text-[#ffd2ad] uppercase">
                  {beat.eyebrow}
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-4xl">
                  {beat.title}
                </h2>
                <p className="mt-2 leading-relaxed text-white/90">{beat.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
