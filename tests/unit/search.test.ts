import { describe, expect, it } from "vitest";
import {
  addDays,
  createSearchSchema,
  daysBetween,
  formatDuration,
  fromFare,
  generateFlights,
  isDirectRoute,
  localTodayISO,
  parseISODate,
  planLegs,
  searchFlights,
  sortFlights,
  type SearchQuery,
} from "@/lib/search";
import { site } from "@/content/site";

const TODAY = "2026-10-20";
const schema = createSearchSchema(TODAY);
const errors = site.book.errors;

const valid: SearchQuery = {
  tripType: "return",
  from: "LOS",
  to: "LHR",
  departDate: "2026-11-10",
  returnDate: "2026-11-20",
  passengers: 2,
  cabin: "economy",
};

function issues(input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("dates", () => {
  it("parses only real ISO calendar dates", () => {
    expect(parseISODate("2026-02-28")).not.toBeNull();
    expect(parseISODate("2026-02-30")).toBeNull();
    expect(parseISODate("20-10-2026")).toBeNull();
    expect(parseISODate("")).toBeNull();
  });

  it("counts and adds days across month boundaries", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-11-02", "2026-10-30")).toBe(-3);
  });

  it("formats the local calendar day", () => {
    expect(localTodayISO(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("search schema", () => {
  it("accepts a valid return search", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("accepts a one-way search with no return date", () => {
    expect(schema.safeParse({ ...valid, tripType: "oneway", returnDate: "" }).success).toBe(true);
  });

  it("rejects the same origin and destination", () => {
    expect(issues({ ...valid, to: "LOS" })).toMatchObject({ to: errors.sameCity });
  });

  it("rejects unknown airports", () => {
    expect(issues({ ...valid, from: "JFK" })).toMatchObject({ from: errors.from });
  });

  it("rejects departures in the past but allows today", () => {
    expect(issues({ ...valid, departDate: "2026-10-19" })).toMatchObject({
      departDate: errors.departPast,
    });
    expect(schema.safeParse({ ...valid, departDate: TODAY }).success).toBe(true);
  });

  it("rejects departures beyond the demo schedule", () => {
    expect(
      issues({ ...valid, departDate: addDays(TODAY, 331), returnDate: undefined, tripType: "oneway" }),
    ).toMatchObject({
      departDate: errors.departTooFar,
    });
  });

  it("requires a return date on or after departure for return trips", () => {
    expect(issues({ ...valid, returnDate: "" })).toMatchObject({ returnDate: errors.returnRequired });
    expect(issues({ ...valid, returnDate: "2026-11-09" })).toMatchObject({
      returnDate: errors.returnBeforeDepart,
    });
    expect(schema.safeParse({ ...valid, returnDate: valid.departDate }).success).toBe(true);
  });

  it("limits passengers to 1–9 whole people", () => {
    for (const passengers of [0, 10, 2.5, Number.NaN]) {
      expect(issues({ ...valid, passengers })).toMatchObject({ passengers: errors.passengers });
    }
  });
});

describe("route planning", () => {
  it("uses direct routes from the network", () => {
    expect(isDirectRoute("LHR", "LOS")).toBe(true);
    expect(planLegs("LOS", "LHR")).toHaveLength(1);
  });

  it("connects through the Lagos hub when there is no direct route", () => {
    expect(isDirectRoute("ACC", "DXB")).toBe(false);
    const legs = planLegs("ACC", "DXB");
    expect(legs.map((l) => [l.from, l.to])).toEqual([
      ["ACC", "LOS"],
      ["LOS", "DXB"],
    ]);
  });

  it("produces plausible distances", () => {
    const [leg] = planLegs("LOS", "LHR");
    expect(leg.distanceKm).toBeGreaterThan(4900);
    expect(leg.distanceKm).toBeLessThan(5200);
  });
});

describe("generateFlights", () => {
  const params = {
    from: "LOS",
    to: "ACC",
    date: "2026-11-10",
    cabin: "economy",
    passengers: 1,
    today: TODAY,
  } as const;

  it("is deterministic for the same route and date", () => {
    expect(generateFlights(params)).toEqual(generateFlights(params));
  });

  it("returns 2–4 departures sorted by time with valid clock values", () => {
    const flights = generateFlights(params);
    expect(flights.length).toBeGreaterThanOrEqual(2);
    expect(flights.length).toBeLessThanOrEqual(4);
    const times = flights.map((f) => f.departTime);
    expect([...times].sort()).toEqual(times);
    for (const f of flights) {
      expect(f.departTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(f.arriveTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(f.flightNumber).toMatch(/^NR \d{3}$/);
      expect(f.seatsLeft).toBeGreaterThanOrEqual(2);
    }
  });

  it("applies time zones to arrival times", () => {
    // Lagos (UTC+1) to Accra (UTC+0) on a ~70 minute block: local arrival is ~10 minutes after departure.
    const [flight] = generateFlights(params);
    const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    const diff = toMinutes(flight.arriveTime) + flight.arrivalDayOffset * 1440 - toMinutes(flight.departTime);
    expect(diff).toBe(flight.durationMinutes - 60);
  });

  it("adds a layover for connecting itineraries", () => {
    const [flight] = generateFlights({ ...params, from: "ACC", to: "DXB" });
    const legs = planLegs("ACC", "DXB");
    expect(flight.via).toBe("LOS");
    expect(flight.durationMinutes).toBe(legs[0].durationMinutes + legs[1].durationMinutes + 75);
  });

  it("prices premium cabins higher on the same flight", () => {
    const economy = generateFlights(params);
    const business = generateFlights({ ...params, cabin: "business" });
    economy.forEach((flight, i) => {
      expect(business[i].fare.farePerPassenger).toBeGreaterThan(flight.fare.farePerPassenger);
    });
  });
});

describe("searchFlights", () => {
  it("returns outbound and inbound lists for return trips", () => {
    const { outbound, inbound } = searchFlights(valid, TODAY);
    expect(outbound.every((f) => f.from === "LOS" && f.to === "LHR")).toBe(true);
    expect(inbound.every((f) => f.from === "LHR" && f.to === "LOS" && f.date === valid.returnDate)).toBe(
      true,
    );
    expect(inbound.length).toBeGreaterThan(0);
  });

  it("returns no inbound flights for one-way trips", () => {
    expect(searchFlights({ ...valid, tripType: "oneway" }, TODAY).inbound).toEqual([]);
  });

  it("totals fares for every passenger", () => {
    const { outbound } = searchFlights(valid, TODAY);
    for (const f of outbound) expect(f.fare.total).toBe(f.fare.totalPerPassenger * 2);
  });
});

describe("sortFlights", () => {
  const flights = generateFlights({
    from: "LOS",
    to: "DXB",
    date: "2026-12-04",
    cabin: "economy",
    passengers: 1,
    today: TODAY,
  });

  it("sorts by price without mutating the input", () => {
    const before = flights.map((f) => f.id);
    const sorted = sortFlights(flights, "price");
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].fare.total).toBeGreaterThanOrEqual(sorted[i - 1].fare.total);
    }
    expect(flights.map((f) => f.id)).toEqual(before);
  });

  it("sorts by departure time", () => {
    const sorted = sortFlights(flights, "departure").map((f) => f.departTime);
    expect(sorted).toEqual([...sorted].sort());
  });
});

describe("helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(65)).toBe("1h 5m");
    expect(formatDuration(120)).toBe("2h");
  });

  it("returns a stable positive 'from' fare for every destination", () => {
    for (const code of ["PHC", "LOS", "ACC", "LHR", "DXB"] as const) {
      const fare = fromFare(code);
      expect(fare).toBeGreaterThan(0);
      expect(fromFare(code)).toBe(fare);
    }
  });
});
