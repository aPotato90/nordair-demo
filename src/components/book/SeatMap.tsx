"use client";

import { AnimatePresence, m } from "motion/react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { site } from "@/content/site";
import type { Seat, SeatMap as SeatMapData } from "@/lib/seats";

const copy = site.book.seats;

function seatLabel(seat: Seat, selected: boolean) {
  const state = selected ? copy.selected : seat.taken ? copy.taken : copy.available;
  return copy.seatLabel(seat.id, copy[seat.kind], state);
}

/**
 * Animated seat map. Seats are buttons with a roving tabindex: Tab enters the map once,
 * arrow keys move between seats (taken seats stay reachable but can't be chosen).
 */
export function SeatMap({
  map,
  flightLabel,
  selected,
  onToggle,
}: {
  map: SeatMapData;
  flightLabel: string;
  selected: string[];
  onToggle: (seatId: string) => void;
}) {
  // Grid of seats in visual order (rows × columns, aisles removed).
  const grid = useMemo(() => map.rows.map((row) => row.blocks.flat()), [map]);
  const firstFree = useMemo(() => grid.flat().find((s) => !s.taken)?.id ?? grid[0][0].id, [grid]);
  const [activeId, setActiveId] = useState(firstFree);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const move = (event: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const cols = grid[r].length;
    let nr = r;
    let nc = c;
    switch (event.key) {
      case "ArrowRight":
        nc = Math.min(c + 1, cols - 1);
        break;
      case "ArrowLeft":
        nc = Math.max(c - 1, 0);
        break;
      case "ArrowDown":
        nr = Math.min(r + 1, grid.length - 1);
        break;
      case "ArrowUp":
        nr = Math.max(r - 1, 0);
        break;
      case "Home":
        nc = 0;
        break;
      case "End":
        nc = cols - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const next = grid[nr][nc];
    setActiveId(next.id);
    refs.current.get(next.id)?.focus();
  };

  const wide = map.cabin === "business";
  const seatSize = wide
    ? "h-12 w-12 sm:h-14 sm:w-14"
    : map.cabin === "comfort"
      ? "h-9 w-9 sm:h-11 sm:w-11"
      : "h-10 w-10 sm:h-11 sm:w-11";

  return (
    <div>
      <ul aria-hidden="true" className="flex flex-wrap gap-4 text-sm text-ink-muted">
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-line bg-seat" /> {copy.legendAvailable}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-seat-taken" /> {copy.legendTaken}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-accent" /> {copy.legendSelected}
        </li>
      </ul>

      <div className="mt-6 flex justify-center">
        <div className="relative rounded-t-[10rem] rounded-b-3xl border-2 border-line bg-surface px-3 pt-24 pb-6 shadow-sm sm:px-6">
          <p
            aria-hidden="true"
            className="absolute inset-x-0 top-10 text-center text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase"
          >
            {copy.front}
          </p>
          <div
            role="group"
            aria-label={copy.mapLabel(flightLabel)}
            aria-describedby="seat-instructions"
            className="space-y-2"
          >
            {map.rows.map((row, r) => {
              let col = -1;
              return (
                <div key={row.number} className="flex items-center gap-1.5 sm:gap-2">
                  <span
                    aria-hidden="true"
                    className="w-6 text-right text-xs font-semibold text-ink-muted tabular-nums"
                  >
                    {row.number}
                  </span>
                  {row.blocks.map((block, b) => (
                    <div key={b} className={`flex gap-1.5 sm:gap-2 ${b > 0 ? "ml-3 sm:ml-5" : ""}`}>
                      {block.map((seat) => {
                        col += 1;
                        const c = col;
                        const isSelected = selected.includes(seat.id);
                        return (
                          <m.button
                            key={seat.id}
                            ref={(el) => {
                              if (el) refs.current.set(seat.id, el);
                              else refs.current.delete(seat.id);
                            }}
                            type="button"
                            tabIndex={seat.id === activeId ? 0 : -1}
                            aria-label={seatLabel(seat, isSelected)}
                            aria-pressed={isSelected}
                            aria-disabled={seat.taken || undefined}
                            onFocus={() => setActiveId(seat.id)}
                            onKeyDown={(e) => move(e, r, c)}
                            onClick={() => {
                              setActiveId(seat.id);
                              if (!seat.taken) onToggle(seat.id);
                            }}
                            initial={{ opacity: 0, y: -8, scale: 0.85 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              delay: r * 0.025 + c * 0.01,
                              type: "spring",
                              stiffness: 420,
                              damping: 26,
                            }}
                            whileTap={seat.taken ? undefined : { scale: 0.88 }}
                            className={`relative grid ${seatSize} place-items-center rounded-t-xl rounded-b-md text-[10px] font-bold transition-colors ${
                              seat.taken
                                ? "cursor-not-allowed bg-seat-taken text-ink/60"
                                : isSelected
                                  ? "bg-accent text-on-accent"
                                  : "border border-line bg-seat text-ink hover:border-accent-ink"
                            }`}
                          >
                            <AnimatePresence initial={false} mode="popLayout">
                              {isSelected ? (
                                <m.svg
                                  key="check"
                                  viewBox="0 0 20 20"
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                >
                                  <path
                                    d="M4 10.5l4 4 8-9"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </m.svg>
                              ) : seat.taken ? (
                                <svg key="x" viewBox="0 0 20 20" aria-hidden="true" className="h-3 w-3">
                                  <path
                                    d="M5 5l10 10M15 5 5 15"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              ) : (
                                <span key="id" aria-hidden="true">
                                  {seat.letter}
                                </span>
                              )}
                            </AnimatePresence>
                          </m.button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
