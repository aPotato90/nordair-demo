import { airportByCode, airports, routes, type AirportCode } from "@/content/airports";
import { project } from "./geo";

/** Map frame: equirectangular, West Africa to the Gulf. */
export const MAP_BOUNDS = { west: -22, east: 62, north: 60, south: -6 };
export const MAP_SIZE = { width: 840, height: 660 };

type LonLat = [lon: number, lat: number];

/*
 * Hand-simplified, stylised coastlines (lon, lat). Deliberately low-poly: this is an
 * illustration for a fictional airline, not a navigational chart.
 */
const AFRICA: LonLat[] = [
  [-6, 35.8],
  [-9.8, 31],
  [-13, 27.5],
  [-17, 21],
  [-17.5, 14.7],
  [-16.7, 12],
  [-15, 10.5],
  [-13.2, 8.5],
  [-11, 6.5],
  [-7.5, 4.4],
  [-4, 5.2],
  [-1, 5],
  [1.5, 6.2],
  [3.4, 6.4],
  [5.5, 5],
  [7, 4.4],
  [9.5, 3.8],
  [9.8, 2],
  [9.3, -1],
  [11.8, -4.5],
  [12.3, -7],
  [40, -7],
  [39.5, -4],
  [41, -1.5],
  [43, 1.5],
  [46, 3.5],
  [49, 7.5],
  [51.2, 11.8],
  [48.5, 11.2],
  [44, 10.5],
  [43.3, 11.8],
  [41.7, 13.5],
  [39.7, 15.5],
  [38.6, 18],
  [37.3, 21],
  [35.5, 24],
  [33.5, 27],
  [32.6, 29.9],
  [32.3, 31.3],
  [29.9, 31.2],
  [25, 31.7],
  [20, 30.8],
  [19, 30.3],
  [15.5, 32],
  [11, 33.2],
  [10.5, 36.8],
  [8, 36.9],
  [3, 36.8],
  [-1, 35.4],
];

const EURASIA: LonLat[] = [
  [5, 61],
  [5, 60],
  [5.6, 58.9],
  [7.1, 58],
  [8.5, 58.3],
  [10.6, 59.2],
  [11.2, 58.4],
  [12, 57.6],
  [12.6, 56],
  [10.5, 57.6],
  [8.2, 56.9],
  [8.1, 55.5],
  [8.6, 53.9],
  [7, 53.5],
  [5, 53.3],
  [4, 51.9],
  [3.2, 51.3],
  [1.6, 50.9],
  [1.4, 50.1],
  [0.1, 49.6],
  [-1.3, 49.6],
  [-1.6, 48.7],
  [-3, 48.8],
  [-4.7, 48.4],
  [-4.2, 47.8],
  [-2.4, 47.2],
  [-1.2, 46],
  [-1.3, 44.6],
  [-1.8, 43.4],
  [-3.8, 43.5],
  [-7.9, 43.7],
  [-9.3, 43],
  [-8.9, 41.2],
  [-9.5, 38.8],
  [-8.8, 37],
  [-6.3, 36.6],
  [-5.6, 36],
  [-4.4, 36.7],
  [-2, 36.8],
  [-0.5, 38.3],
  [0.2, 39.5],
  [0.9, 41],
  [3.2, 41.9],
  [3.1, 43.1],
  [4.8, 43.4],
  [7.5, 43.8],
  [8.9, 44.4],
  [10.3, 43.5],
  [11.1, 42.4],
  [12.5, 41.5],
  [14.2, 40.8],
  [15.7, 39.6],
  [16.1, 38],
  [17.1, 39],
  [16.9, 40.4],
  [18.5, 40.1],
  [17, 41],
  [15.6, 42],
  [13.6, 43.6],
  [12.3, 44.5],
  [12.5, 45.5],
  [13.8, 45.6],
  [15.2, 44.3],
  [17.4, 43],
  [19.4, 41.8],
  [19.4, 40.3],
  [20.6, 38.8],
  [21.6, 37.5],
  [22.9, 36.5],
  [23.2, 38],
  [22.9, 40.5],
  [26, 40.8],
  [26.2, 40],
  [26.8, 38.4],
  [27.4, 37],
  [28.5, 36.6],
  [30.6, 36.8],
  [32.5, 36.1],
  [34.6, 36.8],
  [36.2, 36.6],
  [35.8, 35.2],
  [35.5, 33.9],
  [34.9, 32.8],
  [34.3, 31.3],
  [32.6, 31.1],
  [32.9, 29.9],
  [34.3, 27.8],
  [34.9, 29.5],
  [36.5, 26],
  [38.8, 22.5],
  [41, 18],
  [42.7, 15.5],
  [43.5, 12.7],
  [45, 12.8],
  [48.5, 14],
  [52, 15.8],
  [55.3, 17.5],
  [57.5, 18.9],
  [59.8, 22.5],
  [58.5, 23.6],
  [56.3, 24.9],
  [56.4, 26.3],
  [55.4, 25.3],
  [54.4, 24.4],
  [52, 24],
  [51.5, 25.3],
  [51.2, 26.1],
  [50.8, 24.8],
  [50.1, 26.5],
  [48.5, 28.4],
  [48, 29.9],
  [48.8, 30.4],
  [50.5, 29.5],
  [51.5, 27.8],
  [54, 26.6],
  [56.3, 27.1],
  [57.3, 25.8],
  [61.5, 25.2],
  [63, 25.2],
  [63, 61],
];

