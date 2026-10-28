"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AirportCode } from "@/content/airports";
import { cityPoints, graticule, landPaths, MAP_SIZE, routePaths, seaPaths } from "@/lib/map-geometry";
import { glowMap } from "./aircraft/livery";
import { SceneCanvas } from "./SceneCanvas";
import type { SceneProps } from "./Stage3D";

export interface RouteSceneProps {
  active: AirportCode | null;
}

/** Map units (840 × 660 SVG space) → world units on the XZ plane. */
const SCALE = 1 / 100;
const toWorld = (x: number, y: number) =>
  new THREE.Vector3(x * SCALE - (MAP_SIZE.width * SCALE) / 2, 0, y * SCALE - (MAP_SIZE.height * SCALE) / 2);

function cssColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Paints the same stylised map as the SVG (land, seas, graticule) using the current theme colours. */
function paintMap(canvas: HTMLCanvasElement) {
  const k = canvas.width / MAP_SIZE.width;
  const g = canvas.getContext("2d")!;
  g.setTransform(k, 0, 0, k, 0, 0);
  g.fillStyle = cssColor("--map-sea", "#e3ebf6");
  g.fillRect(0, 0, MAP_SIZE.width, MAP_SIZE.height);
  g.strokeStyle = cssColor("--map-grid", "#c8d4e6");
  g.lineWidth = 1;
  for (const x of graticule.meridians) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, MAP_SIZE.height);
    g.stroke();
  }
  for (const y of graticule.parallels) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(MAP_SIZE.width, y);
    g.stroke();
  }
  g.fillStyle = cssColor("--map-land", "#f6eddd");
  g.strokeStyle = cssColor("--map-coast", "#cdbb9c");
  g.lineWidth = 1.4;
  for (const d of landPaths) {
    const path = new Path2D(d);
    g.fill(path);
    g.stroke(path);
  }
  g.fillStyle = cssColor("--map-sea", "#e3ebf6");
  for (const d of seaPaths) {
    const path = new Path2D(d);
    g.fill(path);
    g.stroke(path);
  }
}

/** Sea-coloured background that follows the light/dark theme, so the flat poster never shows through. */
function ThemeBackground() {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const apply = () => {
      scene.background = new THREE.Color(cssColor("--map-sea", "#e3ebf6"));
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
      scene.background = null;
    };
  }, [scene]);
  return null;
}

function MapPlane() {
  const { texture, canvas } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1680;
    canvas.height = 1320;
    paintMap(canvas);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return { texture, canvas };
  }, []);

  // Repaint when the visitor switches between light and dark themes.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      paintMap(canvas);
      texture.needsUpdate = true;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
      texture.dispose();
    };
  }, [canvas, texture]);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[MAP_SIZE.width * SCALE, MAP_SIZE.height * SCALE]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
}

interface Arc {
  id: string;
  from: AirportCode;
  to: AirportCode;
  curve: THREE.QuadraticBezierCurve3;
  geometry: THREE.TubeGeometry;
  material: THREE.MeshStandardMaterial;
  indexCount: number;
}

function Arcs({ active, glow }: { active: AirportCode | null; glow: THREE.Texture }) {
  const arcs = useMemo<Arc[]>(() => {
    const color = new THREE.Color(cssColor("--map-route", "#d9561f"));
    return routePaths.map((route) => {
      const a = cityPoints.find((c) => c.code === route.from)!;
      const b = cityPoints.find((c) => c.code === route.to)!;
      const start = toWorld(a.x, a.y);
      const end = toWorld(b.x, b.y);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.y = Math.max(0.35, start.distanceTo(end) * 0.32);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geometry = new THREE.TubeGeometry(curve, 80, 0.018, 8, false);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        transparent: true,
      });
      return { ...route, curve, geometry, material, indexCount: geometry.index!.count };
    });
  }, []);
  useEffect(
    () => () =>
      arcs.forEach((arc) => {
        arc.geometry.dispose();
        arc.material.dispose();
      }),
    [arcs],
  );

  const planes = useRef<Array<THREE.Sprite | null>>([]);
  const start = useRef<number | null>(null);

  useFrame(({ clock }) => {
    start.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    arcs.forEach((arc, i) => {
      // Draw each path in turn, then keep a small plane flying along it.
      const drawn = THREE.MathUtils.clamp((t - 0.2 - i * 0.25) / 1.4, 0, 1);
      const steps = Math.floor((arc.indexCount / 6) * drawn) * 6;
      arc.geometry.setDrawRange(0, steps);
      const lit = !active || arc.from === active || arc.to === active;
      arc.material.opacity = THREE.MathUtils.lerp(arc.material.opacity, lit ? 1 : 0.18, 0.12);
      const plane = planes.current[i];
      if (plane) {
        const u = (((t * 0.12 + i * 0.37) % 1) + 1) % 1;
        arc.curve.getPoint(i % 2 ? 1 - u : u, plane.position);
        (plane.material as THREE.SpriteMaterial).opacity =
          drawn >= 1 ? Math.sin(u * Math.PI) * (lit ? 1 : 0.2) : 0;
      }
    });
  });

  return (
    <>
      {arcs.map((arc, i) => (
        <group key={arc.id}>
          <mesh geometry={arc.geometry} material={arc.material} />
          <sprite
            ref={(el) => {
              planes.current[i] = el;
            }}
            scale={0.16}
          >
            <spriteMaterial
              map={glow}
              color="#ffffff"
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </group>
      ))}
    </>
  );
}

