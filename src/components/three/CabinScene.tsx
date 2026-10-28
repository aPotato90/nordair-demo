"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CABIN_LAYOUT } from "@/lib/seats";
import type { Cabin } from "@/lib/pricing";
import { SceneCanvas } from "./SceneCanvas";
import type { SceneProps } from "./Stage3D";

export interface CabinSceneProps {
  /** Scroll progress through the cabin sequence: 0 economy → 0.5 comfort → 1 suites. */
  progress: { value: number };
}

const CABINS: Cabin[] = ["economy", "comfort", "business"];
const MOOD: Record<Cabin, { light: string; seat: string }> = {
  economy: { light: "#8fb8ff", seat: "#4f78bd" },
  comfort: { light: "#ffb35c", seat: "#c97a3e" },
  business: { light: "#b48cff", seat: "#5b3fa0" },
};
/** Scroll windows in which one layout hands over to the next. */
const TRANSITIONS: Array<[number, number]> = [
  [0.2, 0.42],
  [0.58, 0.8],
];
const SEAT_SPEC: Record<Cabin, { width: number; gap: number; aisle: number; pitch: number; rows: number }> = {
  economy: { width: 0.46, gap: 0.04, aisle: 0.55, pitch: 0.8, rows: 15 },
  comfort: { width: 0.52, gap: 0.05, aisle: 0.42, pitch: 0.98, rows: 12 },
  business: { width: 1.0, gap: 0.12, aisle: 0.5, pitch: 1.9, rows: 7 },
};
const FLOOR_HALF_WIDTH = 2.7;
const CABIN_LENGTH = 28;

/* ---------- geometry ---------- */

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, tilt = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (tilt) g.rotateX(tilt);
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** The camera looks aft from the galley, so seats are turned to face it. */
function facingCamera(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts)!;
  merged.rotateY(Math.PI);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Seat in the cabin's upholstery colour with dark frames and a warm headrest cover. */
function seatGeometry(width: number, upholstery: string) {
  const frame = "#3a3f4a";
  return facingCamera([
    box(width, 0.14, 0.5, 0, 0.46, 0, upholstery),
    box(width, 0.78, 0.12, 0, 0.88, 0.25, upholstery, -0.18),
    box(width * 0.8, 0.16, 0.1, 0, 1.33, 0.33, "#ffd9b0", -0.18),
    box(0.06, 0.2, 0.44, -width / 2, 0.6, 0.02, frame),
    box(0.06, 0.2, 0.44, width / 2, 0.6, 0.02, frame),
    box(width * 0.7, 0.38, 0.06, 0, 0.2, -0.05, frame),
  ]);
}

function suiteGeometry(upholstery: string) {
  const shell = "#e9e4dc";
  return facingCamera([
    box(0.06, 0.95, 1.7, -0.5, 0.58, 0, shell),
    box(0.06, 0.95, 1.7, 0.5, 0.58, 0, shell),
    box(1.0, 0.95, 0.06, 0, 0.58, 0.85, shell),
    box(0.58, 0.16, 0.65, -0.12, 0.48, 0.35, upholstery),
    box(0.58, 0.85, 0.14, -0.12, 0.95, 0.66, upholstery, -0.2),
    box(0.5, 0.22, 0.45, -0.12, 0.36, -0.5, upholstery),
    box(0.3, 0.06, 0.9, 0.3, 0.78, 0.1, "#3a3f4a"),
  ]);
}

interface SeatSlot {
  position: THREE.Vector3;
  /** 0 near the camera → 1 far away, so changes ripple down the aisle. */
  stagger: number;
}

function layoutSlots(cabin: Cabin): SeatSlot[] {
  const spec = SEAT_SPEC[cabin];
  const blocks = CABIN_LAYOUT[cabin].blocks;
  const blockWidths = blocks.map((b) => b.length * spec.width + (b.length - 1) * spec.gap);
  const total = blockWidths.reduce((a, b) => a + b, 0) + spec.aisle * (blocks.length - 1);
  const slots: SeatSlot[] = [];
  for (let r = 0; r < spec.rows; r++) {
    let x = -total / 2;
    blocks.forEach((block, bi) => {
      block.forEach((_, si) => {
        slots.push({
          position: new THREE.Vector3(
            x + spec.width / 2 + si * (spec.width + spec.gap),
            0,
            3 - r * spec.pitch,
          ),
          stagger: r / spec.rows,
        });
      });
      x += blockWidths[bi] + spec.aisle;
    });
  }
  return slots;
}

/** How present each cabin is (0–1) for a seat with the given stagger. */
function presence(p: number, cabinIndex: number, stagger: number) {
  const local = (t: number, start: number) => THREE.MathUtils.clamp((t - start - stagger * 0.45) / 0.3, 0, 1);
  const into =
    cabinIndex === 0
      ? 1
      : (() => {
          const [a, b] = TRANSITIONS[cabinIndex - 1];
          return THREE.MathUtils.smootherstep(local((p - a) / (b - a), 0.25), 0, 1);
        })();
  const out =
    cabinIndex === CABINS.length - 1
      ? 0
      : (() => {
          const [a, b] = TRANSITIONS[cabinIndex];
          return THREE.MathUtils.smootherstep(local((p - a) / (b - a), 0), 0, 1);
        })();
  return Math.min(into, 1 - out);
}

/* ---------- scene ---------- */

