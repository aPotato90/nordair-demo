// Renders the hero poster images from the real 3D scene (capture mode) into public/images/hero.
// Usage: npm run build && npm run start -- -p 3200 &  then  BASE_URL=http://localhost:3200 node scripts/render-posters.mjs
// Uses Chromium's software WebGL (SwiftShader), so it works headless without a GPU.
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = "public/images/hero";
const HEADER = 64; // the hero frame sits below the 4rem sticky header
const FRAMES = { dawn: 0, midday: 0.5, dusk: 1 };
const SIZES = { wide: [1920, 1080], tall: [860, 1530] };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

for (const [shape, [width, height]] of Object.entries(SIZES)) {
  for (const [name, frame] of Object.entries(FRAMES)) {
    const context = await browser.newContext({
      viewport: { width, height: height + HEADER },
      deviceScaleFactor: 1,
    });
    await context.addInitScript(() => sessionStorage.setItem("nordair-intro-seen", "1"));
    const page = await context.newPage();
    await page.goto(`${BASE}/?3d=1&frame=${frame}`, { waitUntil: "load" });
    await page.waitForSelector("[data-stage='live']", { timeout: 120_000 });
    await page.waitForTimeout(800);
    const dataUrl = await page.evaluate(() =>
      document.querySelector("[data-stage] canvas").toDataURL("image/png"),
    );
    const png = Buffer.from(dataUrl.split(",")[1], "base64");
    const file = `${OUT}/${name}-${shape}.webp`;
    await sharp(png).resize(width, height, { fit: "cover" }).webp({ quality: 82 }).toFile(file);
    console.log("wrote", file);
    await context.close();
  }
}
await browser.close();
