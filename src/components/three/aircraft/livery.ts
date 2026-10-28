import * as THREE from "three";
import { loopU } from "./geometry";

/*
 * Original Nordair livery, painted at runtime on canvases (no image downloads):
 * gloss white crown, navy belly, a sunrise-gradient cheatline sweeping up to the tail,
 * the "N" wing-mark on a navy fin and a NORDAIR wordmark. Plus grayscale bump maps
 * for panel lines, so surfaces read as engineered rather than smooth plastic.
 */

export const NAVY = "#0b1b3a";
export const ORANGE = "#ff7a3d";
export const AMBER = "#ffc27a";
const EMBER = "#e8552b";

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return [c, c.getContext("2d")!] as const;
}

function toTexture(c: HTMLCanvasElement, color: boolean) {
  const tex = new THREE.CanvasTexture(c);
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function displayFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
  return family || "Arial, sans-serif";
}

/**
 * Fuselage texture layout: x runs tail (0) → nose (W); y is the angle around the body,
 * with the crown at H/2 and the belly at the top and bottom edges.
 */
export interface FuselageMaps {
  map: THREE.Texture;
  bumpMap: THREE.Texture;
  emissiveMap: THREE.Texture;
}

const WINDOW_START = 0.16;
const WINDOW_END = 0.74;
const DOORS = [0.3, 0.62];

export function fuselageMaps(width = 2048): FuselageMaps {
  const W = width;
  const H = width / 4;
  const k = W / 4096;

  // --- colour ---
  const [c, g] = canvas(W, H);
  g.fillStyle = "#f5f6f8";
  g.fillRect(0, 0, W, H);
  g.fillStyle = NAVY;
  g.fillRect(0, 0, W, H * 0.2);
  g.fillRect(0, H * 0.8, W, H * 0.2);
  for (const side of [1, -1]) {
    const base = side === 1 ? H * 0.2 : H * 0.8;
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, EMBER);
    grad.addColorStop(0.4, ORANGE);
    grad.addColorStop(1, AMBER);
    g.fillStyle = grad;
    g.beginPath();
    // sweeps up towards the tail (left of the canvas)
    g.moveTo(W, base);
    g.bezierCurveTo(W * 0.7, base, W * 0.45, base, W * 0.2, base + side * H * 0.16);
    g.lineTo(0, base + side * H * 0.24);
    g.lineTo(0, base + side * H * 0.2);
    g.bezierCurveTo(
      W * 0.38,
      base + side * H * 0.02,
      W * 0.7,
      base + side * H * 0.035,
      W,
      base + side * H * 0.035,
    );
    g.closePath();
    g.fill();
  }
  const windows = (ctx: CanvasRenderingContext2D, fill: string) => {
    ctx.fillStyle = fill;
    for (const vy of [0.33, 0.67]) {
      for (let x = W * (1 - WINDOW_END); x < W * (1 - WINDOW_START); x += 34 * k) {
        if (DOORS.some((d) => Math.abs(x - W * (1 - d)) < 40 * k)) continue;
        ctx.beginPath();
        ctx.roundRect(x, H * vy - 13 * k, 16 * k, 26 * k, 7 * k);
        ctx.fill();
      }
    }
  };
  windows(g, "#1b2433");
  // cockpit
  g.fillStyle = "#121a26";
  for (const vy of [0.37, 0.63]) {
    g.beginPath();
    g.roundRect(W * 0.958, H * vy - 26 * k, 70 * k, 40 * k, 10 * k);
    g.fill();
  }
  // wordmark, readable from both sides (one copy is mirrored for the far side)
  g.font = `800 ${Math.round(150 * k)}px ${displayFont()}`;
  g.fillStyle = NAVY;
  g.textBaseline = "middle";
  g.textAlign = "right";
  g.save();
  g.translate(W * 0.47 - 980 * k, H * 0.405);
  g.scale(-1, -1);
  g.fillText("NORDAIR", 0, 0);
  g.restore();
  g.save();
  g.translate(W * 0.47, H * 0.595);
  g.fillText("NORDAIR", 0, 0);
  g.restore();

  // --- panel lines (bump) ---
  const [b, bg] = canvas(W, H);
  bg.fillStyle = "#808080";
  bg.fillRect(0, 0, W, H);
  bg.strokeStyle = "#5a5a5a";
  bg.lineWidth = Math.max(1, 2 * k);
  for (let x = W * 0.06; x < W * 0.97; x += W * 0.055) {
    bg.beginPath();
    bg.moveTo(x, 0);
    bg.lineTo(x, H);
    bg.stroke();
  }
  // doors and service hatches
  for (const d of DOORS) {
    for (const vy of [0.33, 0.67]) {
      bg.strokeRect(W * (1 - d) - 30 * k, H * vy - 60 * k, 60 * k, 100 * k);
    }
  }
  bg.strokeRect(W * 0.9, H * 0.33 - 50 * k, 50 * k, 80 * k);
  bg.strokeRect(W * 0.9, H * 0.67 - 30 * k, 50 * k, 80 * k);

  // --- window glow (emissive) ---
  const [e, eg] = canvas(W, H);
  eg.fillStyle = "#000";
  eg.fillRect(0, 0, W, H);
  windows(eg, "#ffd9a8");

  return { map: toTexture(c, true), bumpMap: toTexture(b, false), emissiveMap: toTexture(e, true) };
}

