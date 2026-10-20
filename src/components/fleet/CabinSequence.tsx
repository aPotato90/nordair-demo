"use client";

import { useRef } from "react";
import { site } from "@/content/site";
import { CABIN_LAYOUT } from "@/lib/seats";
import { MOTION_OK, useGsap, type GsapTools } from "@/lib/use-gsap";

const copy = site.fleet;
type CabinId = (typeof copy.cabins)[number]["id"];

/** Cabin "mood lighting" per class, used for the backdrop and seat colours. */
const MOOD: Record<CabinId, { glow: string; seat: string; accent: string }> = {
  economy: { glow: "#7fb2ff", seat: "#5f86c9", accent: "#ffc27a" },
  comfort: { glow: "#ffb35c", seat: "#d9864a", accent: "#ffe0b0" },
  business: { glow: "#b48cff", seat: "#6b4bb0", accent: "#ff8a4c" },
};

const VIEW_W = 320;
const VIEW_H = 460;

/** Seats laid out top-down inside a fuselage section, derived from the same layouts as the seat map. */
function seatRects(id: CabinId) {
  const layout = CABIN_LAYOUT[id];
  const rows = id === "economy" ? 8 : id === "comfort" ? 6 : 4;
  const seatW = id === "business" ? 40 : id === "comfort" ? 26 : 30;
  const seatH = id === "business" ? 70 : id === "comfort" ? 42 : 36;
  const gapX = id === "business" ? 8 : id === "comfort" ? 3 : 4;
  const aisle = id === "comfort" ? 18 : 34;
  const seatsPerRow = layout.blocks.flat().length;
  const rowWidth =
    seatsPerRow * seatW + (seatsPerRow - layout.blocks.length) * gapX + (layout.blocks.length - 1) * aisle;
  const startX = (VIEW_W - rowWidth) / 2;
  const pitch = (VIEW_H - 120) / rows;

  const rects: Array<{ x: number; y: number; w: number; h: number; key: string }> = [];
  for (let r = 0; r < rows; r++) {
    let x = startX;
    layout.blocks.forEach((block, b) => {
      if (b > 0) x += aisle - gapX;
      block.forEach((letter) => {
        rects.push({ x, y: 80 + r * pitch, w: seatW, h: seatH, key: `${r}${letter}` });
        x += seatW + gapX;
      });
    });
  }
  return rects;
}

function CabinArt({ id }: { id: CabinId }) {
  const mood = MOOD[id];
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-[36svh] w-auto md:h-[min(68svh,32rem)]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.3" r="0.8">
          <stop offset="0" stopColor={mood.glow} stopOpacity="0.45" />
          <stop offset="1" stopColor={mood.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* fuselage */}
      <path
        d={`M40 ${VIEW_H} L40 70 Q40 10 ${VIEW_W / 2} 6 Q${VIEW_W - 40} 10 ${VIEW_W - 40} 70 L${VIEW_W - 40} ${VIEW_H} Z`}
        fill="#0e1a33"
        stroke="#2a3b63"
        strokeWidth="3"
      />
      <rect x="40" y="40" width={VIEW_W - 80} height={VIEW_H - 40} fill={`url(#glow-${id})`} />
      {/* windows */}
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} fill={mood.accent} opacity="0.7">
          <rect x="33" y={86 + i * 40} width="6" height="16" rx="3" />
          <rect x={VIEW_W - 39} y={86 + i * 40} width="6" height="16" rx="3" />
        </g>
      ))}
      {seatRects(id).map((s) => (
        <g key={s.key} data-seat>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={id === "business" ? 10 : 7} fill={mood.seat} />
          <rect
            x={s.x + 3}
            y={s.y + 3}
            width={s.w - 6}
            height={id === "business" ? 14 : 8}
            rx="4"
            fill={mood.accent}
            opacity="0.85"
          />
        </g>
      ))}
    </svg>
  );
}