function Shell() {
  const windowTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f2efe9";
    g.fillRect(0, 0, 1024, 256);
    g.fillStyle = "#ffd9a8";
    for (let x = 20; x < 1024; x += 64) {
      for (const y of [70, 160]) {
        g.beginPath();
        g.roundRect(x, y, 22, 34, 10);
        g.fill();
      }
    }
    const windowTex = new THREE.CanvasTexture(c);
    windowTex.colorSpace = THREE.SRGBColorSpace;
    windowTex.wrapS = THREE.RepeatWrapping;
    return windowTex;
  }, []);
  useEffect(() => () => windowTex.dispose(), [windowTex]);
  return (
    <group>
      {/* curved fuselage wall, seen from inside */}
      <mesh rotation-x={Math.PI / 2} position={[0, 1.05, 3 - CABIN_LENGTH / 2 + 2]}>
        <cylinderGeometry args={[2.95, 2.95, CABIN_LENGTH, 48, 1, true]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#f2efe9"
          roughness={0.85}
          emissiveMap={windowTex}
          emissive="#ffffff"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* carpet with a sunrise aisle line */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 3 - CABIN_LENGTH / 2 + 2]} receiveShadow>
        <planeGeometry args={[FLOOR_HALF_WIDTH * 2, CABIN_LENGTH]} />
        <meshStandardMaterial color="#14244a" roughness={0.95} />
      </mesh>
      {/* rear bulkhead closes the view down the aisle */}
      <mesh position={[0, 1.05, 3 - CABIN_LENGTH + 2.2]}>
        <circleGeometry args={[2.95, 48]} />
        <meshStandardMaterial color="#e9e4dc" roughness={0.7} emissive="#ffd9a8" emissiveIntensity={0.15} />
      </mesh>
      {/* overhead bins with a mood-lit edge */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 2.05, 2.35, 3 - CABIN_LENGTH / 2 + 2]} rotation-z={side * -0.35}>
          <boxGeometry args={[0.9, 0.5, CABIN_LENGTH]} />
          <meshStandardMaterial color="#f7f5f1" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Seats({ progress }: { progress: { value: number } }) {
  const meshes = useMemo(() => {
    return CABINS.map((cabin) => {
      const upholstery = MOOD[cabin].seat;
      const geometry =
        cabin === "business" ? suiteGeometry(upholstery) : seatGeometry(SEAT_SPEC[cabin].width, upholstery);
      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.65,
        metalness: 0.05,
      });
      const slots = layoutSlots(cabin);
      const mesh = new THREE.InstancedMesh(geometry, material, slots.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return { cabin, mesh, slots };
    });
  }, []);
  useEffect(
    () => () =>
      meshes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }),
    [meshes],
  );

  const last = useRef(-1);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const p = progress.value;
    if (Math.abs(p - last.current) < 0.0005) return;
    last.current = p;
    meshes.forEach(({ mesh, slots }, ci) => {
      let visible = false;
      slots.forEach((slot, i) => {
        const k = presence(p, ci, slot.stagger);
        if (k > 0.001) visible = true;
        const eased = 1 - (1 - k) ** 3;
        pos.copy(slot.position).setY((1 - eased) * 1.4);
        s.setScalar(Math.max(eased, 0.0001));
        m.compose(pos, q, s);
        mesh.setMatrixAt(i, m);
      });
      mesh.visible = visible;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {meshes.map(({ cabin, mesh }) => (
        <primitive key={cabin} object={mesh} />
      ))}
    </>
  );
}

function Lighting({ progress }: { progress: { value: number } }) {
  const lights = useRef<Array<THREE.PointLight | null>>([]);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const colors = useMemo(() => CABINS.map((c) => new THREE.Color(MOOD[c].light)), []);
  const mixed = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const p = progress.value;
    const [a1, b1] = TRANSITIONS[0];
    const [a2, b2] = TRANSITIONS[1];
    mixed
      .copy(colors[0])
      .lerp(colors[1], THREE.MathUtils.smoothstep(p, a1, b1))
      .lerp(colors[2], THREE.MathUtils.smoothstep(p, a2, b2));
    lights.current.forEach((l) => l?.color.copy(mixed));
    hemi.current?.color.copy(mixed);
  });

  return (
    <>
      <hemisphereLight ref={hemi} groundColor="#1b2340" intensity={0.9} />
      {[2, -4, -10].map((z, i) => (
        <pointLight
          key={z}
          ref={(el) => {
            lights.current[i] = el;
          }}
          position={[0, 2.5, z]}
          intensity={9}
          distance={11}
          decay={1.6}
        />
      ))}
      <directionalLight position={[3, 6, 6]} intensity={1.2} color="#fff4e2" />
    </>
  );
}

function CameraDolly({ progress, capture }: { progress: { value: number }; capture: boolean }) {
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }, delta) => {
    const p = progress.value;
    const t = capture ? 0 : clock.elapsedTime;
    desired.set(Math.sin(p * Math.PI * 2) * 0.6 + Math.sin(t * 0.3) * 0.05, 2.25 - p * 0.15, 6.4 - p * 1.6);
    camera.position.lerp(desired, capture ? 1 : 1 - Math.exp(-delta * 3));
    target.set(Math.sin(p * Math.PI * 2) * -0.4, 0.55, -4);
    camera.lookAt(target);
  });
  return null;
}

export default function CabinScene({ progress, ...stage }: SceneProps & CabinSceneProps) {
  const capture = stage.capture !== null;
  const source = useMemo(
    () => (capture ? { value: stage.capture! } : progress),
    [capture, stage.capture, progress],
  );
  return (
    <SceneCanvas {...stage} camera={{ fov: 52, near: 0.1, far: 60, position: [0, 2.2, 6.4] }} maxDpr={1.5}>
      <color attach="background" args={["#dcdfe6"]} />
      <fog attach="fog" args={["#dcdfe6", 10, 30]} />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[6, 30, 1]} />
      </Environment>
      <Lighting progress={source} />
      <Shell />
      <Seats progress={source} />
      <CameraDolly progress={source} capture={capture} />
    </SceneCanvas>
  );
}
