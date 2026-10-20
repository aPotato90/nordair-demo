import type { Cabin } from "./pricing";
import { createRandom } from "./random";

export type SeatKind = "window" | "middle" | "aisle";

export interface Seat {
  id: string;
  row: number;
  letter: string;
  kind: SeatKind;
  taken: boolean;
}

export interface SeatRow {
  number: number;
  /** Seats grouped by the blocks between aisles. */
  blocks: Seat[][];
}

export interface SeatMap {
  cabin: Cabin;
  blocks: string[][];
  rows: SeatRow[];
}

export const CABIN_LAYOUT: Record<Cabin, { firstRow: number; rowCount: number; blocks: string[][] }> = {
  economy: {
    firstRow: 20,
    rowCount: 14,
    blocks: [
      ["A", "B", "C"],
      ["D", "E", "F"],
    ],
  },
  comfort: {
    firstRow: 10,
    rowCount: 7,
    blocks: [
      ["A", "B"],
      ["C", "D", "E"],
      ["F", "G"],
    ],
  },
  business: { firstRow: 1, rowCount: 6, blocks: [["A"], ["D", "G"], ["K"]] },
};

const OCCUPANCY = 0.45;

function seatKind(blocks: string[][], blockIndex: number, seatIndex: number): SeatKind {
  const block = blocks[blockIndex];
  const firstBlock = blockIndex === 0;
  const lastBlock = blockIndex === blocks.length - 1;
  if (firstBlock && seatIndex === 0) return "window";
  if (lastBlock && seatIndex === block.length - 1) return "window";
  const touchesAisle = (!firstBlock && seatIndex === 0) || (!lastBlock && seatIndex === block.length - 1);
  return touchesAisle ? "aisle" : "middle";
}

/**
 * Builds a deterministic seat map for a flight. Roughly 45% of seats are taken,
 * but at least `minAvailable` seats are always left free.
 */
export function buildSeatMap(flightId: string, cabin: Cabin, minAvailable = 1): SeatMap {
  const layout = CABIN_LAYOUT[cabin];
  const random = createRandom(`seats-${flightId}-${cabin}`);
  const rows: SeatRow[] = [];

  for (let r = 0; r < layout.rowCount; r++) {
    const number = layout.firstRow + r;
    rows.push({
      number,
      blocks: layout.blocks.map((block, bi) =>
        block.map((letter, si) => ({
          id: `${number}${letter}`,
          row: number,
          letter,
          kind: seatKind(layout.blocks, bi, si),
          taken: random() < OCCUPANCY,
        })),
      ),
    });
  }

  const all = rows.flatMap((row) => row.blocks.flat());
  let free = all.filter((s) => !s.taken).length;
  for (const seat of all) {
    if (free >= minAvailable) break;
    if (seat.taken) {
      seat.taken = false;
      free++;
    }
  }

  return { cabin, blocks: layout.blocks, rows };
}

export function allSeats(map: SeatMap): Seat[] {
  return map.rows.flatMap((row) => row.blocks.flat());
}

/** Toggle a seat in the selection, never exceeding `limit` (oldest choice is dropped). */
export function toggleSeat(selection: string[], seatId: string, limit: number): string[] {
  if (selection.includes(seatId)) return selection.filter((id) => id !== seatId);
  const next = [...selection, seatId];
  return next.length > limit ? next.slice(next.length - limit) : next;
}
