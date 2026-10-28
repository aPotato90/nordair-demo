import * as THREE from "three";
import { fuselageGeometry, latheX, liftingSurface } from "./geometry";
import { fanMap, finMap, fuselageMaps, glowMap, NAVY, ORANGE, wingBumpMap } from "./livery";

/** The fictional Nordair "Kestrel 500" twinjet, built entirely from code. Units ≈ metres, nose +x. */
export interface Aircraft {
  group: THREE.Group;
  fans: THREE.Object3D[];
  navLights: THREE.Sprite[];
  strobe: THREE.Sprite;
  paint: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

const deg = THREE.MathUtils.degToRad;
const WING_POINTS = 22;

// Wing planform (shared by placement maths below).
const WING = { rootChord: 8.5, tipChord: 1.9, span: 17.5, sweep: Math.tan(deg(30)) * 17.5, dihedral: deg(5) };
const WING_ROOT = new THREE.Vector3(4.85, -1.15, 1.6);

/** Planar side-on UVs so the fin artwork reads correctly from both sides. */
function projectSideUV(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox!;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) - min.x) / (max.x - min.x);
    uv.setXY(i, pos.getZ(i) < 0 ? 1 - u : u, (pos.getY(i) - min.y) / (max.y - min.y));
  }
  uv.needsUpdate = true;
}

