import { z } from "zod";
import { airportByCode, airportCodes, routes, type AirportCode } from "@/content/airports";
import { site } from "@/content/site";
import { blockMinutes, distanceKm } from "./geo";
import { quoteFare, type Cabin, type FareQuote } from "./pricing";
import { createRandom } from "./random";

export const MAX_DAYS_AHEAD = 330;
export const HUB: AirportCode = "LOS";
const LAYOVER_MINUTES = 75;
const DEPARTURE_SLOTS = [6, 7, 8, 11, 14, 17, 18, 19, 22];
const errors = site.book.errors;

/* ---------- dates (ISO yyyy-mm-dd, treated as calendar days in UTC) ---------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseISODate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (!a || !b) throw new RangeError("Invalid ISO date");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  if (!date) throw new RangeError("Invalid ISO date");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Today's date in the visitor's local calendar, as yyyy-mm-dd. */
export function localTodayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ---------- search form schema ---------- */

export const cabinValues = ["economy", "comfort", "business"] as const satisfies readonly Cabin[];

export function createSearchSchema(today: string) {
  return z
    .object({
      tripType: z.enum(["oneway", "return"]),
      from: z.enum(airportCodes, { error: errors.from }),
      to: z.enum(airportCodes, { error: errors.to }),
      departDate: z.string().min(1, errors.departRequired),
      returnDate: z.string().optional(),
      passengers: z
        .number({ error: errors.passengers })
        .int(errors.passengers)
        .min(1, errors.passengers)
        .max(9, errors.passengers),
      cabin: z.enum(cabinValues),
    })
    .superRefine((value, ctx) => {
      if (value.from === value.to) {
        ctx.addIssue({ code: "custom", path: ["to"], message: errors.sameCity });
      }

      if (value.departDate) {
        if (!parseISODate(value.departDate)) {
          ctx.addIssue({ code: "custom", path: ["departDate"], message: errors.departRequired });
        } else {
          const ahead = daysBetween(today, value.departDate);
          if (ahead < 0) {
            ctx.addIssue({ code: "custom", path: ["departDate"], message: errors.departPast });
          } else if (ahead > MAX_DAYS_AHEAD) {
            ctx.addIssue({ code: "custom", path: ["departDate"], message: errors.departTooFar });
          }
        }
      }

      if (value.tripType === "return") {
        if (!value.returnDate || !parseISODate(value.returnDate)) {
          ctx.addIssue({ code: "custom", path: ["returnDate"], message: errors.returnRequired });
        } else if (parseISODate(value.departDate) && value.returnDate < value.departDate) {
          ctx.addIssue({
            code: "custom",
            path: ["returnDate"],
            message: errors.returnBeforeDepart,
          });
        } else if (daysBetween(today, value.returnDate) > MAX_DAYS_AHEAD) {
          ctx.addIssue({ code: "custom", path: ["returnDate"], message: errors.departTooFar });
        }
      }
    });
}

export type SearchQuery = z.infer<ReturnType<typeof createSearchSchema>>;

/* ---------- fake flight generation ---------- */

export interface FlightLeg {
  from: AirportCode;
  to: AirportCode;
  distanceKm: number;
  durationMinutes: number;
}

export interface FlightOption {
  id: string;
  flightNumber: string;
  from: AirportCode;
  to: AirportCode;
  via: AirportCode | null;
  date: string;
  departTime: string;
  arriveTime: string;
  /** Days after `date` that the flight lands (local time). */
  arrivalDayOffset: number;
  durationMinutes: number;
  distanceKm: number;
  aircraft: string;
  cabin: Cabin;
  seatsLeft: number;
  fare: FareQuote;
}

