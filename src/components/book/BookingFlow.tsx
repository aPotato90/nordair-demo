"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { site } from "@/content/site";
import { localTodayISO, searchFlights, type FlightOption, type SearchQuery } from "@/lib/search";
import { buildSeatMap, toggleSeat } from "@/lib/seats";
import { primaryButton, secondaryButton } from "@/components/ui/form";
import { Results } from "./Results";
import { SearchForm } from "./SearchForm";
import { SeatMap } from "./SeatMap";
import { Summary } from "./Summary";

const copy = site.book;
type Step = 0 | 1 | 2 | 3;

interface Search {
  query: SearchQuery;
  outbound: FlightOption[];
  inbound: FlightOption[];
}

function Stepper({ step }: { step: Step }) {
  return (
    <nav aria-label={copy.stepLabel} className="mb-8">
      <ol className="grid grid-cols-4 gap-2">
        {copy.steps.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={label} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <m.div
                  className="h-full origin-left rounded-full bg-accent"
                  initial={false}
                  animate={{ scaleX: state === "todo" ? 0 : 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p
                className={`mt-2 truncate text-xs font-semibold sm:text-sm ${state === "todo" ? "text-ink-muted" : "text-ink"}`}
              >
                <span className="sr-only">
                  {state === "done" ? copy.stepDone : state === "current" ? copy.stepCurrent : ""}
                </span>
                {i + 1}. {label}
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function BookingFlow() {
  const reduce = useReducedMotion();
  const [step, setStepState] = useState<Step>(0);
  const [search, setSearch] = useState<Search | null>(null);
  const [selection, setSelection] = useState<{ outbound: string | null; inbound: string | null }>({
    outbound: null,
    inbound: null,
  });
  const [seats, setSeats] = useState<string[]>([]);
  const focusNextHeading = useRef(false);

  const setStep = (next: Step) => {
    focusNextHeading.current = true;
    setStepState(next);
  };

  // When a new step mounts (after the exit animation), move focus to its heading so
  // keyboard and screen-reader users follow along.
  const headingRef = useCallback(
    (el: HTMLHeadingElement | null) => {
      if (!el || !focusNextHeading.current) return;
      focusNextHeading.current = false;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    },
    [reduce],
  );

  const outboundFlight = search?.outbound.find((f) => f.id === selection.outbound) ?? null;
  const inboundFlight = search?.inbound.find((f) => f.id === selection.inbound) ?? null;
  const needsInbound = (search?.inbound.length ?? 0) > 0;
  const canContinue = !!outboundFlight && (!needsInbound || !!inboundFlight);
  const seatMap = useMemo(
    () =>
      outboundFlight && search
        ? buildSeatMap(outboundFlight.id, search.query.cabin, search.query.passengers)
        : null,
    [outboundFlight, search],
  );

  const onSearch = async (query: SearchQuery) => {
    // A short, fake "search" so the loading state is visible. Nothing is fetched.
    await new Promise((resolve) => setTimeout(resolve, reduce ? 150 : 650));
    const results = searchFlights(query, localTodayISO());
    setSearch({ query, ...results });
    setSelection({ outbound: null, inbound: null });
    setSeats([]);
    setStep(1);
  };

  const restart = () => {
    setSearch(null);
    setSelection({ outbound: null, inbound: null });
    setSeats([]);
    setStep(0);
  };

  const titles = [copy.title, copy.results.title, copy.seats.title, copy.summary.title];
  const variants = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 40 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 },
      };

  return (
    <div>
      <Stepper step={step} />
      {/* Clip the sideways slide so it never causes horizontal scrolling. */}
      <div className="overflow-x-clip">
        <AnimatePresence mode="wait" initial={false}>
          <m.section
            key={step}
            {...variants}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            aria-labelledby="step-heading"
          >
            <h2
              id="step-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mb-6 scroll-mt-24 font-display text-2xl font-bold tracking-tight focus:outline-none sm:text-3xl"
            >
              {titles[step]}
            </h2>

            {step === 0 && <SearchForm defaultValues={search?.query} onSearch={onSearch} />}

            {step === 1 && search && (
              <>
                <Results
                  outbound={search.outbound}
                  inbound={search.inbound}
                  selection={selection}
                  onSelect={(leg, id) => {
                    setSelection((s) => ({ ...s, [leg]: id }));
                    if (leg === "outbound") setSeats([]);
                  }}
                />
                <div className="sticky bottom-2 z-10 mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
                  <button type="button" className={secondaryButton} onClick={() => setStep(0)}>
                    {copy.results.back}
                  </button>
                  <div className="flex items-center gap-3">
                    {!canContinue && (
                      <p className="hidden text-sm text-ink-muted md:block">
                        {needsInbound ? copy.results.chooseBoth : copy.results.chooseOne}
                      </p>
                    )}
                    <button
                      type="button"
                      className={primaryButton}
                      disabled={!canContinue}
                      onClick={() => setStep(2)}
                    >
                      {copy.results.continue}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 2 && search && outboundFlight && seatMap && (
              <>
                <p id="seat-instructions" className="max-w-2xl text-ink-muted">
                  {copy.seats.instructions}
                </p>
                <p className="mt-2 font-semibold" aria-live="polite">
                  {copy.seats.selectedCount(seats.length, search.query.passengers)}
                  {seats.length > 0 && (
                    <span className="font-normal text-ink-muted"> · {seats.join(", ")}</span>
                  )}
                </p>
                <div className="mt-6">
                  <SeatMap
                    key={outboundFlight.id}
                    map={seatMap}
                    flightLabel={outboundFlight.flightNumber}
                    selected={seats}
                    onToggle={(id) => setSeats((s) => toggleSeat(s, id, search.query.passengers))}
                  />
                </div>
                <div className="sticky bottom-2 z-10 mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
                  <button type="button" className={secondaryButton} onClick={() => setStep(1)}>
                    {copy.seats.back}
                  </button>
                  <button
                    type="button"
                    className={primaryButton}
                    disabled={seats.length !== search.query.passengers}
                    onClick={() => setStep(3)}
                  >
                    {copy.seats.continue}
                  </button>
                </div>
              </>
            )}

            {step === 3 && search && outboundFlight && (
              <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
                <Summary
                  query={search.query}
                  outbound={outboundFlight}
                  inbound={inboundFlight}
                  seats={seats}
                />
                <div className="rounded-3xl border border-line bg-surface-2 p-6">
                  <p role="status" className="font-display text-xl font-bold">
                    {copy.summary.done}
                  </p>
                  <p className="mt-3 leading-relaxed text-ink-muted">{copy.summary.body}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" className={primaryButton} onClick={restart}>
                      {copy.summary.restart}
                    </button>
                    <button type="button" className={secondaryButton} onClick={() => setStep(2)}>
                      {copy.summary.back}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </m.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
