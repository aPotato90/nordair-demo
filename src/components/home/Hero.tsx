"use client";

import Link from "next/link";
import { useRef } from "react";
import { site } from "@/content/site";
import { MOTION_OK, useGsap, type GsapTools } from "@/lib/use-gsap";

const copy = site.home.hero;

/** Flight path control points, normalised to the hero frame (0–1). */
const PATH_POINTS = {
  start: [-0.12, 0.86],
  c1: [0.25, 0.92],
  c2: [0.42, 0.18],
  end: [1.15, 0.22],
} as const;

function pathFor(width: number, height: number) {
  const p = (key: keyof typeof PATH_POINTS) =>
    `${(PATH_POINTS[key][0] * width).toFixed(1)} ${(PATH_POINTS[key][1] * height).toFixed(1)}`;
  return `M${p("start")}C${p("c1")} ${p("c2")} ${p("end")}`;
}

function setupHero({ gsap, mm, root }: GsapTools) {
  mm.add(MOTION_OK, () => {
    const q = gsap.utils.selector(root);
    const frame = root.querySelector<HTMLElement>("[data-hero-frame]")!;
    const svg = root.querySelector<SVGSVGElement>("[data-contrail-svg]")!;
    const trail = root.querySelector<SVGPathElement>("[data-contrail]")!;
    const plane = root.querySelector<HTMLElement>("[data-plane]")!;
    const indicator = root.querySelector<HTMLElement>("[data-sky-indicator]")!;

    let length = 1;
    const layout = () => {
      const { width, height } = frame.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("preserveAspectRatio", "none");
      trail.setAttribute("d", pathFor(width, height));
      trail.removeAttribute("pathLength");
      length = trail.getTotalLength();
      trail.style.strokeDasharray = `${length}`;
    };

    const placePlane = (progress: number) => {
      const at = Math.min(Math.max(progress, 0), 1) * length;
      const p = trail.getPointAtLength(at);
      const ahead = trail.getPointAtLength(Math.min(at + 2, length));
      const behind = trail.getPointAtLength(Math.max(at - 2, 0));
      const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
      gsap.set(plane, { x: p.x, y: p.y, rotation: angle, xPercent: -50, yPercent: -50 });
      trail.style.strokeDashoffset = `${length - at}`;
    };

    layout();
    plane.style.left = "0px";
    plane.style.top = "0px";
    plane.classList.add("is-flying");

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top top+=64",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
        onRefresh: (self) => {
          layout();
          placePlane(self.progress);
        },
        onUpdate: (self) => placePlane(self.progress),
      },
    });

    tl.to(q("[data-sky='day']"), { opacity: 1, duration: 0.4 }, 0.05)
      .to(q("[data-sky='dusk']"), { opacity: 1, duration: 0.4 }, 0.5)
      .to(q("[data-stars]"), { opacity: 1, duration: 0.3 }, 0.65)
      .fromTo(
        q("[data-sun]"),
        { xPercent: 0, yPercent: 0 },
        { keyframes: { xPercent: [0, 60, 200], yPercent: [0, -320, 70] }, duration: 1 },
        0,
      )
      .to(q("[data-sun-core]"), { backgroundColor: "#ff6b3d", duration: 0.4 }, 0.55)
      .to(q("[data-cloud='far']"), { xPercent: -25, duration: 1 }, 0)
      .to(q("[data-cloud='near']"), { xPercent: -60, duration: 1 }, 0)
      .to(q("[data-city-lights]"), { opacity: 1, duration: 0.25 }, 0.72)
      .to(q("[data-hero-copy]"), { yPercent: -25, autoAlpha: 0, duration: 0.25 }, 0.12)
      .to(indicator, { xPercent: 200, duration: 1 }, 0)
      .to(q("[data-scroll-cue]"), { autoAlpha: 0, duration: 0.05 }, 0.02);

    placePlane(0);

    return () => {
      plane.style.left = "";
      plane.style.top = "";
      plane.classList.remove("is-flying");
      trail.style.strokeDasharray = "";
      trail.style.strokeDashoffset = "";
    };
  });
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, setupHero);

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative motion-ok:h-[260vh]">
      <div
        data-hero-frame
        className="on-dark sticky top-16 h-[calc(100svh-4rem)] min-h-[34rem] overflow-hidden text-white"
      >
        {/* Sky layers: dawn is the base, day and dusk fade in on scroll. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#0b1b3a_0%,#26295c_34%,#7b4170_58%,#f07a4a_80%,#ffc27a_100%)]"
        />
        <div
          data-sky="day"
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#123a70_0%,#2a64a8_42%,#79b4e3_74%,#ffe0b0_100%)] opacity-0"
        />
        <div
          data-sky="dusk"
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,#060d20_0%,#1a1442_36%,#56285f_60%,#d9532f_84%,#ff9a52_100%)] opacity-0"
        />

        <svg
          data-stars
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-0"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {STARS.map(([x, y, r], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill="#fff"
              opacity={0.5 + (i % 3) * 0.2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Sun: rises from the horizon, arcs over, sets. */}
        <div
          data-sun
          aria-hidden="true"
          className="absolute bottom-[8%] left-[44%] h-28 w-28 sm:h-36 sm:w-36"
        >
          <div className="absolute inset-[-60%] rounded-full bg-[radial-gradient(circle,#ffc27a99_0%,#ff7a3d33_40%,transparent_70%)]" />
          <div data-sun-core className="absolute inset-0 rounded-full bg-[#ffb35c]" />
        </div>

        <Clouds />

        {/* Contrail + plane */}
        <svg
          data-contrail-svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            data-contrail
            d="M-12 86C25 92 42 18 115 22"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="1 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div
          data-plane
          aria-hidden="true"
          className="absolute top-[66%] left-[72%] w-24 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] will-change-transform sm:top-[42%] sm:left-[74%] sm:w-36 [&.is-flying]:translate-x-0 [&.is-flying]:translate-y-0 [&.is-flying]:rotate-0"
        >
          <PlaneSvg />
        </div>

        <Horizon />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col px-4 pt-12 pb-24 sm:px-6 sm:pt-20">
          <div data-hero-copy className="max-w-2xl [text-shadow:0_1px_18px_rgb(11_27_58/0.45)]">
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

          <div className="mt-auto flex items-end justify-between gap-6">
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
      </div>
    </section>
  );
}