function Pins({ active, glow }: { active: AirportCode | null; glow: THREE.Texture }) {
  const groups = useRef<Array<THREE.Group | null>>([]);
  const route = useMemo(() => new THREE.Color(cssColor("--map-route", "#d9561f")), []);
  useFrame(({ clock }) => {
    cityPoints.forEach((city, i) => {
      const g = groups.current[i];
      if (!g) return;
      const on = city.code === active;
      const target = on ? 1.6 : 1;
      g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, 0.15));
      const halo = g.children[2] as THREE.Sprite;
      halo.scale.setScalar(0.35 + Math.sin(clock.elapsedTime * 2 + i) * 0.06 + (on ? 0.25 : 0));
    });
  });
  return (
    <>
      {cityPoints.map((city, i) => {
        const p = toWorld(city.x, city.y);
        return (
          <group
            key={city.code}
            position={p}
            ref={(el) => {
              groups.current[i] = el;
            }}
          >
            <mesh position-y={0.09} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
              <meshStandardMaterial color="#0b1b3a" />
            </mesh>
            <mesh position-y={0.2}>
              <sphereGeometry args={[0.045, 20, 12]} />
              <meshStandardMaterial color={route} emissive={route} emissiveIntensity={0.8} />
            </mesh>
            <sprite position-y={0.2}>
              <spriteMaterial
                map={glow}
                color={route}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          </group>
        );
      })}
    </>
  );
}

function Orbit({ active, capture }: { active: AirportCode | null; capture: boolean }) {
  const look = useMemo(() => new THREE.Vector3(0, 0, 0.4), []);
  const desiredLook = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }, delta) => {
    const t = capture ? 0 : clock.elapsedTime;
    const city = active ? cityPoints.find((c) => c.code === active) : null;
    if (city) desiredLook.copy(toWorld(city.x, city.y)).multiplyScalar(0.45).setY(0);
    else desiredLook.set(0, 0, 0.4);
    const ease = capture ? 1 : 1 - Math.exp(-delta * 2.5);
    look.lerp(desiredLook, ease);
    const azimuth = Math.sin(t * 0.12) * 0.22;
    desired.set(Math.sin(azimuth) * 5.6, 4.9, Math.cos(azimuth) * 5.6).add(look);
    camera.position.lerp(desired, ease);
    camera.lookAt(look);
  });
  return null;
}

export default function RouteScene({ active, ...stage }: SceneProps & RouteSceneProps) {
  const glow = useMemo(() => glowMap(64), []);
  useEffect(() => () => glow.dispose(), [glow]);
  return (
    <SceneCanvas {...stage} shadows camera={{ fov: 38, near: 0.1, far: 100, position: [0, 5.4, 6.4] }}>
      <hemisphereLight intensity={1.1} groundColor="#7f8aa6" />
      <directionalLight
        position={[3, 8, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <ThemeBackground />
      <MapPlane />
      <Arcs active={active} glow={glow} />
      <Pins active={active} glow={glow} />
      <Orbit active={active} capture={stage.capture !== null} />
    </SceneCanvas>
  );
}
