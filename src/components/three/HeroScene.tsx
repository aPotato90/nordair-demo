"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildAircraft } from "./aircraft/buildAircraft";
import { cloudMap, glowMap } from "./aircraft/livery";
import { SceneCanvas } from "./SceneCanvas";
import type { SceneProps } from "./Stage3D";

export interface HeroSceneProps {
  /** Scroll progress through the hero (0 = dawn, 1 = dusk), written by the GSAP timeline. */
  progress: { value: number };
}

/* ---------- time of day ---------- */

interface Look {
  top: THREE.Color;
  mid: THREE.Color;
  horizon: THREE.Color;
  sun: THREE.Color;
  sunDir: THREE.Vector3;
  key: THREE.Color;
  keyIntensity: number;
  fill: THREE.Color;
  env: number;
  exposure: number;
  cloud: THREE.Color;
}

const look = (l: {
  top: string;
  mid: string;
  horizon: string;
  sun: string;
  sunDir: [number, number, number];
  key: string;
  keyIntensity: number;
  fill: string;
  env: number;
  exposure: number;
  cloud: string;
}): Look => ({
  ...l,
  top: new THREE.Color(l.top),
  mid: new THREE.Color(l.mid),
  horizon: new THREE.Color(l.horizon),
  sun: new THREE.Color(l.sun),
  sunDir: new THREE.Vector3(...l.sunDir).normalize(),
  key: new THREE.Color(l.key),
  fill: new THREE.Color(l.fill),
  cloud: new THREE.Color(l.cloud),
});

const DAWN = look({
  top: "#0d1a3d",
  mid: "#5a3f73",
  horizon: "#ff9a5a",
  sun: "#ffb070",
  sunDir: [0.8, 0.06, -0.55],
  key: "#ffb27a",
  keyIntensity: 3.2,
  fill: "#5a6ea8",
  env: 0.55,
  exposure: 1,
  cloud: "#ffd2b8",
});
const MIDDAY = look({
  top: "#0f356f",
  mid: "#3a78c0",
  horizon: "#cfe0ef",
  sun: "#fff3dc",
  sunDir: [0.3, 0.75, 0.4],
  key: "#fff4e2",
  keyIntensity: 3,
  fill: "#9cc4ef",
  env: 0.9,
  exposure: 1,
  cloud: "#ffffff",
});
const DUSK = look({
  top: "#070d24",
  mid: "#3d1f5a",
  horizon: "#ff6a3d",
  sun: "#ff7a45",
  sunDir: [-0.85, 0.03, 0.5],
  key: "#ff8a55",
  keyIntensity: 2.6,
  fill: "#3c3a8a",
  env: 0.35,
  exposure: 1.05,
  cloud: "#d58a8a",
});

const smooth = THREE.MathUtils.smootherstep;

/** Blend factors: dawn → midday between 15–42% scroll, midday → dusk between 58–88%. */
export function timeOfDay(p: number) {
  return { toMidday: smooth(p, 0.15, 0.42), toDusk: smooth(p, 0.58, 0.88) };
}

function sampleLook(p: number, out: Look) {
  const { toMidday, toDusk } = timeOfDay(p);
  const mixColor = (key: "top" | "mid" | "horizon" | "sun" | "key" | "fill" | "cloud") =>
    out[key].copy(DAWN[key]).lerp(MIDDAY[key], toMidday).lerp(DUSK[key], toDusk);
  (["top", "mid", "horizon", "sun", "key", "fill", "cloud"] as const).forEach(mixColor);
  out.sunDir.copy(DAWN.sunDir).lerp(MIDDAY.sunDir, toMidday).lerp(DUSK.sunDir, toDusk).normalize();
  const num = (key: "keyIntensity" | "env" | "exposure") =>
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(DAWN[key], MIDDAY[key], toMidday), DUSK[key], toDusk);
  out.keyIntensity = num("keyIntensity");
  out.env = num("env");
  out.exposure = num("exposure");
  return out;
}

/* ---------- camera choreography ---------- */

const CAMERA_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(30, -2.5, 30), // dawn: low front three-quarter
    new THREE.Vector3(18, -9, 42), // under the wing
    new THREE.Vector3(-4, 5, 62), // midday: full side profile
    new THREE.Vector3(-34, 16, 32), // over the tail
    new THREE.Vector3(-60, 10, 18), // dusk: rear three-quarter (port side), jet heading for the horizon
  ],
  false,
  "centripetal",
);
const TARGET_PATH = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-2, -0.5, 0),
    new THREE.Vector3(-1, -0.6, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 0),
  ],
  false,
  "centripetal",
);
/** Bank angle along the flight: slight left at dawn, level at midday, banking for home at dusk. */
const ROLL = [-0.06, -0.02, 0.05, 0.1, 0.18];