export function isDirectRoute(a: AirportCode, b: AirportCode): boolean {
  return routes.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Direct legs if a route exists, otherwise a single connection through the hub. */
export function planLegs(from: AirportCode, to: AirportCode): FlightLeg[] {
  if (from === to) throw new RangeError("Origin and destination must differ");
  const stops: AirportCode[][] =
    isDirectRoute(from, to) || from === HUB || to === HUB
      ? [[from, to]]
      : [
          [from, HUB],
          [HUB, to],
        ];
  return stops.map(([a, b]) => {
    const km = Math.round(distanceKm(airportByCode(a), airportByCode(b)));
    return { from: a, to: b, distanceKm: km, durationMinutes: blockMinutes(km) };
  });
}

function aircraftFor(km: number): string {
  const [regional, medium, long] = site.fleet.aircraft;
  if (km < 1500) return regional.name;
  if (km < 6000) return medium.name;
  return long.name;
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatClock(totalMinutes: number): { time: string; dayOffset: number } {
  const dayOffset = Math.floor(totalMinutes / 1440);
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return { time: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`, dayOffset };
}

export function generateFlights(params: {
  from: AirportCode;
  to: AirportCode;
  date: string;
  cabin: Cabin;
  passengers: number;
  today: string;
}): FlightOption[] {
  const { from, to, date, cabin, passengers, today } = params;
  const parsed = parseISODate(date);
  if (!parsed) throw new RangeError("Invalid date");
  const legs = planLegs(from, to);
  const via = legs.length > 1 ? legs[0].to : null;
  const km = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
  const duration = legs.reduce((sum, leg) => sum + leg.durationMinutes, 0) + (via ? LAYOVER_MINUTES : 0);
  const random = createRandom(`${from}-${to}-${date}`);
  const count = 2 + Math.floor(random() * 3); // 2–4 departures a day

  const slots = [...DEPARTURE_SLOTS];
  const picked: number[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(slots.splice(Math.floor(random() * slots.length), 1)[0]);
  }
  picked.sort((a, b) => a - b);

  const offsetDelta = (airportByCode(to).utcOffset - airportByCode(from).utcOffset) * 60;
  const daysUntilDeparture = Math.max(0, daysBetween(today, date));
  const dayOfWeek = parsed.getUTCDay();

  return picked.map((hour) => {
    const minute = [0, 15, 30, 45][Math.floor(random() * 4)];
    const departMinutes = hour * 60 + minute;
    const depart = formatClock(departMinutes);
    const arrive = formatClock(departMinutes + duration + offsetDelta);
    const number = 100 + Math.floor(random() * 800);
    const fare = quoteFare({
      distanceKm: km,
      cabin,
      daysUntilDeparture,
      dayOfWeek,
      departureHour: hour,
      passengers,
      jitter: random(),
    });
    return {
      id: `${from}${to}-${date}-${depart.time.replace(":", "")}`,
      flightNumber: `NR ${number}`,
      from,
      to,
      via,
      date,
      departTime: depart.time,
      arriveTime: arrive.time,
      arrivalDayOffset: arrive.dayOffset,
      durationMinutes: duration,
      distanceKm: km,
      aircraft: aircraftFor(Math.max(...legs.map((l) => l.distanceKm))),
      cabin,
      seatsLeft: 2 + Math.floor(random() * 38),
      fare,
    };
  });
}

export function searchFlights(
  query: SearchQuery,
  today: string,
): { outbound: FlightOption[]; inbound: FlightOption[] } {
  const base = { cabin: query.cabin, passengers: query.passengers, today };
  const outbound = generateFlights({ ...base, from: query.from, to: query.to, date: query.departDate });
  const inbound =
    query.tripType === "return" && query.returnDate
      ? generateFlights({ ...base, from: query.to, to: query.from, date: query.returnDate })
      : [];
  return { outbound, inbound };
}

export type SortKey = "price" | "departure" | "duration";

export function sortFlights(flights: FlightOption[], key: SortKey): FlightOption[] {
  const copy = [...flights];
  const byDeparture = (a: FlightOption, b: FlightOption) => a.departTime.localeCompare(b.departTime);
  if (key === "price") copy.sort((a, b) => a.fare.total - b.fare.total || byDeparture(a, b));
  if (key === "departure") copy.sort(byDeparture);
  if (key === "duration") copy.sort((a, b) => a.durationMinutes - b.durationMinutes || byDeparture(a, b));
  return copy;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Fixed reference date so "from" prices are stable and render identically on the server. */
const REFERENCE_DAY = "2030-01-07";

/** Cheapest economy fare from the hub to a city (45 days out), used as the "from" price on cards. */
export function fromFare(to: AirportCode): number {
  const today = REFERENCE_DAY;
  const from = to === HUB ? "PHC" : HUB;
  const date = addDays(today, 45);
  const flights = generateFlights({ from, to, date, cabin: "economy", passengers: 1, today });
  return Math.min(...flights.map((f) => f.fare.totalPerPassenger));
}
