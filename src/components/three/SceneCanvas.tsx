"use client";

import { Canvas, useFrame, type CanvasProps } from "@react-three/fiber";
import { useRef, useState, type ReactNode } from "react";
import type { SceneProps } from "./Stage3D";

/** Calls onReady once a few frames have actually been drawn (so the fade-in never shows a blank canvas). */
function ReadySignal({ frames, onReady }: { frames: number; onReady: () => void }) {
  const count = useRef(0);
  useFrame(() => {
    count.current += 1;
    if (count.current === frames) onReady();
  });
  return null;
}

/**
 * Watches real frame times. Below ~24 fps for two consecutive 2-second windows it first
 * drops the pixel ratio, then gives up and asks the stage to restore the poster.
 */
function FrameGuard({ onDegrade, onFail }: { onDegrade: () => boolean; onFail: () => void }) {
  const stats = useRef({ time: 0, frames: 0, strikes: 0, warmup: 1.5 });
  useFrame((_, delta) => {
    const w = stats.current;
    if (w.warmup > 0) {
      w.warmup -= delta;
      return;
    }
    w.time += Math.min(delta, 0.5);
    w.frames += 1;
    if (w.time < 2) return;
    const fps = w.frames / w.time;
    w.time = 0;
    w.frames = 0;
    if (fps >= 24) {
      w.strikes = 0;
      return;
    }
    w.strikes += 1;
    if (w.strikes >= 2) {
      w.strikes = 0;
      w.warmup = 1;
      if (!onDegrade()) onFail();
    }
  });
  return null;
}

export function SceneCanvas({
  children,
  visible,
  forced,
  capture,
  onReady,
  onFallback,
  camera,
  shadows = false,
  maxDpr = 1.5,
}: Omit<SceneProps, "onReady"> & {
  onReady: () => void;
  children: ReactNode;
  camera?: CanvasProps["camera"];
  shadows?: boolean;
  maxDpr?: number;
}) {
  const [dpr, setDpr] = useState(capture !== null ? 1 : maxDpr);

  return (
    <Canvas
      frameloop={visible || capture !== null ? "always" : "never"}
      dpr={dpr}
      shadows={shadows}
      camera={camera}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: capture !== null }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          onFallback("context-lost");
        });
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ReadySignal frames={capture !== null ? 12 : 3} onReady={onReady} />
      {!forced && capture === null && (
        <FrameGuard
          onDegrade={() => {
            if (dpr <= 1) return false;
            setDpr(1);
            return true;
          }}
          onFail={() => onFallback("low-fps")}
        />
      )}
      {children}
    </Canvas>
  );
}
