import { expect, test } from "@playwright/test";
import {
  ROUTES,
  expectAxeClean,
  expectNoHorizontalOverflow,
  scrollThrough,
  skipIntro,
  trackErrors,
} from "./helpers";

for (const route of ROUTES) {
  test(`${route} renders, is accessible and has no overflow or console errors`, async ({ page }) => {
    const errors = trackErrors(page);
    await skipIntro(page);
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    // Demo labelling is always present.
    await expect(page.getByText("Nordair is a fictional airline", { exact: false }).first()).toBeVisible();
    await expect(page.locator("footer")).toContainText("This is a demo");

    await scrollThrough(page);
    await expectNoHorizontalOverflow(page);
    await expectAxeClean(page);
    expect(errors).toEqual([]);
  });
}

test("unknown routes show the animated 404 page", async ({ page }) => {
  const errors = trackErrors(page);
  await skipIntro(page);
  const response = await page.goto("/this-flight-does-not-exist", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This flight drifted off the map");
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAxeClean(page);
  // The browser logs the document's own 404 response; anything else is a real error.
  expect(errors.filter((e) => !e.includes("status of 404"))).toEqual([]);
});