/* ---------- scene pieces ---------- */

function Sky({ state }: { state: Look }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: state.top },
          mid: { value: state.mid },
          horizon: { value: state.horizon },
          sunDir: { value: state.sunDir },
          sunColor: { value: state.sun },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top, mid, horizon, sunDir, sunColor;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 col = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, horizon, smoothstep(0.0, -0.25, h));
            col = mix(col, horizon, exp(-abs(h) * 9.0) * 0.6);
            float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            col += sunColor * (pow(s, 900.0) * 6.0 + pow(s, 24.0) * 0.55 + pow(s, 4.0) * 0.18);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [state],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} frustumCulled={false}>
      <sphereGeometry args={[900, 48, 24]} />
    </mesh>
  );
}

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function Clouds({ state, compact }: { state: Look; compact: boolean }) {
  const { group, material, texture } = useMemo(() => {
    const texture = cloudMap();
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: state.cloud,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
      fog: true,
    });
    const group = new THREE.Group();
    const rand = seeded(7);
    const count = compact ? 45 : 75;
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(material);
      const r = 40 + rand() * 280;
      const a = rand() * Math.PI * 2;
      sprite.position.set(Math.cos(a) * r, -26 - rand() * 16, Math.sin(a) * r);
      const k = 60 + rand() * 95;
      sprite.scale.set(k, k * 0.45, 1);
      group.add(sprite);
    }
    return { group, material, texture };
  }, [state, compact]);
  useFrame(() => {
    material.color.copy(state.cloud);
  });
  useEffect(
    () => () => {
      material.dispose();
      texture.dispose();
    },
    [material, texture],
  );
  return <primitive object={group} />;
}

function CityLights({ progress }: { progress: { value: number } }) {
  const { points, material, geometry, texture } = useMemo(() => {
    const rand = seeded(11);
    const positions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const r = 60 + rand() ** 0.7 * 420;
      const a = rand() * Math.PI * 2;
      positions.set([Math.cos(a) * r, -55 - rand() * 4, Math.sin(a) * r], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const texture = glowMap(64);
    const material = new THREE.PointsMaterial({
      map: texture,
      color: "#ffc27a",
      size: 3,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { points: new THREE.Points(geometry, material), material, geometry, texture };
  }, []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
      texture.dispose();
    },
    [material, geometry, texture],
  );
  useFrame(() => {
    material.opacity = smooth(progress.value, 0.7, 0.95) * 0.9;
  });
  return <primitive object={points} />;
}

function Jet({
  progress,
  compact,
  capture,
}: {
  progress: { value: number };
  compact: boolean;
  capture: boolean;
}) {
  const aircraft = useMemo(() => buildAircraft({ textureSize: compact ? 1024 : 2048 }), [compact]);
  useEffect(() => () => aircraft.dispose(), [aircraft]);

  useFrame(({ clock }, delta) => {
    const p = progress.value;
    const t = clock.elapsedTime;
    const dusk = smooth(p, 0.6, 0.9);
    const seg = Math.min(p * (ROLL.length - 1), ROLL.length - 1.0001);
    const roll = THREE.MathUtils.lerp(ROLL[Math.floor(seg)], ROLL[Math.floor(seg) + 1], seg % 1);
    const g = aircraft.group;
    g.rotation.x = roll + (capture ? 0 : Math.sin(t * 0.5) * 0.015);
    g.rotation.z = (capture ? 0 : Math.sin(t * 0.37) * 0.01) + 0.02;
    g.position.y = capture ? 0 : Math.sin(t * 0.7) * 0.25;
    aircraft.fans.forEach((fan) => (fan.rotation.x += delta * 14));
    aircraft.paint.emissiveIntensity = dusk * 1.3;
    aircraft.navLights.forEach((light) => {
      light.material.opacity = 0.35 + dusk * 0.65;
      light.scale.setScalar(1 + dusk * 1.1);
    });
    const blink = capture ? 0 : Math.sin(t * 5.5) > 0.96 ? 1 : 0;
    aircraft.strobe.material.opacity = blink * (0.3 + dusk);
  });

  return <primitive object={aircraft.group} />;
}

function Rig({
  progress,
  capture,
  compact,
}: {
  progress: { value: number };
  capture: boolean;
  compact: boolean;
}) {
  const { camera, scene, gl, size } = useThree();
  const state = useMemo(() => sampleLook(0, look({ ...SEED_LOOK })), []);
  const key = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const desired = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3() }), []);
  const current = useRef<{ target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    scene.fog = new THREE.Fog(state.horizon.clone(), 160, 820);
    return () => {
      scene.fog = null;
    };
  }, [scene, state]);

  useFrame((_, delta) => {
    const p = THREE.MathUtils.clamp(progress.value, 0, 1);
    sampleLook(p, state);
    (scene.fog as THREE.Fog | null)?.color.copy(state.horizon);
    scene.environmentIntensity = state.env;
    gl.toneMappingExposure = state.exposure;
    if (key.current) {
      key.current.color.copy(state.key);
      key.current.intensity = state.keyIntensity;
      key.current.position.copy(state.sunDir).multiplyScalar(60);
    }
    if (hemi.current) hemi.current.color.copy(state.fill);

    // Camera: follow the spline, pushed further back on portrait screens.
    const portrait = size.width / size.height < 1;
    CAMERA_PATH.getPoint(p, desired.pos).multiplyScalar(portrait ? 1.9 : 1);
    TARGET_PATH.getPoint(p, desired.target);
    const ease = capture ? 1 : 1 - Math.exp(-delta * 3.2);
    if (!current.current) current.current = { target: desired.target.clone() };
    camera.position.lerp(desired.pos, ease);
    current.current.target.lerp(desired.target, ease);
    camera.lookAt(current.current.target);

    // Frame the jet beside the copy: right two-thirds on wide screens, upper half on phones.
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = portrait ? 40 : 30;
    const w = size.width;
    const h = size.height;
    if (portrait) cam.setViewOffset(w, h, 0, h * 0.3, w, h);
    else cam.setViewOffset(w, h, -w * 0.2, 0, w, h);
  });

  return (
    <>
      <Sky state={state} />
      <Clouds state={state} compact={compact} />
      <directionalLight
        ref={key}
        castShadow={!compact}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
      />
      <hemisphereLight ref={hemi} groundColor="#2a2440" intensity={0.95} />
    </>
  );
}