const STARS: Array<[number, number, number]> = [
  [8, 8, 0.25],
  [17, 22, 0.18],
  [26, 6, 0.2],
  [33, 15, 0.3],
  [44, 9, 0.18],
  [52, 24, 0.22],
  [61, 7, 0.28],
  [68, 18, 0.2],
  [76, 5, 0.18],
  [83, 14, 0.3],
  [91, 9, 0.2],
  [96, 26, 0.18],
  [12, 34, 0.18],
  [39, 31, 0.2],
  [72, 33, 0.18],
  [88, 38, 0.2],
  [58, 40, 0.16],
  [22, 44, 0.16],
];

function PlaneSvg() {
  return (
    <svg viewBox="0 0 160 64" className="h-auto w-full drop-shadow-[0_8px_16px_rgba(11,27,58,0.35)]">
      <defs>
        <linearGradient id="hero-fuselage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d7deea" />
        </linearGradient>
        <linearGradient id="hero-tail" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc27a" />
          <stop offset="1" stopColor="#ff6b3d" />
        </linearGradient>
      </defs>
      {/* far wing */}
      <path d="M78 30 L98 8 L108 8 L96 30 Z" fill="#b8c3d6" />
      {/* fuselage */}
      <path
        d="M14 30 C14 24 22 22 34 22 L128 22 C142 22 154 27 156 32 C154 37 142 40 128 40 L34 40 C22 40 14 36 14 30 Z"
        fill="url(#hero-fuselage)"
      />
      {/* tail fin with wing-mark colours */}
      <path d="M18 24 L8 2 L22 2 L44 24 Z" fill="url(#hero-tail)" />
      <path d="M14 30 L4 26 L6 34 Z" fill="#0b1b3a" opacity="0.6" />
      {/* near wing */}
      <path d="M70 34 L96 62 L110 62 L94 34 Z" fill="#eef2f8" stroke="#c7d0de" />
      {/* windows */}
      <g fill="#0b1b3a" opacity="0.75">
        {Array.from({ length: 11 }, (_, i) => (
          <rect key={i} x={50 + i * 7} y={27} width={3.5} height={4} rx={1.5} />
        ))}
      </g>
      <path d="M140 26 C146 27 151 29 153 31 L141 31 Z" fill="#0b1b3a" opacity="0.8" />
      {/* belly stripe */}
      <path d="M34 37 L132 37" stroke="#ff7a3d" strokeWidth="2" />
    </svg>
  );
}

