"use client";

import { useRef } from "react";
import { site } from "@/content/site";
import { Container, Eyebrow } from "@/components/ui/Container";
import { MOTION_OK, useGsap, type GsapTools } from "@/lib/use-gsap";

const copy = site.home.pinned;

function setupPanels({ gsap, mm, root }: GsapTools) {
  // Horizontal scroll only where there is room for it and motion is welcome;
  // otherwise the panels are a plain stacked grid.
  mm.add(MOTION_OK, () => {
    const q = gsap.utils.selector(root);
    const track = q("[data-track]")[0] as HTMLElement;
    const viewport = q("[data-viewport]")[0] as HTMLElement;
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top top+=64",
        end: "bottom bottom",
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });
    tl.to(track, { x: () => -distance(), duration: 1 }, 0).fromTo(
      q("[data-progress]"),
      { scaleX: 0.25 },
      { scaleX: 1, duration: 1 },
      0,
    );

    q("[data-panel]").forEach((panel, i) => {
      if (i === 0) return;
      gsap.fromTo(
        panel.querySelector("[data-panel-art]"),
        { rotate: -12, scale: 0.85 },
        {
          rotate: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: panel,
            containerAnimation: tl,
            start: "left right",
            end: "center center",
            scrub: true,
          },
        },
      );
    });
  });
}

const ICONS = [
  // sunrise
  <g key="sun">
    <circle cx="40" cy="46" r="16" fill="var(--accent)" />
    <path d="M8 54h64" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
    <path
      d="M40 14v8M16 26l6 6M64 26l-6 6"
      stroke="var(--accent-ink)"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </g>,
  // quiet cabin / moon
  <g key="moon">
    <path d="M52 50A20 20 0 1 1 30 20a16 16 0 0 0 22 30Z" fill="var(--accent)" />
    <circle cx="58" cy="20" r="3" fill="var(--accent-ink)" />
    <circle cx="66" cy="34" r="2" fill="var(--accent-ink)" />
  </g>,
  // hub
  <g key="hub" stroke="var(--ink)" strokeWidth="3" fill="none">
    <path d="M40 40 14 18M40 40l26-22M40 40 12 58M40 40l28 18" strokeLinecap="round" />
    <circle cx="40" cy="40" r="10" fill="var(--accent)" stroke="none" />
    {[
      [14, 18],
      [66, 18],
      [12, 58],
      [68, 58],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="var(--surface)" />
    ))}
  </g>,
  // tag
  <g key="tag">
    <path d="M14 38 38 14h26v26L40 64Z" fill="var(--accent)" />
    <circle cx="54" cy="24" r="5" fill="var(--surface)" />
    <path d="M26 44l10 10" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
  </g>,
];

export function PinnedPanels() {
  const ref = useRef<HTMLElement>(null);
  useGsap(ref, setupPanels);

  return (
    <section
      ref={ref}
      aria-labelledby="pinned-title"
      className="relative motion-ok:h-[320vh] motion-ok:overflow-x-clip"
    >
      <div className="py-20 motion-ok:sticky motion-ok:top-16 motion-ok:flex motion-ok:h-[calc(100svh-4rem)] motion-ok:flex-col motion-ok:justify-center motion-ok:overflow-hidden motion-ok:py-8">
        <Container>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h2
            id="pinned-title"
            className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl"
          >
            {copy.title}
          </h2>
          <p className="mt-3 hidden max-w-xl text-ink-muted motion-ok:block">{copy.intro}</p>
        </Container>

        <div data-viewport className="mt-10 motion-ok:overflow-hidden">
          <ol
            data-track
            className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 motion-ok:flex motion-ok:w-max motion-ok:max-w-none motion-ok:gap-6 motion-ok:will-change-transform"
          >
            {copy.panels.map((panel, i) => (
              <li
                key={panel.title}
                data-panel
                className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-7 shadow-sm sm:p-9 motion-ok:min-h-[22rem] motion-ok:w-[min(82vw,30rem)]"
              >
                {/* Decorative numeral via CSS content, so it isn't treated as low-contrast text. */}
                <span
                  aria-hidden="true"
                  data-kicker={panel.kicker}
                  className="absolute -top-6 -right-2 font-display text-[9rem] leading-none font-bold text-ink/[0.06] before:content-[attr(data-kicker)]"
                />
                <svg data-panel-art viewBox="0 0 80 72" className="h-20 w-20" aria-hidden="true">
                  {ICONS[i]}
                </svg>
                <h3 className="mt-8 font-display text-2xl font-semibold tracking-tight">
                  <span className="sr-only">{panel.kicker}. </span>
                  {panel.title}
                </h3>
                <p className="mt-3 leading-relaxed text-ink-muted">{panel.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <Container className="mt-8 hidden motion-ok:block">
          <div aria-hidden="true" className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-line">
            <div data-progress className="h-full origin-left scale-x-25 rounded-full bg-accent" />
          </div>
        </Container>
      </div>
    </section>
  );
}
