const EARTH_RADIUS_KM = 6371;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points in kilometres (haversine). */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Fake block time: cruise at ~780 km/h plus 35 minutes for taxi, climb and descent. */
export function blockMinutes(km: number): number {
  const minutes = (km / 780) * 60 + 35;
  return Math.round(minutes / 5) * 5;
}

/** Equirectangular projection into a map box. */
export function project(
  point: { lat: number; lon: number },
  bounds: { west: number; east: number; north: number; south: number },
  size: { width: number; height: number },
): { x: number; y: number } {
  const x = ((point.lon - bounds.west) / (bounds.east - bounds.west)) * size.width;
  const y = ((bounds.north - point.lat) / (bounds.north - bounds.south)) * size.height;
  return { x, y };
}