function Clouds() {
  const cloud =
    "M10 40 C10 28 22 22 32 26 C36 14 54 10 62 22 C72 16 88 22 86 36 C96 38 96 50 84 50 L16 50 C6 50 4 42 10 40 Z";
  return (
    <>
      <div data-cloud="far" aria-hidden="true" className="absolute inset-x-0 top-[18%] h-40">
        <svg viewBox="0 0 100 60" className="drift absolute left-[60%] w-48 opacity-35 sm:w-64">
          <path d={cloud} fill="#fff" />
        </svg>
        <svg viewBox="0 0 100 60" className="drift absolute top-28 left-[82%] w-32 opacity-25 sm:w-44">
          <path d={cloud} fill="#fff" />
        </svg>
        <svg viewBox="0 0 100 60" className="drift absolute top-4 left-[100%] w-40 opacity-30">
          <path d={cloud} fill="#fff" />
        </svg>
      </div>
      <div data-cloud="near" aria-hidden="true" className="absolute inset-x-0 top-[48%] h-48">
        <svg viewBox="0 0 100 60" className="absolute left-[72%] w-64 opacity-60 sm:w-96">
          <path d={cloud} fill="#fff" />
        </svg>
        <svg viewBox="0 0 100 60" className="absolute top-10 left-[110%] w-72 opacity-50 sm:w-[28rem]">
          <path d={cloud} fill="#fff" />
        </svg>
        <svg viewBox="0 0 100 60" className="absolute top-20 left-[150%] w-56 opacity-55">
          <path d={cloud} fill="#fff" />
        </svg>
      </div>
    </>
  );
}

function Horizon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-[22%] w-full"
    >
      <path
        d="M0 150 C180 110 320 140 480 120 C640 100 760 150 940 130 C1100 112 1260 140 1440 118 L1440 220 L0 220 Z"
        fill="#13284f"
        opacity="0.75"
      />
      {/* skyline */}
      <path
        d="M0 220 L0 176 L60 176 L60 150 L90 150 L90 168 L130 168 L130 132 L150 120 L170 132 L170 172 L230 172 L230 158 L270 158 L270 182 L340 182 L340 160 L360 160 L360 140 L380 140 L380 178 L470 178 L470 166 L520 166 L520 186 L640 186 L640 172 L700 172 L700 146 L716 136 L732 146 L732 180 L820 180 L820 160 L860 160 L860 184 L960 184 L960 168 L1010 168 L1010 150 L1040 150 L1040 176 L1120 176 L1120 162 L1170 162 L1170 186 L1260 186 L1260 156 L1290 156 L1290 176 L1360 176 L1360 166 L1440 166 L1440 220 Z"
        fill="#0b1b3a"
      />
      <g data-city-lights opacity="0" fill="#ffc27a">
        {[72, 140, 160, 244, 352, 368, 486, 660, 706, 722, 836, 984, 1020, 1136, 1272, 1300, 1380].map(
          (x, i) => (
            <rect key={x} x={x} y={160 + (i % 4) * 6} width="4" height="4" rx="1" />
          ),
        )}
      </g>
      {/* runway */}
      <path
        d="M0 210 L1440 210"
        stroke="#ffc27a"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeDasharray="18 22"
      />
    </svg>
  );
}