export function buildAircraft({ textureSize = 2048 }: { textureSize?: number } = {}): Aircraft {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  const fuselageTex = fuselageMaps(textureSize);
  Object.values(fuselageTex).forEach(track);
  const paint = track(
    new THREE.MeshPhysicalMaterial({
      map: fuselageTex.map,
      bumpMap: fuselageTex.bumpMap,
      bumpScale: 0.6,
      emissiveMap: fuselageTex.emissiveMap,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0,
      roughness: 0.34,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
    }),
  );
  const wingMat = track(
    new THREE.MeshPhysicalMaterial({
      color: "#c3c8d1",
      bumpMap: track(wingBumpMap(WING_POINTS, textureSize / 2)),
      bumpScale: 0.7,
      roughness: 0.38,
      metalness: 0.45,
      clearcoat: 0.3,
    }),
  );
  const tailMat = track(
    new THREE.MeshPhysicalMaterial({ color: "#c3c8d1", roughness: 0.38, metalness: 0.45, clearcoat: 0.3 }),
  );
  const navyPaint = track(
    new THREE.MeshPhysicalMaterial({
      color: NAVY,
      roughness: 0.32,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
  );
  const orangePaint = track(new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: 0.3, clearcoat: 1 }));
  const metal = track(new THREE.MeshStandardMaterial({ color: "#aeb4bd", roughness: 0.22, metalness: 1 }));
  const finMat = track(
    new THREE.MeshPhysicalMaterial({
      map: track(finMap(textureSize / 2)),
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
  );
  const fanMat = track(
    new THREE.MeshStandardMaterial({ map: track(fanMap()), roughness: 0.5, metalness: 0.6 }),
  );

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    track(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Fuselage and wing-body fairing.
  add(fuselageGeometry(), paint);
  const fairing = add(new THREE.SphereGeometry(1, 40, 20), navyPaint);
  fairing.scale.set(6.5, 1.1, 2.15);
  fairing.position.set(0.2, -1.55, 0);

  const fans: THREE.Object3D[] = [];
  const navLights: THREE.Sprite[] = [];
  const glow = track(glowMap());

  for (const side of [1, -1] as const) {
    const mirror = side === -1;

    // Main wing: cambered airfoil, taper, sweep, dihedral and washout.
    const wing = add(
      liftingSurface({
        ...WING,
        thickness: [0.135, 0.1],
        camber: 0.022,
        twist: -deg(3),
        mirror,
      }),
      wingMat,
    );
    wing.position.set(WING_ROOT.x, WING_ROOT.y, -side * WING_ROOT.z);

    const tipX = WING_ROOT.x - WING.sweep;
    const tipY = WING_ROOT.y + Math.tan(WING.dihedral) * WING.span;
    const tipZ = -side * (WING_ROOT.z + WING.span);

    // Sharklet: canted winglet in livery navy.
    const sharklet = add(
      liftingSurface({
        rootChord: 1.85,
        tipChord: 0.6,
        span: 2.5,
        sweep: 1.9,
        thickness: [0.1, 0.08],
        stations: 6,
        points: 12,
        mirror,
      }),
      navyPaint,
    );
    sharklet.position.set(tipX, tipY + 0.05, tipZ);
    sharklet.rotation.x = side * (Math.PI / 2 - 0.22);

    // Flap-track fairings under the trailing edge.
    for (const s of [0.24, 0.44, 0.64]) {
      const chord = THREE.MathUtils.lerp(WING.rootChord, WING.tipChord, s);
      const te = WING_ROOT.x - WING.sweep * s - chord;
      const pod = add(
        latheX(
          [
            [1.4, 0],
            [1.1, 0.16],
            [-0.6, 0.2],
            [-1.6, 0],
          ],
          16,
        ),
        tailMat,
      );
      pod.position.set(
        te + 0.9,
        WING_ROOT.y + Math.tan(WING.dihedral) * WING.span * s - 0.28,
        -side * (WING_ROOT.z + WING.span * s),
      );
      pod.scale.set(1, 1, 0.8);
    }

    // Engine: navy nacelle, sunrise-orange intake lip, spinning fan, metal exhaust.
    const engine = new THREE.Group();
    const nacelle = new THREE.Mesh(
      track(
        latheX(
          [
            [2.6, 1.04],
            [2.45, 1.22],
            [1.6, 1.3],
            [-0.6, 1.22],
            [-2.0, 0.92],
            [-2.4, 0.7],
          ],
          56,
        ),
      ),
      navyPaint,
    );
    nacelle.castShadow = true;
    engine.add(nacelle);
    const lip = new THREE.Mesh(track(new THREE.TorusGeometry(1.08, 0.13, 16, 56)), orangePaint);
    lip.rotation.y = Math.PI / 2;
    lip.position.x = 2.6;
    engine.add(lip);
    const fan = new THREE.Group();
    const disc = new THREE.Mesh(track(new THREE.CircleGeometry(1.0, 48)), fanMat);
    disc.rotation.y = Math.PI / 2;
    fan.add(disc);
    const spinner = new THREE.Mesh(track(new THREE.ConeGeometry(0.32, 0.7, 32)), metal);
    spinner.rotation.z = -Math.PI / 2;
    spinner.position.x = 0.3;
    fan.add(spinner);
    fan.position.x = 2.2;
    engine.add(fan);
    fans.push(fan);
    engine.add(
      new THREE.Mesh(
        track(
          latheX(
            [
              [-2.3, 0.62],
              [-3.4, 0.38],
              [-3.6, 0],
            ],
            32,
          ),
        ),
        metal,
      ),
    );
    const pylon = new THREE.Mesh(track(new THREE.BoxGeometry(3.6, 1.0, 0.32)), tailMat);
    pylon.position.set(-0.3, 1.1, 0);
    engine.add(pylon);
    engine.position.set(2.4, -2.55 + Math.tan(WING.dihedral) * 6, -side * 7.2);
    group.add(engine);

    // Horizontal stabiliser.
    const stab = add(
      liftingSurface({
        rootChord: 4.2,
        tipChord: 1.5,
        span: 6.6,
        sweep: Math.tan(deg(33)) * 6.6,
        dihedral: deg(6),
        thickness: [0.11, 0.09],
        stations: 8,
        points: 16,
        mirror,
      }),
      tailMat,
    );
    stab.position.set(-13.7, 1.0, -side * 0.6);

    // Nav lights: green starboard (right, −z), red port.
    const light = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: glow,
          color: side === 1 ? "#39ff9a" : "#ff3b4e",
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }),
      ),
    );
    light.position.set(tipX - 0.4, tipY + 0.1, tipZ - side * 0.25);
    light.scale.setScalar(1.2);
    group.add(light);
    navLights.push(light);
  }

  // Vertical fin with the wing-mark livery.
  const finGeo = liftingSurface({
    rootChord: 7.6,
    tipChord: 2.8,
    span: 8.4,
    sweep: 4.6,
    thickness: [0.11, 0.09],
    stations: 10,
    points: 18,
  });
  finGeo.rotateX(Math.PI / 2);
  projectSideUV(finGeo);
  const fin = add(finGeo, finMat);
  fin.position.set(-11, 1.2, 0);

  // Tail strobe.
  const strobe = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: glow,
        color: "#ffffff",
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    ),
  );
  strobe.position.set(-18.9, 1.6, 0);
  strobe.scale.setScalar(1.4);
  group.add(strobe);

  return {
    group,
    fans,
    navLights,
    strobe,
    paint,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