/** Fin colour map: navy with the wing-mark, mirrored on the far side by the fin UVs. */
export function finMap(size = 1024) {
  const S = size;
  const [c, g] = canvas(S, S);
  const grad = g.createLinearGradient(0, S, S, 0);
  grad.addColorStop(0, "#13284f");
  grad.addColorStop(1, NAVY);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.save();
  g.translate(S * 0.5, S * 0.55);
  g.scale(S / 73, -S / 73);
  g.translate(-20, -20);
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(6, 9, 6, 25, 1.6);
  g.fill();
  g.beginPath();
  g.roundRect(28, 6, 6, 28, 1.6);
  g.fill();
  const wing = g.createLinearGradient(0, 0, 40, 40);
  wing.addColorStop(0, AMBER);
  wing.addColorStop(0.55, ORANGE);
  wing.addColorStop(1, EMBER);
  g.fillStyle = wing;
  g.fill(new Path2D("M1.5 3.5c4.6.3 8.6 1.9 11.7 4.9L34 32.4V34h-6.1L7.8 12.1C6 10 4.1 7.2 1.5 3.5Z"));
  g.restore();
  return toTexture(c, true);
}

/**
 * Wing panel lines in the lifting-surface UV space: spars, slats, flaps and ailerons
 * (spanwise lines at fixed chord fractions) plus faint ribs.
 */
export function wingBumpMap(points: number, width = 1024) {
  const W = width;
  const H = width / 4;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, W, H);
  const line = (chord: number, upper: boolean, from: number, to: number, shade = "#4f4f4f", px = 2) => {
    const u = loopU(chord, upper, points) * W;
    g.strokeStyle = shade;
    g.lineWidth = px;
    g.beginPath();
    g.moveTo(u, H * (1 - from));
    g.lineTo(u, H * (1 - to));
    g.stroke();
  };
  for (const upper of [true, false]) {
    line(0.12, upper, 0.12, 0.96); // slats
    line(0.72, upper, 0.08, 0.62); // flaps
    line(0.72, upper, 0.66, 0.94); // aileron
    line(0.3, upper, 0, 1, "#707070", 1); // front spar
    line(0.62, upper, 0, 1, "#707070", 1); // rear spar
  }
  // flap / aileron breaks and faint ribs
  g.strokeStyle = "#6a6a6a";
  g.lineWidth = 1;
  for (let s = 0.08; s < 1; s += 0.07) {
    g.beginPath();
    g.moveTo(0, H * (1 - s));
    g.lineTo(W, H * (1 - s));
    g.stroke();
  }
  return toTexture(c, false);
}

/** Fan face: dark disc with swept blades. */
export function fanMap(size = 256) {
  const S = size;
  const [c, g] = canvas(S, S);
  g.fillStyle = "#0b0f16";
  g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2);
  for (let i = 0; i < 22; i++) {
    g.rotate((Math.PI * 2) / 22);
    const blade = g.createLinearGradient(0, 0, S / 2, 0);
    blade.addColorStop(0, "#3a4250");
    blade.addColorStop(1, "#9aa3b2");
    g.fillStyle = blade;
    g.beginPath();
    g.moveTo(S * 0.06, -2);
    g.quadraticCurveTo(S * 0.3, -S * 0.05, S * 0.49, -S * 0.02);
    g.lineTo(S * 0.49, S * 0.035);
    g.quadraticCurveTo(S * 0.3, 0, S * 0.06, 4);
    g.fill();
  }
  return toTexture(c, true);
}

/** Soft round glow used for nav lights, the sun and city lights. */
export function glowMap(size = 128) {
  const S = size;
  const [c, g] = canvas(S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return toTexture(c, true);
}

/** Puffy cloud billboard built from overlapping radial gradients (seeded, so stable). */
export function cloudMap(size = 256, seed = 7) {
  const S = size;
  const [c, g] = canvas(S, S);
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 16; i++) {
    const x = S * (0.22 + rand() * 0.56);
    const y = S * (0.4 + rand() * 0.22);
    const r = S * (0.12 + rand() * 0.17);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
  }
  return toTexture(c, true);
}
