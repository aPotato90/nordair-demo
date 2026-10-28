/**
 * Decides whether (and when) a page may load its WebGL scene. `decideTier` is a pure
 * function so the decision table is unit-tested; the store below gathers browser signals.
 *
 * - "off":    never download 3D; the static poster stays (reduced motion, Save-Data,
 *             no WebGL, weak device / software renderer, or ?3d=0).
 * - "intent": small screens and touch devices load 3D on the first scroll, tap or key press.
 * - "idle":   capable desktops load 3D after first paint, once the browser is idle.
 *
 * `?3d=1` forces "idle" for testing and auditing; it overrides only the device
 * heuristics, never reduced motion, Save-Data or missing WebGL.
 *
 * Creating a WebGL context costs main-thread time, so the WebGL probe is deferred: the
 * first decision uses only cheap signals (`webgl: null`), and the probe runs only when a
 * scene is actually about to load (`confirmCapability`).
 */

export type Tier = "off" | "intent" | "idle";

export type Reason =
  | "reduced-motion"
  | "disabled"
  | "no-webgl"
  | "save-data"
  | "slow-network"
  | "weak-device"
  | "software-renderer"
  | "forced"
  | "small-screen"
  | "capable";

export interface Capability {
  tier: Tier;
  reason: Reason;
  forced: boolean;
  /** True once WebGL itself has been probed; scenes only mount on a confirmed capability. */
  confirmed: boolean;
}

export interface Environment3D {
  reducedMotion: boolean;
  param: string | null;
  /** `null` until probed. */
  webgl: { supported: boolean; renderer: string } | null;
  saveData: boolean;
  effectiveType: string | null;
  deviceMemory: number | null;
  cores: number | null;
  smallScreen: boolean;
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export function decideTier(env: Environment3D): Capability {
  const confirmed = env.webgl !== null;
  const off = (reason: Reason): Capability => ({ tier: "off", reason, forced: false, confirmed: true });

  if (env.reducedMotion) return off("reduced-motion");
  if (env.param === "0") return off("disabled");
  if (env.webgl && !env.webgl.supported) return off("no-webgl");
  if (env.saveData) return off("save-data");
  if (env.effectiveType && /(^|-)2g$/.test(env.effectiveType)) return off("slow-network");
  if (env.param === "1") return { tier: "idle", reason: "forced", forced: true, confirmed };
  if ((env.deviceMemory !== null && env.deviceMemory <= 2) || (env.cores !== null && env.cores <= 2)) {
    return off("weak-device");
  }
  if (env.webgl && SOFTWARE_RENDERER.test(env.webgl.renderer)) return off("software-renderer");
  if (env.smallScreen) return { tier: "intent", reason: "small-screen", forced: false, confirmed };
  return { tier: "idle", reason: "capable", forced: false, confirmed };
}

function probeWebGL(): { supported: boolean; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { supported: false, renderer: "" };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { supported: true, renderer };
  } catch {
    return { supported: false, renderer: "" };
  }
}

type NavigatorSignals = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

function readEnvironment(): Environment3D {
  const nav = navigator as NavigatorSignals;
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    param: new URLSearchParams(window.location.search).get("3d"),
    webgl: null,
    saveData: nav.connection?.saveData === true,
    effectiveType: nav.connection?.effectiveType ?? null,
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    cores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
    smallScreen: window.matchMedia("(max-width: 767px), (pointer: coarse)").matches,
  };
}

/* ---------- tiny store (one decision per page view) ---------- */

let env: Environment3D | null = null;
let current: Capability | null = null;
const listeners = new Set<() => void>();

export function subscribeCapability(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current decision (from cheap signals until `confirmCapability` has run). */
export function getCapability(): Capability {
  if (!current) {
    env = readEnvironment();
    current = decideTier(env);
  }
  return current;
}

/** Probes WebGL (once) and finalises the decision. Call right before loading a scene. */
export function confirmCapability(): Capability {
  const capability = getCapability();
  if (capability.confirmed || !env) return capability;
  env = { ...env, webgl: probeWebGL() };
  current = decideTier(env);
  listeners.forEach((listener) => listener());
  return current;
}
