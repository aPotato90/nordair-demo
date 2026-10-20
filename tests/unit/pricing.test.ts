import { describe, expect, it } from "vitest";
import {
  advancePurchaseFactor,
  dayOfWeekFactor,
  formatMoney,
  quoteFare,
  timeOfDayFactor,
  type FareInput,
} from "@/lib/pricing";

const base: FareInput = {
  distanceKm: 1000,
  cabin: "economy",
  daysUntilDeparture: 30,
  dayOfWeek: 1, // Monday: neutral
  departureHour: 12, // midday: neutral
  passengers: 1,
};

describe("quoteFare", () => {
  it("prices a neutral economy fare from distance alone", () => {
    // (40 + 1000 * 0.085) * 1 * 1 * 1 * 1 * 1.0 (midpoint jitter) = 125
    expect(quoteFare(base)).toEqual({
      farePerPassenger: 125,
      taxesPerPassenger: 30,
      totalPerPassenger: 155,
      total: 155,
    });
  });

  it("is deterministic for identical input", () => {
    const input = { ...base, jitter: 0.37 };
    expect(quoteFare(input)).toEqual(quoteFare(input));
  });

  it("gets more expensive with distance", () => {
    const short = quoteFare({ ...base, distanceKm: 400 });
    const long = quoteFare({ ...base, distanceKm: 5000 });
    expect(long.totalPerPassenger).toBeGreaterThan(short.totalPerPassenger);
  });

  it("orders cabins economy < comfort < business", () => {
    const economy = quoteFare(base).farePerPassenger;
    const comfort = quoteFare({ ...base, cabin: "comfort" }).farePerPassenger;
    const business = quoteFare({ ...base, cabin: "business" }).farePerPassenger;
    expect(economy).toBeLessThan(comfort);
    expect(comfort).toBeLessThan(business);
  });

  it("charges more for last-minute departures", () => {
    const lastMinute = quoteFare({ ...base, daysUntilDeparture: 2 });
    const early = quoteFare({ ...base, daysUntilDeparture: 90 });
    expect(lastMinute.farePerPassenger).toBeGreaterThan(early.farePerPassenger);
  });

  it("does not apply cabin multipliers to taxes", () => {
    expect(quoteFare({ ...base, cabin: "business" }).taxesPerPassenger).toBe(
      quoteFare(base).taxesPerPassenger,
    );
  });

  it("multiplies the total by passengers", () => {
    const one = quoteFare(base);
    const four = quoteFare({ ...base, passengers: 4 });
    expect(four.totalPerPassenger).toBe(one.totalPerPassenger);
    expect(four.total).toBe(one.totalPerPassenger * 4);
  });

  it("keeps jitter within ±5%", () => {
    const low = quoteFare({ ...base, jitter: 0 }).farePerPassenger;
    const high = quoteFare({ ...base, jitter: 0.999 }).farePerPassenger;
    expect(low).toBeGreaterThanOrEqual(Math.floor(125 * 0.95));
    expect(high).toBeLessThanOrEqual(Math.ceil(125 * 1.05));
    // Out-of-range jitter is clamped rather than producing wild prices.
    expect(quoteFare({ ...base, jitter: 5 }).farePerPassenger).toBe(high);
  });

  it("never drops below the minimum fare", () => {
    expect(
      quoteFare({ ...base, distanceKm: 1, daysUntilDeparture: 200, departureHour: 23 }).farePerPassenger,
    ).toBeGreaterThanOrEqual(29);
  });

  it.each([
    [{ distanceKm: 0 }],
    [{ distanceKm: Number.NaN }],
    [{ passengers: 0 }],
    [{ passengers: 10 }],
    [{ passengers: 1.5 }],
    [{ daysUntilDeparture: -1 }],
    [{ dayOfWeek: 7 }],
    [{ departureHour: 24 }],
    [{ cabin: "first" as never }],
  ])("rejects invalid input %o", (override) => {
    expect(() => quoteFare({ ...base, ...override })).toThrow(RangeError);
  });
});

describe("fare factors", () => {
  it("steps advance purchase pricing down over time", () => {
    expect(advancePurchaseFactor(0)).toBe(1.45);
    expect(advancePurchaseFactor(6)).toBe(1.45);
    expect(advancePurchaseFactor(7)).toBe(1.2);
    expect(advancePurchaseFactor(21)).toBe(1);
    expect(advancePurchaseFactor(60)).toBe(0.9);
  });

  it("makes Friday and Sunday dearer, Tuesday and Wednesday cheaper", () => {
    expect(dayOfWeekFactor(5)).toBeGreaterThan(1);
    expect(dayOfWeekFactor(0)).toBeGreaterThan(1);
    expect(dayOfWeekFactor(2)).toBeLessThan(1);
    expect(dayOfWeekFactor(3)).toBeLessThan(1);
    expect(dayOfWeekFactor(1)).toBe(1);
  });

  it("adds a sunrise/sunset peak and a red-eye discount", () => {
    expect(timeOfDayFactor(7)).toBeGreaterThan(1);
    expect(timeOfDayFactor(18)).toBeGreaterThan(1);
    expect(timeOfDayFactor(22)).toBeLessThan(1);
    expect(timeOfDayFactor(3)).toBeLessThan(1);
    expect(timeOfDayFactor(12)).toBe(1);
  });
});

describe("formatMoney", () => {
  it("formats whole US dollars", () => {
    expect(formatMoney(1234)).toBe("$1,234");
  });
});
