/**
 * Fake fare engine for the Nordair demo. Deterministic and intentionally simple:
 * every factor is visible here and covered by unit tests. Not a real price.
 */

export type Cabin = "economy" | "comfort" | "business";

export const CABIN_MULTIPLIER: Record<Cabin, number> = {
  economy: 1,
  comfort: 1.6,
  business: 3.4,
};

export interface FareInput {
  distanceKm: number;
  cabin: Cabin;
  /** Days between "today" and departure (0 = same day). */
  daysUntilDeparture: number;
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  /** Local departure hour, 0–23. */
  departureHour: number;
  passengers: number;
  /** Small deterministic variation in [0, 1). Defaults to the midpoint. */
  jitter?: number;
}

export interface FareQuote {
  farePerPassenger: number;
  taxesPerPassenger: number;
  totalPerPassenger: number;
  total: number;
}

const BASE_FARE = 40;
const RATE_PER_KM = 0.085;
const TAX_BASE = 18;
const TAX_PER_KM = 0.012;

export function advancePurchaseFactor(days: number): number {
  if (days < 7) return 1.45;
  if (days < 21) return 1.2;
  if (days < 60) return 1;
  return 0.9;
}

export function dayOfWeekFactor(day: number): number {
  if (day === 5 || day === 0) return 1.12; // Friday, Sunday
  if (day === 2 || day === 3) return 0.92; // Tuesday, Wednesday
  return 1;
}

export function timeOfDayFactor(hour: number): number {
  if (hour >= 21 || hour < 6) return 0.9; // red-eye
  if ((hour >= 6 && hour < 9) || (hour >= 17 && hour < 20)) return 1.08; // sunrise & sunset peaks
  return 1;
}

function assertInput(input: FareInput) {
  const { distanceKm, passengers, daysUntilDeparture, dayOfWeek, departureHour } = input;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) throw new RangeError("distanceKm must be > 0");
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 9)
    throw new RangeError("passengers must be an integer from 1 to 9");
  if (!Number.isInteger(daysUntilDeparture) || daysUntilDeparture < 0)
    throw new RangeError("daysUntilDeparture must be a non-negative integer");
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
    throw new RangeError("dayOfWeek must be 0–6");
  if (!Number.isInteger(departureHour) || departureHour < 0 || departureHour > 23)
    throw new RangeError("departureHour must be 0–23");
  if (!(input.cabin in CABIN_MULTIPLIER)) throw new RangeError("unknown cabin");
}

export function quoteFare(input: FareInput): FareQuote {
  assertInput(input);
  const jitter = input.jitter ?? 0.5;
  const variation = 0.95 + Math.min(Math.max(jitter, 0), 0.999) * 0.1; // 0.95 – 1.05

  const raw =
    (BASE_FARE + input.distanceKm * RATE_PER_KM) *
    CABIN_MULTIPLIER[input.cabin] *
    advancePurchaseFactor(input.daysUntilDeparture) *
    dayOfWeekFactor(input.dayOfWeek) *
    timeOfDayFactor(input.departureHour) *
    variation;

  const farePerPassenger = Math.max(29, Math.round(raw));
  const taxesPerPassenger = Math.round(TAX_BASE + input.distanceKm * TAX_PER_KM);
  const totalPerPassenger = farePerPassenger + taxesPerPassenger;

  return {
    farePerPassenger,
    taxesPerPassenger,
    totalPerPassenger,
    total: totalPerPassenger * input.passengers,
  };
}

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
