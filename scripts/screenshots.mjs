// Captures the README screenshots from a running server.
// Usage: BASE_URL=http://localhost:3200 node scripts/screenshots.mjs
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = "docs/screenshots";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(
  name,
  { width, height, colorScheme = "light", reducedMotion = "no-preference", path, act },
) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme,
    reducedMotion,
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => sessionStorage.setItem("nordair-intro-seen", "1"));
  const page = await context.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  if (act) await act(page);
  const png = await page.screenshot();
  await sharp(png).jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/${name}.jpg`);
  await context.close();
  console.log("saved", name);
}

const scrollTo = (fraction) => async (page) => {
  await page.evaluate((f) => {
    const hero = document.querySelector('section[aria-labelledby="hero-title"]');
    window.scrollTo(0, hero.offsetTop + (hero.offsetHeight - window.innerHeight) * f);
  }, fraction);
  await page.waitForTimeout(1500);
};

const futureDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

await shot("home-dawn", { width: 1280, height: 800, path: "/" });
await shot("home-midday", { width: 1280, height: 800, path: "/", act: scrollTo(0.3) });
await shot("home-dusk", { width: 1280, height: 800, path: "/", act: scrollTo(0.75) });
await shot("destinations-dark", {
  width: 1280,
  height: 800,
  colorScheme: "dark",
  path: "/destinations",
  act: async (page) => {
    await page.evaluate(() => window.scrollTo(0, 260));
    await page.getByRole("button", { name: /Dubai/ }).click();
    await page.waitForTimeout(1200);
  },
});
await shot("fleet-dark", {
  width: 1280,
  height: 800,
  colorScheme: "dark",
  path: "/fleet",
  act: async (page) => {
    await page.evaluate(() => {
      const s = document.querySelector('section[aria-label="Three cabins, one scroll"]');
      window.scrollTo(0, s.offsetTop + (s.offsetHeight - window.innerHeight) * 0.92);
    });
    await page.waitForTimeout(1500);
  },
});
const book = async (page, toSeats) => {
  await page.getByLabel("Departure date").fill(futureDate(30));
  await page.getByLabel("Return date").fill(futureDate(37));
  await page.getByLabel("Passengers").selectOption("2");
  await page.getByRole("button", { name: "Search demo flights" }).last().click();
  await page.getByRole("heading", { name: "Choose your flights" }).waitFor();
  await page
    .getByRole("group", { name: /^Outbound/ })
    .locator("label")
    .first()
    .click();
  await page
    .getByRole("group", { name: /^Return/ })
    .locator("label")
    .nth(1)
    .click();
  await page.waitForTimeout(900);
  if (!toSeats) return;
  await page.getByRole("button", { name: "Continue to seats" }).click();
  await page.getByRole("heading", { name: "Pick your seats" }).waitFor();
  await page.waitForTimeout(1200);
  const free = page.locator('button[aria-label$="available"]');
  await free.nth(2).click();
  await free.nth(3).click();
  await page.evaluate(() => window.scrollBy(0, 360));
  await page.waitForTimeout(800);
};
await shot("book-results", { width: 1280, height: 800, path: "/book?to=LHR", act: (p) => book(p, false) });
await shot("book-seats-mobile", { width: 375, height: 812, path: "/book?to=ACC", act: (p) => book(p, true) });
await shot("menu-mobile", {
  width: 375,
  height: 812,
  colorScheme: "dark",
  path: "/",
  act: async (page) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(1200);
  },
});
await shot("home-reduced-motion-mobile", { width: 375, height: 812, reducedMotion: "reduce", path: "/" });

await browser.close();
