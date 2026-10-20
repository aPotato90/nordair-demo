"use client";

import { LayoutGroup, m } from "motion/react";
import { useState } from "react";
import { airportByCode } from "@/content/airports";
import { site } from "@/content/site";
import { formatMoney } from "@/lib/pricing";
import { formatDuration, sortFlights, type FlightOption, type SortKey } from "@/lib/search";
import { Segmented } from "@/components/ui/Segmented";

const copy = site.book.results;

function FlightCard({
  flight,
  name,
  selected,
  onSelect,
  index,
}: {
  flight: FlightOption;
  name: string;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const from = airportByCode(flight.from);
  const to = airportByCode(flight.to);
  const via = flight.via ? airportByCode(flight.via) : null;
  const inputId = `${name}-${flight.id}`;

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ layout: { type: "spring", stiffness: 380, damping: 34 }, delay: index * 0.06 }}
    >
      <label
        htmlFor={inputId}
        className={`relative grid cursor-pointer gap-4 rounded-2xl border-2 bg-surface p-4 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] sm:grid-cols-[1fr_auto] sm:p-5 ${
          selected ? "border-accent-ink" : "border-line hover:border-ink-muted"
        }`}
      >
        <input
          id={inputId}
          type="radio"
          name={name}
          checked={selected}
          onChange={onSelect}
          className="sr-only"
        />
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-5">
          <div>
            <p className="font-display text-2xl font-bold tabular-nums">{flight.departTime}</p>
            <p className="text-sm text-ink-muted">{from.code}</p>
          </div>
          <div className="text-center text-xs text-ink-muted">
            <p>{formatDuration(flight.durationMinutes)}</p>
            <div aria-hidden="true" className="relative my-1.5 h-px bg-line">
              <span className="absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-line" />
              <span className="absolute top-1/2 right-0 h-2 w-2 -translate-y-1/2 rounded-full bg-line" />
              <svg
                viewBox="0 0 24 24"
                className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-accent-ink transition-[left] duration-700 ease-out ${
                  selected ? "left-[calc(100%-0.5rem)]" : "left-1/2"
                }`}
              >
                <path
                  d="M2 13l8-1 4-8h2l-2 8 6-1 2-3h2l-1 5 1 5h-2l-2-3-6-1 2 8h-2l-4-8-8-1Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <p>{via ? copy.oneStop(via.city) : copy.direct}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums">
              {flight.arriveTime}
              {flight.arrivalDayOffset > 0 && (
                <sup className="ml-0.5 text-xs text-accent-ink">+{flight.arrivalDayOffset}</sup>
              )}
            </p>
            <p className="text-sm text-ink-muted">{to.code}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
          <div className="text-sm text-ink-muted">
            <p className="font-semibold text-ink">{flight.flightNumber}</p>
            <p>{flight.aircraft}</p>
            <p>{copy.seatsLeft(flight.seatsLeft)}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold">{formatMoney(flight.fare.totalPerPassenger)}</p>
            <p className="text-xs text-ink-muted">{copy.perPassenger}</p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                selected ? "bg-accent text-on-accent" : "bg-surface-2 text-ink"
              }`}
            >
              {selected ? copy.selected : copy.select}
            </span>
          </div>
        </div>
      </label>
    </m.li>
  );
}

function FlightList({
  title,
  name,
  flights,
  sort,
  selectedId,
  onSelect,
}: {
  title: string;
  name: string;
  flights: FlightOption[];
  sort: SortKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = sortFlights(flights, sort);
  const first = flights[0];
  return (
    <fieldset className="mt-8">
      <legend className="font-display text-xl font-semibold">
        {title}{" "}
        {first && (
          <span className="text-base font-normal text-ink-muted">
            · {airportByCode(first.from).city} → {airportByCode(first.to).city} · {first.date}
          </span>
        )}
      </legend>
      {sorted.length === 0 ? (
        <p className="mt-4 text-ink-muted">{copy.noResults}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {sorted.map((flight, i) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              name={name}
              index={i}
              selected={selectedId === flight.id}
              onSelect={() => onSelect(flight.id)}
            />
          ))}
        </ul>
      )}
    </fieldset>
  );
}

export function Results({
  outbound,
  inbound,
  selection,
  onSelect,
}: {
  outbound: FlightOption[];
  inbound: FlightOption[];
  selection: { outbound: string | null; inbound: string | null };
  onSelect: (leg: "outbound" | "inbound", id: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("price");

  return (
    <LayoutGroup>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-muted" aria-live="polite">
          {copy.summary(outbound.length + inbound.length)}
        </p>
        <Segmented
          legend={copy.sortLabel}
          name="sort"
          value={sort}
          onChange={setSort}
          visuallyHiddenLegend
          options={[
            { value: "price", label: copy.sortPrice },
            { value: "departure", label: copy.sortDeparture },
            { value: "duration", label: copy.sortDuration },
          ]}
        />
      </div>
      <FlightList
        title={copy.outbound}
        name="outbound"
        flights={outbound}
        sort={sort}
        selectedId={selection.outbound}
        onSelect={(id) => onSelect("outbound", id)}
      />
      {inbound.length > 0 && (
        <FlightList
          title={copy.inbound}
          name="inbound"
          flights={inbound}
          sort={sort}
          selectedId={selection.inbound}
          onSelect={(id) => onSelect("inbound", id)}
        />
      )}
    </LayoutGroup>
  );
}
