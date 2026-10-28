import { expect, test, type Page } from "@playwright/test";
import { expectAxeClean, expectNoHorizontalOverflow, isReduced, skipIntro, trackErrors } from "./helpers";

/*
 * 3D enhancement and its fallbacks. Headless Chromium renders WebGL in software
 * (SwiftShader), which the capability check treats as a weak device, so these tests use
 * ?3d=1 to force the scenes on, and browser overrides to exercise each fallback.
 */

const LIVE_TIMEOUT = 90_000;

async function expectDecorativeCanvas(page: Page) {
  const canvas = page.locator("[data-stage='live'] canvas").first();
  await expect(canvas).toHaveCount(1);
  // The canvas sits inside an aria-hidden wrapper: purely decorative.
  expect(await canvas.evaluate((el) => !!el.closest("[aria-hidden='true']"))).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test.describe("hero", () => {
  test("?3d=1 loads the 3D jet after first paint; text stays real HTML", async ({ page }, info) => {
    test.skip(isReduced(info), "reduced motion never loads 3D (covered below)");
    test.setTimeout(150_000);
    const errors = trackErrors(page);
    await page.goto("/?3d=1");
    // The poster and the copy are there before any 3D.
    await expect(page.locator("[data-hero-frame] img").first()).toHaveAttribute("alt", /Kestrel 500/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-stage]").first()).toHaveAttribute("data-stage", "live", {
      timeout: LIVE_TIMEOUT,
    });
    await expectDecorativeCanvas(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Fly into the golden hour/);
    await expect(page.getByRole("link", { name: "Search demo flights" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectAxeClean(page);
    expect(errors).toEqual([]);
  });

  test("losing the WebGL context restores the poster", async ({ page }, info) => {
    test.skip(isReduced(info), "no 3D under reduced motion");
    test.setTimeout(150_000);
    await page.goto("/?3d=1");
    const stage = page.locator("[data-stage]").first();
    await expect(stage).toHaveAttribute("data-stage", "live", { timeout: LIVE_TIMEOUT });
    await page.evaluate(() => {
      const canvas = document.querySelector("[data-stage] canvas") as HTMLCanvasElement;
      const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    });
    await expect(stage).toHaveAttribute("data-stage", "fallback");
    await expect(stage.locator("canvas")).toHaveCount(0);
    await expect(page.locator("[data-hero-frame] img").first()).toBeVisible();
  });
});

test.describe("fallbacks to the poster", () => {
  const cases: Array<{ name: string; reason: string; init?: () => void; url: string }> = [
    {
      name: "no WebGL",
      reason: "no-webgl",
      url: "/?3d=1",
      init: () => {
        const original = HTMLCanvasElement.prototype.getContext;
        // @ts-expect-error -- test override
        HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
          if (type.startsWith("webgl")) return null;
          return original.call(this, type, ...(args as []));
        };
      },
    },
    {
      name: "Save-Data",
      reason: "save-data",
      url: "/?3d=1",
      init: () => Object.defineProperty(navigator, "connection", { value: { saveData: true } }),
    },
    {
      name: "a weak device",
      reason: "weak-device",
      url: "/",
      init: () => Object.defineProperty(navigator, "deviceMemory", { value: 1 }),
    },
    { name: "a software-rendered GPU (default headless)", reason: "software-renderer", url: "/" },
    { name: "?3d=0", reason: "disabled", url: "/?3d=0" },
  ];

  for (const c of cases) {
    test(`${c.name} keeps the poster and never downloads three.js`, async ({ page }, info) => {
      const errors = trackErrors(page);
      const scripts: string[] = [];
      page.on("response", (r) => {
        if (r.url().endsWith(".js")) scripts.push(r.url());
      });
      if (c.init) await page.addInitScript(c.init);
      await page.goto(c.url, { waitUntil: "networkidle" });
      const stage = page.locator("[data-stage]").first();
      // Reduced motion always wins, whatever else is going on.
      await expect(stage).toHaveAttribute("data-stage-reason", isReduced(info) ? "reduced-motion" : c.reason);
      await expect(stage).toHaveAttribute("data-stage", "poster");
      await expect(stage.locator("canvas")).toHaveCount(0);
      await expect(page.locator("[data-hero-frame] img").first()).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // Scroll a little: intent never upgrades a poster-only device.
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(800);
      await expect(stage.locator("canvas")).toHaveCount(0);
      // three.js is never fetched on the poster path.
      const fetchedThree = await page.evaluate(async (urls) => {
        for (const url of urls) {
          const text = await (await fetch(url)).text();
          if (text.includes("WebGLRenderer")) return url;
        }
        return null;
      }, scripts);
      expect(fetchedThree).toBeNull();
      expect(errors).toEqual([]);
    });
  }

  test("reduced motion ignores ?3d=1", async ({ page }, info) => {
    test.skip(!isReduced(info), "reduced-motion projects only");
    await page.goto("/?3d=1", { waitUntil: "networkidle" });
    const stage = page.locator("[data-stage]").first();
    await expect(stage).toHaveAttribute("data-stage-reason", "reduced-motion");
    await expect(stage.locator("canvas")).toHaveCount(0);
  });
});

test.describe("fleet", () => {
  test("?3d=1 swaps the SVG cabins for the 3D cutaway; cabin text stays", async ({ page }, info) => {
    test.skip(isReduced(info), "no 3D under reduced motion");
    test.setTimeout(150_000);
    const errors = trackErrors(page);
    await page.goto("/fleet?3d=1");
    const section = page.locator("[data-cabin-3d]");
    await section.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(section).toHaveAttribute("data-cabin-3d", "live", { timeout: LIVE_TIMEOUT });
    await expectDecorativeCanvas(page);
    await expect(page.getByRole("heading", { name: "Economy", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectAxeClean(page);
    expect(errors).toEqual([]);
  });
});

test.describe("destinations", () => {
  test("3D view is opt-in, loads on demand and stays in sync with the card", async ({ page }, info) => {
    test.skip(isReduced(info), "no 3D under reduced motion");
    test.setTimeout(150_000);
    const errors = trackErrors(page);
    await page.goto("/destinations?3d=1", { waitUntil: "networkidle" });
    // Nothing 3D until asked for.
    await expect(page.locator("[data-stage]")).toHaveCount(0);
    await page.getByText("3D view", { exact: true }).click();
    await expect(page.locator("[data-stage]")).toHaveAttribute("data-stage", "live", {
      timeout: LIVE_TIMEOUT,
    });
    await expectDecorativeCanvas(page);
    const map = page.getByRole("group", { name: /Route map/ });
    await map.getByRole("button", { name: /Dubai/ }).click();
    const card = page.getByRole("article", { name: "Dubai" });
    await expect(card).toBeVisible();
    // Let the card's spring entrance finish before checking contrast.
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await expectNoHorizontalOverflow(page);
    await expectAxeClean(page);
    await page.getByText("Flat map", { exact: true }).click();
    await expect(page.locator("[data-stage]")).toHaveCount(0);
    await expect(map.getByRole("button", { name: /Accra/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the 3D toggle is not offered when 3D is unavailable", async ({ page }) => {
    await page.goto("/destinations", { waitUntil: "networkidle" });
    await expect(page.getByText("3D view", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: /Route map/ }).getByRole("button", { name: /Lagos/ }),
    ).toBeVisible();
  });
});