const SEED_LOOK = {
  top: "#000",
  mid: "#000",
  horizon: "#000",
  sun: "#000",
  sunDir: [0, 1, 0] as [number, number, number],
  key: "#000",
  keyIntensity: 0,
  fill: "#000",
  env: 0,
  exposure: 1,
  cloud: "#fff",
};

export default function HeroScene({ progress, ...stage }: SceneProps & HeroSceneProps) {
  const capture = stage.capture !== null;
  // Smaller textures, fewer clouds and no shadows on small screens.
  const compact = useMemo(() => window.matchMedia("(max-width: 767px)").matches, []);
  // In capture mode the scroll position is replaced by the requested frame.
  const source = useMemo(
    () => (capture ? { value: stage.capture! } : progress),
    [capture, stage.capture, progress],
  );

  return (
    <SceneCanvas
      {...stage}
      shadows={!compact}
      maxDpr={compact ? 1.25 : 1.5}
      camera={{ fov: 30, near: 0.5, far: 2000, position: [30, -2.5, 30] }}
    >
      {/* Studio-style reflections without an HDRI download: a sky-tinted base plus soft light panels. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#b9c6dc"]} />
        <Lightformer intensity={6} position={[0, 14, 0]} rotation-x={Math.PI / 2} scale={[50, 24, 1]} />
        <Lightformer
          intensity={3}
          color="#ffd2ad"
          position={[24, 5, 12]}
          rotation-y={-Math.PI / 2}
          scale={[34, 6, 1]}
        />
        <Lightformer
          intensity={2.4}
          color="#bcd6f5"
          position={[-24, 3, -12]}
          rotation-y={Math.PI / 2}
          scale={[34, 8, 1]}
        />
        <Lightformer intensity={1.6} color="#ffffff" position={[0, 4, 26]} scale={[40, 3, 1]} />
        <Lightformer
          intensity={0.6}
          color="#3a3150"
          position={[0, -14, 0]}
          rotation-x={-Math.PI / 2}
          scale={[80, 80, 1]}
        />
      </Environment>
      <Rig progress={source} capture={capture} compact={compact} />
      <Jet progress={source} compact={compact} capture={capture} />
      <CityLights progress={source} />
    </SceneCanvas>
  );
}
