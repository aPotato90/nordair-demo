import { describe, expect, it } from "vitest";
import { decideTier, type Environment3D } from "@/lib/three/capability";

const capableDesktop: Environment3D = {
  reducedMotion: false,
  param: null,
  webgl: { supported: true, renderer: "ANGLE (Apple, M2, OpenGL 4.1)" },
  saveData: false,
  effectiveType: "4g",
  deviceMemory: 8,
  cores: 8,
  smallScreen: false,
};

describe("decideTier", () => {
  it("loads 3D after idle on a capable desktop", () => {
    expect(decideTier(capableDesktop)).toEqual({
      tier: "idle",
      reason: "capable",
      forced: false,
      confirmed: true,
    });
  });

  it("waits for intent on small or touch screens", () => {
    expect(decideTier({ ...capableDesktop, smallScreen: true })).toMatchObject({
      tier: "intent",
      reason: "small-screen",
    });
  });

  it.each([
    ["reduced-motion", { reducedMotion: true }],
    ["disabled", { param: "0" }],
    ["no-webgl", { webgl: { supported: false, renderer: "" } }],
    ["save-data", { saveData: true }],
    ["slow-network", { effectiveType: "slow-2g" }],
    ["weak-device", { deviceMemory: 2 }],
    ["weak-device", { cores: 2 }],
    [
      "software-renderer",
      { webgl: { supported: true, renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))" } },
    ],
  ] as const)("falls back to the poster for %s", (reason, override) => {
    expect(decideTier({ ...capableDesktop, ...override })).toEqual({
      tier: "off",
      reason,
      forced: false,
      confirmed: true,
    });
  });

  it("?3d=1 overrides device heuristics and small-screen gating", () => {
    for (const override of [
      { deviceMemory: 1 },
      { webgl: { supported: true, renderer: "SwiftShader" } },
      { smallScreen: true },
    ]) {
      expect(decideTier({ ...capableDesktop, ...override, param: "1" })).toEqual({
        tier: "idle",
        reason: "forced",
        forced: true,
        confirmed: true,
      });
    }
  });

  it("?3d=1 never overrides reduced motion, Save-Data or missing WebGL", () => {
    expect(decideTier({ ...capableDesktop, param: "1", reducedMotion: true }).tier).toBe("off");
    expect(decideTier({ ...capableDesktop, param: "1", saveData: true }).tier).toBe("off");
    expect(
      decideTier({ ...capableDesktop, param: "1", webgl: { supported: false, renderer: "" } }).tier,
    ).toBe("off");
  });

  describe("before WebGL is probed (webgl: null)", () => {
    const unprobed = { ...capableDesktop, webgl: null };

    it("gives a provisional, unconfirmed decision from cheap signals", () => {
      expect(decideTier(unprobed)).toEqual({
        tier: "idle",
        reason: "capable",
        forced: false,
        confirmed: false,
      });
      expect(decideTier({ ...unprobed, smallScreen: true })).toMatchObject({
        tier: "intent",
        confirmed: false,
      });
      expect(decideTier({ ...unprobed, param: "1" })).toMatchObject({
        tier: "idle",
        forced: true,
        confirmed: false,
      });
    });

    it("already rules out devices that never need the probe", () => {
      for (const override of [
        { reducedMotion: true },
        { saveData: true },
        { deviceMemory: 1 },
        { param: "0" },
      ]) {
        expect(decideTier({ ...unprobed, ...override })).toMatchObject({ tier: "off", confirmed: true });
      }
    });
  });
});
