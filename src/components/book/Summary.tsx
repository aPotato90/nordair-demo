"use client";

import { m } from "motion/react";
import { airportByCode } from "@/content/airports";
import { site } from "@/content/site";
import { formatMoney } from "@/lib/pricing";
import { formatDuration, type FlightOption, type SearchQuery } from "@/lib/search";
import { LogoMark } from "@/components/brand/Logo";

const copy = site.book.summary;

function Leg({ label, flight, seats }: { label: string; flight: FlightOption; seats?: string[] }) {
  const from = airportByCode(flight.from);
  const to = airportByCode(flight.to);
  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[1fr_auto]">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-ink uppercase">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">
          {from.city} <span aria-hidden="true">→</span>
          <span className="sr-only">{copy.to}</span> {to.city}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {flight.date} · {flight.departTime}–{flight.arriveTime}
          {flight.arrivalDayOffset > 0 ? ` (+${flight.arrivalDayOffset})` : ""} ·{" "}
          {formatDuration(flight.durationMinutes)} · {flight.flightNumber}
        </p>
      </div>
      {seats && seats.length > 0 && (
        <p className="text-sm sm:text-right">
          <span className="block text-ink-muted">{copy.seats}</span>
          <span className="font-display text-lg font-semibold">{seats.join(", ")}</span>
        </p>
      )}
    </div>
  );
}

export function Summary({
  query,
  outbound,
  inbound,
  seats,
}: {
  query: SearchQuery;
  outbound: FlightOption;
  inbound: FlightOption | null;
  seats: string[];
}) {
  const legs = [outbound, ...(inbound ? [inbound] : [])];
  const fare = legs.reduce((sum, f) => sum + f.fare.farePerPassenger, 0) * query.passengers;
  const taxes = legs.reduce((sum, f) => sum + f.fare.taxesPerPassenger, 0) * query.passengers;
  const total = fare + taxes;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-lg">
      <div className="on-dark flex items-center justify-between gap-4 bg-navy px-6 py-4 text-white">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <LogoMark className="h-7 w-7" /> {site.name}
        </span>
        <span className="text-sm text-white/85">
          {site.book.cabins[query.cabin]} · {query.passengers} {copy.passengers.toLowerCase()}
        </span>
      </div>

      <div className="relative px-6">
        <m.div
          aria-hidden="true"
          initial={{ scale: 2.2, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 18 }}
          data-label={copy.stamp}
          className="pointer-events-none absolute right-6 bottom-4 rounded-lg border-4 border-accent-ink px-3 py-1 font-display text-2xl font-black tracking-widest text-accent-ink before:content-[attr(data-label)]"
        />
        <div className="divide-y divide-dashed divide-line">
          <Leg label={copy.outbound} flight={outbound} seats={seats} />
          {inbound && <Leg label={copy.inbound} flight={inbound} />}
        </div>
      </div>

      {/* Perforation */}
      <div aria-hidden="true" className="relative h-6">
        <span className="absolute top-1/2 -left-3 h-6 w-6 -translate-y-1/2 rounded-full border border-line bg-bg" />
        <span className="absolute top-1/2 -right-3 h-6 w-6 -translate-y-1/2 rounded-full border border-line bg-bg" />
        <span className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-line" />
      </div>

      <dl className="grid gap-2 px-6 pb-6 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">{copy.fare}</dt>
          <dd className="tabular-nums">{formatMoney(fare)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">{copy.taxes}</dt>
          <dd className="tabular-nums">{formatMoney(taxes)}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-semibold">{copy.total}</dt>
          <dd className="font-display text-3xl font-bold tabular-nums">{formatMoney(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