function setupCabins({ gsap, mm, root }: GsapTools) {
  mm.add(MOTION_OK, () => {
    const q = gsap.utils.selector(root);
    const panels = q("[data-cabin]");
    const glow = q("[data-glow]")[0];
    const dots = q("[data-dot]");
    const counter = q("[data-counter]")[0];

    gsap.set(panels.slice(1), { opacity: 0 });
    gsap.set(panels[0], { opacity: 1 });

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: root,
        start: "top top+=64",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          const index = Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1)));
          counter.textContent = String(index + 1);
          dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
        },
      },
    });

    panels.forEach((panel, i) => {
      if (i === 0) return;
      const prev = panels[i - 1];
      const at = i - 0.5;
      const id = panel.getAttribute("data-cabin") as CabinId;
      tl.to(
        prev.querySelectorAll("[data-seat]"),
        {
          scale: 0.2,
          opacity: 0,
          transformOrigin: "50% 50%",
          stagger: { each: 0.008, from: "end" },
          duration: 0.25,
        },
        at - 0.25,
      )
        .to(prev.querySelector("[data-copy]"), { y: -40, opacity: 0, duration: 0.25 }, at - 0.25)
        .to(prev, { opacity: 0, duration: 0.05 }, at)
        .set(panel, { opacity: 1 }, at)
        .fromTo(
          panel.querySelectorAll("[data-seat]"),
          { scale: 0.2, opacity: 0, transformOrigin: "50% 50%" },
          { scale: 1, opacity: 1, stagger: { each: 0.01, from: "center" }, duration: 0.3 },
          at,
        )
        .fromTo(
          panel.querySelector("[data-copy]"),
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.25 },
          at + 0.05,
        )
        .to(glow, { backgroundColor: MOOD[id].glow, duration: 0.4 }, at - 0.2);
    });
    // Hold on the last cabin for a moment before releasing.
    tl.to({}, { duration: 0.35 });
  });
}

export function CabinSequence() {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, setupCabins);

  return (
    <section ref={ref} aria-label={copy.title} className="relative motion-ok:h-[380vh]">
      <div className="on-dark relative overflow-hidden bg-navy text-white motion-ok:sticky motion-ok:top-16 motion-ok:h-[calc(100svh-4rem)] motion-ok:min-h-[36rem]">
        <div
          data-glow
          aria-hidden="true"
          className="absolute -top-1/3 left-1/2 h-[120%] w-[120%] -translate-x-1/2 rounded-full bg-[#7fb2ff] opacity-20 blur-3xl"
        />

        <div className="relative mx-auto h-full max-w-7xl px-4 sm:px-6">
          <ol className="divide-y divide-white/10 motion-ok:divide-y-0">
            {copy.cabins.map((cabin, i) => (
              <li
                key={cabin.id}
                data-cabin={cabin.id}
                className={`grid content-center items-center gap-6 py-14 md:grid-cols-2 md:gap-8 motion-ok:absolute motion-ok:inset-x-4 motion-ok:inset-y-0 motion-ok:py-8 sm:motion-ok:inset-x-6 ${
                  i > 0 ? "motion-ok:opacity-0" : ""
                }`}
              >
                <div data-copy>
                  <p className="text-sm font-semibold tracking-[0.2em] text-[#ffc59b] uppercase">
                    {copy.progressLabel} {i + 1} / {copy.cabins.length}
                  </p>
                  <h2 className="mt-2 font-display text-4xl font-bold tracking-tight sm:mt-3 sm:text-6xl">
                    {cabin.name}
                  </h2>
                  <p className="mt-2 text-lg text-white/85">
                    {cabin.layout} · {cabin.pitch}
                  </p>
                  <p className="mt-3 max-w-md leading-relaxed text-white/90 sm:mt-5 sm:text-lg">
                    {cabin.body}
                  </p>
                  <ul className="mt-4 hidden space-y-2 sm:mt-6 sm:block">
                    {cabin.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-white/90">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-center">
                  <CabinArt id={cabin.id} />
                </div>
              </li>
            ))}
          </ol>

          <div
            aria-hidden="true"
            className="absolute bottom-6 left-4 hidden items-center gap-3 text-sm text-white/85 sm:left-6 motion-ok:flex"
          >
            <span className="font-display text-2xl font-bold text-white">
              <span data-counter>1</span>/{copy.cabins.length}
            </span>
            {copy.cabins.map((c, i) => (
              <span
                key={c.id}
                data-dot
                className={`h-2 w-8 rounded-full bg-white/25 transition-colors [&.is-active]:bg-accent ${i === 0 ? "is-active" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
