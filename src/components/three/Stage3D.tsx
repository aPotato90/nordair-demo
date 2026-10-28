"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  confirmCapability,
  getCapability,
  subscribeCapability,
  type Capability,
} from "@/lib/three/capability";

/** Props every lazily loaded scene receives from the stage. */
export interface SceneProps {
  /** False while the stage is off-screen or the tab is hidden: the scene should stop rendering. */
  visible: boolean;
  /** ?3d=1: skip the low-frame-rate fallback so audits measure the real 3D cost. */
  forced: boolean;
  /** Poster capture mode (?3d=1&frame=0.5): fixed progress, no idle motion, readable pixels. */
  capture: number | null;
  onReady: () => void;
  onFallback: (reason: string) => void;
}

export type StageState = "poster" | "loading" | "live" | "fallback";

const serverCapability = () => null;

export function useCapability(): Capability | null {
  // Server render and hydration use `null` (poster); the real decision happens on the client.
  return useSyncExternalStore(subscribeCapability, getCapability, serverCapability);
}

function readCaptureFrame(capability: Capability | null): number | null {
  if (!capability?.forced) return null;
  const frame = new URLSearchParams(window.location.search).get("frame");
  if (frame === null) return null;
  const value = Number(frame);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : null;
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Shows a static poster first and, only when the device and user preferences allow it,
 * lazily mounts a WebGL scene on top. The scene's canvas is decorative (aria-hidden):
 * every piece of text lives in normal HTML outside the stage.
 */
export function Stage3D<P extends object>({
  scene: Scene,
  sceneProps,
  poster,
  className = "",
  autoload = true,
  active = false,
  onStateChange,
}: {
  scene: ComponentType<SceneProps & P>;
  sceneProps: P;
  poster: ReactNode;
  className?: string;
  /** Load automatically (after idle on desktop, on first interaction on small screens). */
  autoload?: boolean;
  /** With autoload={false}: load when this becomes true (e.g. after a toggle). */
  active?: boolean;
  onStateChange?: (state: StageState) => void;
}) {
  const capability = useCapability();
  const rootRef = useRef<HTMLDivElement>(null);
  const [wanted, setWanted] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [visible, setVisible] = useState(false);
  const [sceneState, setSceneState] = useState<"loading" | "live" | "fallback">("loading");

  // Track whether the stage is (nearly) on screen and whether the tab is visible.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let intersecting = false;
    const update = () => setVisible(intersecting && document.visibilityState === "visible");
    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        if (intersecting) setNearViewport(true);
        update();
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // Decide when to start downloading the scene.
  useEffect(() => {
    if (!autoload || !capability || capability.tier === "off") return;
    if (capability.tier === "idle") {
      let idleId: number | undefined;
      const schedule = () => {
        const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
        idleId = idle(
          () => {
            confirmCapability(); // probe WebGL only now, right before loading
            setWanted(true);
          },
          { timeout: 2500 },
        ) as number;
      };
      if (document.readyState === "complete") schedule();
      else window.addEventListener("load", schedule, { once: true });
      // Safety net if "load" is delayed by a slow third-party asset.
      const timer = window.setTimeout(() => {
        confirmCapability();
        setWanted(true);
      }, 6000);
      return () => {
        window.removeEventListener("load", schedule);
        if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
        window.clearTimeout(timer);
      };
    }
    // "intent": wait for the first sign the visitor is engaging with the page.
    const events = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
    const go = () => {
      confirmCapability();
      setWanted(true);
    };
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, go));
  }, [autoload, capability]);

  // Manual stages (e.g. the "3D view" toggle) probe WebGL when they are switched on.
  useEffect(() => {
    if (!autoload && active) confirmCapability();
  }, [autoload, active]);

  const enabled = !!capability && capability.tier !== "off";
  const shouldMount =
    enabled &&
    capability.confirmed &&
    nearViewport &&
    (autoload ? wanted : active) &&
    sceneState !== "fallback";
  const state: StageState = !enabled
    ? "poster"
    : sceneState === "fallback"
      ? "fallback"
      : !shouldMount
        ? "poster"
        : sceneState;

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      data-stage={state}
      data-stage-reason={capability?.reason ?? "pending"}
    >
      {poster}
      {shouldMount && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
            sceneState === "live" ? "opacity-100" : "opacity-0"
          }`}
        >
          <SceneBoundary onError={() => setSceneState("fallback")}>
            <Scene
              {...sceneProps}
              visible={visible}
              forced={capability.forced}
              capture={readCaptureFrame(capability)}
              onReady={() => setSceneState((s) => (s === "loading" ? "live" : s))}
              onFallback={() => setSceneState("fallback")}
            />
          </SceneBoundary>
        </div>
      )}
    </div>
  );
}
