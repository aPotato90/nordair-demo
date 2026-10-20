import { describe, expect, it } from "vitest";
import { allSeats, buildSeatMap, CABIN_LAYOUT, toggleSeat } from "@/lib/seats";

describe("buildSeatMap", () => {
  it("is deterministic per flight", () => {
    expect(buildSeatMap("LOSLHR-2026-11-10-0815", "economy")).toEqual(
      buildSeatMap("LOSLHR-2026-11-10-0815", "economy"),
    );
  });

  it("varies between flights", () => {
    const a = allSeats(buildSeatMap("flight-a", "economy")).map((s) => s.taken);
    const b = allSeats(buildSeatMap("flight-b", "economy")).map((s) => s.taken);
    expect(a).not.toEqual(b);
  });

  it.each(["economy", "comfort", "business"] as const)("follows the %s layout", (cabin) => {
    const layout = CABIN_LAYOUT[cabin];
    const map = buildSeatMap("x", cabin);
    expect(map.rows).toHaveLength(layout.rowCount);
    expect(map.rows[0].number).toBe(layout.firstRow);
    expect(allSeats(map)).toHaveLength(layout.rowCount * layout.blocks.flat().length);
  });

  it("labels window, aisle and middle seats", () => {
    const row = buildSeatMap("x", "economy").rows[0];
    expect(row.blocks.flat().map((s) => s.kind)).toEqual([
      "window",
      "middle",
      "aisle",
      "aisle",
      "middle",
      "window",
    ]);
  });

  it("always leaves enough seats for the party", () => {
    for (let i = 0; i < 50; i++) {
      const free = allSeats(buildSeatMap(`f${i}`, "business", 9)).filter((s) => !s.taken);
      expect(free.length).toBeGreaterThanOrEqual(9);
    }
  });
});

describe("toggleSeat", () => {
  it("adds and removes seats", () => {
    expect(toggleSeat([], "1A", 2)).toEqual(["1A"]);
    expect(toggleSeat(["1A"], "1A", 2)).toEqual([]);
  });

  it("drops the oldest choice when over the limit", () => {
    expect(toggleSeat(["1A", "1D"], "2A", 2)).toEqual(["1D", "2A"]);
  });
});