const GREAT_BRITAIN: LonLat[] = [
  [-5.7, 50.05],
  [-3.5, 50.4],
  [-1.3, 50.8],
  [1.4, 51.2],
  [0.9, 51.8],
  [1.7, 52.7],
  [0.3, 53.2],
  [0.1, 53.6],
  [-0.2, 54.1],
  [-1.2, 54.6],
  [-1.6, 55.6],
  [-2.6, 56.1],
  [-2.3, 56.9],
  [-1.8, 57.6],
  [-3.3, 58.6],
  [-5, 58.6],
  [-5.7, 57.5],
  [-5.6, 56.3],
  [-4.9, 55.7],
  [-5.1, 54.8],
  [-3.4, 54.9],
  [-3, 53.4],
  [-4.6, 53.3],
  [-4.1, 52.9],
  [-4.2, 52.2],
  [-5.1, 51.8],
  [-4.2, 51.6],
  [-3.2, 51.4],
  [-4.2, 51.2],
];

const IRELAND: LonLat[] = [
  [-6.3, 52.2],
  [-6, 53.4],
  [-6.2, 54],
  [-5.5, 54.6],
  [-6.1, 55.2],
  [-7.3, 55.3],
  [-8.3, 55.1],
  [-8.6, 54.3],
  [-10, 54.2],
  [-9.9, 53.4],
  [-9, 53.2],
  [-9.9, 52.1],
  [-10.3, 51.8],
  [-9.5, 51.5],
  [-8.2, 51.8],
];

const ISLANDS: LonLat[][] = [
  [
    [12.4, 37.9],
    [13.5, 38.2],
    [15.6, 38.3],
    [15.1, 36.7],
  ], // Sicily
  [
    [8.4, 39],
    [9.6, 39.1],
    [9.8, 41],
    [9.4, 43],
    [8.6, 42.4],
  ], // Sardinia & Corsica
  [
    [23.5, 35.3],
    [24.5, 35.5],
    [26.3, 35.2],
    [25, 35],
  ], // Crete
];

/** Inland seas drawn back in as water on top of the land. */
const SEAS: LonLat[][] = [
  [
    [28, 41.3],
    [28.5, 43.5],
    [30, 45.2],
    [31.8, 46.6],
    [33.6, 44.4],
    [36.5, 45.2],
    [38, 44.6],
    [39.8, 43.4],
    [41.5, 41.6],
    [39, 41],
    [36, 41.7],
    [33, 42],
    [31, 41.1],
  ], // Black Sea
  [
    [49.5, 46.5],
    [51.5, 47],
    [53, 45.5],
    [51.5, 44.3],
    [52.8, 41.8],
    [53.8, 40.6],
    [54, 37.3],
    [51, 36.8],
    [49, 37.6],
    [49.5, 40.3],
    [47.5, 42.5],
    [47, 44.5],
  ], // Caspian Sea
];

const toPoint = ([lon, lat]: LonLat) => project({ lon, lat }, MAP_BOUNDS, MAP_SIZE);

function polygonPath(points: LonLat[]): string {
  return (
    points
      .map(toPoint)
      .map(({ x, y }, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join("") + "Z"
  );
}

export const landPaths = [AFRICA, EURASIA, GREAT_BRITAIN, IRELAND, ...ISLANDS].map(polygonPath);
export const seaPaths = SEAS.map(polygonPath);

/** Graticule lines every 10°. */
export const graticule = {
  meridians: Array.from({ length: 9 }, (_, i) => -20 + i * 10).map((lon) => toPoint([lon, 0]).x),
  parallels: Array.from({ length: 7 }, (_, i) => i * 10).map((lat) => toPoint([0, lat]).y),
  equator: toPoint([0, 0]).y,
};

export interface CityPoint {
  code: AirportCode;
  x: number;
  y: number;
  /** Position as a percentage of the map box (for HTML overlays). */
  left: number;
  top: number;
}

export const cityPoints: CityPoint[] = airports.map((a) => {
  const { x, y } = project(a, MAP_BOUNDS, MAP_SIZE);
  return { code: a.code, x, y, left: (x / MAP_SIZE.width) * 100, top: (y / MAP_SIZE.height) * 100 };
});

export const cityPoint = (code: AirportCode) => cityPoints.find((c) => c.code === code)!;

export interface RoutePath {
  id: string;
  from: AirportCode;
  to: AirportCode;
  d: string;
}

/** Quadratic arcs that bow away from the straight line, like great-circle routes on a flat map. */
export const routePaths: RoutePath[] = routes.map(([from, to]) => {
  const a = cityPoint(from);
  const b = cityPoint(to);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const bow = Math.max(18, length * 0.22);
  // Normal pointing "up" the map so arcs bulge northwards.
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return {
    id: `${from}-${to}`,
    from,
    to,
    d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
  };
});

export function connectionsFor(code: AirportCode): AirportCode[] {
  return routes.flatMap(([a, b]) => (a === code ? [b] : b === code ? [a] : []));
}

export { airportByCode };
