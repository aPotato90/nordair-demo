"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { airportByCode, type AirportCode } from "@/content/airports";
import { site } from "@/content/site";
import { cityPoints, connectionsFor } from "@/lib/map-geometry";
import { formatMoney } from "@/lib/pricing";
import { Reveal } from "@/components/ui/Reveal";
import { MapArt } from "./MapArt";

const copy = site.destinations;

/** Where each city's label sits relative to its dot, so close cities never overlap. */
const LABEL_PLACEMENT: Record<AirportCode, string> = {
  LOS: "-translate-x-1/2 -translate-y-[calc(100%+12px)]",
  PHC: "translate-x-[10px] translate-y-[10px]",
  ACC: "-translate-x-[calc(100%+12px)] -translate-y-1/2",
  LHR: "translate-x-[12px] -translate-y-1/2",
  DXB: "-translate-x-[calc(100%+12px)] -translate-y-1/2",
};

export function RouteMap({ fares }: { fares: Record<AirportCode, number> }) {
  const [active, setActive] = useState<AirportCode | null>(null);
  const airport = active ? airportByCode(active) : null;

  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start"
      onKeyDown={(event) => {
        if (event.key === "Escape") setActive(null);
      }}
    >
      <Reveal className="relative overflow-hidden rounded-3xl border border-line shadow-sm">
        <MapArt active={active} className="block h-auto w-full" />
        <div role="group" aria-label={copy.mapLabel} className="absolute inset-0">
          {cityPoints.map((city) => {
            const a = airportByCode(city.code);
            const selected = active === city.code;
            return (
              <button
                key={city.code}
                type="button"
                aria-pressed={selected}
                aria-controls="destination-card"
                onMouseEnter={() => setActive(city.code)}
                onFocus={() => setActive(city.code)}
                onClick={() => setActive(city.code)}
                style={{ left: `${city.left}%`, top: `${city.top}%` }}
                className={`absolute flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-none font-semibold whitespace-nowrap shadow-sm transition-[background-color,color,scale] duration-200 hover:scale-105 sm:min-h-8 sm:px-3 sm:text-sm ${LABEL_PLACEMENT[city.code]} ${
                  selected
                    ? "border-transparent bg-accent text-on-accent"
                    : "border-line bg-surface/95 text-ink"
                }`}
              >
                <span>{a.city}</span>
                <span className="hidden opacity-70 sm:inline">{a.code}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <div id="destination-card" className="lg:sticky lg:top-24">
        <p className="sr-only" aria-live="polite">
          {airport ? `${airport.city}, ${airport.country}` : ""}
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          {airport ? (
            <m.article
              key={airport.code}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="overflow-hidden rounded-3xl border border-line bg-surface shadow-lg"
              aria-labelledby={`card-${airport.code}`}
            >
              <div className="relative aspect-[3/2]">
                <Image
                  src={airport.image.src}
                  alt={airport.image.alt}
                  fill
                  sizes="(min-width: 1024px) 420px, 100vw"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="on-dark absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-navy/80 text-white backdrop-blur"
                >
                  <span className="sr-only">{copy.cardClose}</span>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm font-semibold text-accent-ink">
                  {airport.country} · {airport.code}
                </p>
                <h2
                  id={`card-${airport.code}`}
                  className="mt-1 font-display text-3xl font-bold tracking-tight"
                >
                  {airport.city}
                </h2>
                <p className="mt-2 text-ink-muted">{airport.tagline}</p>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-ink-muted">{copy.fromLabel}</dt>
                    <dd className="font-display text-2xl font-bold">{formatMoney(fares[airport.code])}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{copy.cardFlightsFrom}</dt>
                    <dd className="mt-1 font-medium">
                      {connectionsFor(airport.code)
                        .map((code) => airportByCode(code).city)
                        .join(", ")}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-ink-muted">{copy.cardBestTime}</dt>
                    <dd className="mt-1 font-medium">{airport.bestTime}</dd>
                  </div>
                </dl>
                <Link
                  href={`/book?to=${airport.code}`}
                  className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 font-semibold text-on-accent transition-transform hover:-translate-y-0.5"
                >
                  {copy.cardCta(airport.city)}
                </Link>
              </div>
            </m.article>
          ) : (
            <m.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid min-h-48 place-items-center rounded-3xl border-2 border-dashed border-line p-8 text-center text-ink-muted"
            >
              <p>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="bob mx-auto mb-3 h-8 w-8 text-accent-ink"
                >
                  <path
                    d="M2 13l8-1 4-8h2l-2 8 6-1 2-3h2l-1 5 1 5h-2l-2-3-6-1 2 8h-2l-4-8-8-1Z"
                    fill="currentColor"
                  />
                </svg>
                {copy.emptyCard}
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
