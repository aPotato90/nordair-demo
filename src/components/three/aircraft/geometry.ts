import * as THREE from "three";

/**
 * NACA 4-digit airfoil as a closed loop: upper surface from trailing edge to leading
 * edge, then lower surface back to the trailing edge. Coordinates are chord-normalised
 * (x: 0 = leading edge, 1 = trailing edge).
 */
export function nacaLoop(points: number, camber: number, camberPos: number, thickness: number) {
  const loop: Array<[number, number]> = [];
  const surface = (x: number) => {
    const yt =
      5 *
      thickness *
      (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    let yc = 0;
    if (camber > 0) {
      yc =
        x < camberPos
          ? (camber / camberPos ** 2) * (2 * camberPos * x - x * x)
          : (camber / (1 - camberPos) ** 2) * (1 - 2 * camberPos + 2 * camberPos * x - x * x);
    }
    return { yt, yc };
  };
  // Cosine spacing packs vertices around the rounded leading edge.
  const xs = Array.from({ length: points + 1 }, (_, i) => 0.5 * (1 - Math.cos((Math.PI * i) / points)));
  for (let i = points; i >= 0; i--) {
    const { yt, yc } = surface(xs[i]);
    loop.push([xs[i], yc + yt]);
  }
  for (let i = 1; i <= points; i++) {
    const { yt, yc } = surface(xs[i]);
    loop.push([xs[i], yc - yt]);
  }
  return loop;
}

/** Texture u coordinate of a chord position on the upper or lower surface of a `nacaLoop`. */
export function loopU(chord: number, upper: boolean, points: number) {
  const i = (Math.acos(1 - 2 * chord) / Math.PI) * points;
  const index = upper ? points - i : points + i;
  return index / (2 * points);
}

export interface SurfaceSpec {
  rootChord: number;
  tipChord: number;
  span: number;
  /** How far the leading edge moves back (−x) between root and tip. */
  sweep: number;
  dihedral?: number;
  /** Thickness ratio at root and tip (e.g. 0.14 → 0.1). */
  thickness: [number, number];
  camber?: number;
  /** Washout: tip leading edge twisted down, radians. */
  twist?: number;
  stations?: number;
  points?: number;
  /** Build the mirror image (span towards +z instead of −z). */
  mirror?: boolean;
  /** Close the tip with a cap. */
  cap?: boolean;
}

/**
 * Lofts airfoil sections along the span into a lifting surface. Local frame: leading
 * edge at x = 0 (pointing +x, towards the nose), span along −z (or +z when mirrored),
 * thickness along y. UVs: u around the airfoil, v along the span.
 */
export function liftingSurface(spec: SurfaceSpec): THREE.BufferGeometry {
  const {
    rootChord,
    tipChord,
    span,
    sweep,
    dihedral = 0,
    thickness,
    camber = 0,
    twist = 0,
    stations = 14,
    points = 22,
    mirror = false,
    cap = true,
  } = spec;
  const side = mirror ? 1 : -1;
  const loopLength = points * 2 + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= stations; j++) {
    const s = j / stations;
    const chord = THREE.MathUtils.lerp(rootChord, tipChord, s);
    const t = THREE.MathUtils.lerp(thickness[0], thickness[1], s);
    const loop = nacaLoop(points, camber * (1 - s * 0.5), 0.4, t);
    const leX = -sweep * s;
    const y0 = Math.tan(dihedral) * span * s;
    const angle = twist * s;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    loop.forEach(([xn, yn], i) => {
      // rotate the section about its quarter chord for washout
      const px = -(xn - 0.25) * chord;
      const py = yn * chord;
      const rx = px * cos - py * sin - 0.25 * chord;
      const ry = px * sin + py * cos;
      positions.push(leX + rx, y0 + ry, side * span * s);
      uvs.push(i / (loopLength - 1), s);
    });
  }

  for (let j = 0; j < stations; j++) {
    for (let i = 0; i < loopLength - 1; i++) {
      const a = j * loopLength + i;
      const b = a + 1;
      const c = a + loopLength;
      const d = c + 1;
      if (mirror) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }

  if (cap) {
    // Separate vertices for the tip cap so its edge stays crisp.
    const start = positions.length / 3;
    const tipRow = stations * loopLength;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < loopLength; i++) {
      const k = (tipRow + i) * 3;
      positions.push(positions[k], positions[k + 1], positions[k + 2]);
      uvs.push(i / (loopLength - 1), 1);
      cx += positions[k];
      cy += positions[k + 1];
      cz += positions[k + 2];
    }
    positions.push(cx / loopLength, cy / loopLength, cz / loopLength);
    uvs.push(0.5, 1);
    const centre = start + loopLength;
    for (let i = 0; i < loopLength - 1; i++) {
      if (mirror) indices.push(centre, start + i + 1, start + i);
      else indices.push(centre, start + i, start + i + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Lathe around the x axis from (x, radius) pairs. */
export function latheX(profile: Array<[number, number]>, segments = 64): THREE.BufferGeometry {
  const geo = new THREE.LatheGeometry(
    profile.map(([x, r]) => new THREE.Vector2(r, x)),
    segments,
  );
  geo.rotateZ(-Math.PI / 2);
  return geo;
}

export const FUSELAGE_HALF_LENGTH = 19;

/**
 * Fuselage: a lathe profile with an upswept tail cone and a gently drooped nose.
 * UVs are rewritten so u runs tail→nose and v runs around the body (top = 0.5),
 * which keeps the livery texture easy to paint.
 */
export function fuselageGeometry(): THREE.BufferGeometry {
  const L = FUSELAGE_HALF_LENGTH;
  const profile: Array<[number, number]> = [
    [L, 0],
    [L - 0.22, 0.5],
    [L - 0.75, 1.0],
    [L - 1.7, 1.45],
    [L - 3.1, 1.82],
    [L - 5, 2.0],
    [-8, 2.0],
    [-10.5, 1.86],
    [-13, 1.48],
    [-15.5, 0.98],
    [-17.6, 0.52],
    [-L + 0.25, 0.2],
    [-L, 0],
  ];
  const geo = latheX(profile, 96);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    uv.setXY(i, (x + L) / (2 * L), Math.atan2(z, y) / (2 * Math.PI) + 0.5);
    let ny = y;
    if (x < -8) ny += (-8 - x) * 0.13 * (y < 0 ? 1.25 : 0.55);
    if (x > L - 5) ny -= (x - (L - 5)) ** 2 * 0.025;
    pos.setY(i, ny);
  }
  geo.computeVertexNormals();
  return geo;
}
