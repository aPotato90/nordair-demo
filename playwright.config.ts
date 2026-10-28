import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3300);
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

const sizes = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;

// Software WebGL (SwiftShader) so the 3D scenes can render in headless Chromium without a GPU.
const chromium = {
  ...devices["Desktop Chrome"],
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  },
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    ...Object.entries(sizes).flatMap(([name, viewport]) =>
      (["light", "dark"] as const).map((colorScheme) => ({
        name: `${name}-${colorScheme}`,
        use: {
          ...chromium,
          viewport,
          colorScheme,
          isMobile: false,
          hasTouch: name === "mobile",
          contextOptions: { reducedMotion: "no-preference" as const },
        },
      })),
    ),
    ...(["mobile", "desktop"] as const).flatMap((name) =>
      (["light", "dark"] as const).map((colorScheme) => ({
        name: `reduced-${name}-${colorScheme}`,
        use: {
          ...chromium,
          viewport: sizes[name],
          colorScheme,
          contextOptions: { reducedMotion: "reduce" as const },
        },
      })),
    ),
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npm run start -- -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
