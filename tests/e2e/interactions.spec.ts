import { expect, test } from "@playwright/test";
import {
  expectAxeClean,
  expectNoHorizontalOverflow,
  isMobile,
  isReduced,
  skipIntro,
  trackErrors,
} from "./helpers";

const isoInDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test("demo booking flow: validate, search, choose flights, pick seats, review", async ({ page }) => {
  const errors = trackErrors(page);
  const writes: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "GET") writes.push(`${req.method()} ${req.url()}`);
  });

  await page.goto("/book?to=DXB", { waitUntil: "networkidle" });
  await expect(page.getByText("Demo only — no real booking", { exact: false }).first()).toBeVisible();
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("DXB");

  // Validation: empty dates, then same city.
  const submit = page.getByRole("button", { name: "Search demo flights" }).last();
  await submit.click();
  await expect(page.getByText("Choose a departure date.")).toBeVisible();
  await expect(page.getByLabel("Departure date")).toBeFocused();
  await expect(page.getByLabel("Departure date")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("From", { exact: true }).selectOption("DXB");
  await page.getByLabel("Departure date").fill(isoInDays(20));
  await page.getByLabel("Return date").fill(isoInDays(10));
  await submit.click();
  await expect(page.getByText("Origin and destination must be different.")).toBeVisible();
  await expect(page.getByText("Return must be on or after the departure date.")).toBeVisible();

  // Fix it: swap button flips origin and destination.
  await page.getByLabel("From", { exact: true }).selectOption("LOS");
  await page.getByRole("button", { name: "Swap origin and destination" }).click();
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("DXB");
  await expect(page.getByLabel("To", { exact: true })).toHaveValue("LOS");
  await page.getByLabel("Return date").fill(isoInDays(27));
  await page.getByLabel("Passengers").selectOption("2");
  await submit.click();

  // Results
  const heading = page.getByRole("heading", { name: "Choose your flights" });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  const continueBtn = page.getByRole("button", { name: "Continue to seats" });
  await expect(continueBtn).toBeDisabled();
  const outboundGroup = page.getByRole("group", { name: /^Outbound/ });
  const inboundGroup = page.getByRole("group", { name: /^Return/ });
  const outbound = outboundGroup.getByRole("radio");
  expect(await outbound.count()).toBeGreaterThanOrEqual(2);
  // Pointer: click a flight card.
  await outboundGroup.locator("label").first().click();
  await expect(outbound.first()).toBeChecked();
  // Keyboard: arrow keys move the selection within a radio group.
  await outbound.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(outbound.nth(1)).toBeChecked();
  await inboundGroup.locator("label").first().click();
  await expect(inboundGroup.getByRole("radio").first()).toBeChecked();
  // Sorting re-orders the cards (with a layout animation) and keeps the selection.
  await page.getByText("Earliest departure", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Earliest departure" })).toBeChecked();
  await expect(outboundGroup.getByRole("radio", { checked: true })).toHaveCount(1);
  await expect(continueBtn).toBeEnabled();
  await expectAxeClean(page);
  await continueBtn.click();

  // Seats: keyboard selection with arrow keys.
  await expect(page.getByRole("heading", { name: "Pick your seats" })).toBeFocused();
  const seatGroup = page.getByRole("group", { name: /Seat map for demo flight/ });
  const firstFocusable = seatGroup.locator('button[tabindex="0"]');
  await expect(firstFocusable).toHaveCount(1);
  await firstFocusable.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("1 of 2 seats chosen")).toBeVisible();
  // Move until another available seat is focused, then pick it.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(i % 3 === 2 ? "ArrowDown" : "ArrowRight");
    const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    if (label.endsWith("available")) break;
  }
  await page.keyboard.press("Space");
  await expect(page.getByText("2 of 2 seats chosen")).toBeVisible();
  // Taken seats cannot be chosen.
  const taken = seatGroup.locator('button[aria-disabled="true"]').first();
  await taken.click({ force: true });
  await expect(page.getByText("2 of 2 seats chosen")).toBeVisible();
  await expectAxeClean(page);
  await page.getByRole("button", { name: "Review demo trip" }).click();

  // Summary
  await expect(page.getByRole("heading", { name: "Your demo trip" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Demo complete — nothing was booked.");
  await expect(page.getByText("Demo total")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectAxeClean(page);

  await page.getByRole("button", { name: "Start a new demo search" }).click();
  await expect(page.getByRole("heading", { name: "Search demo flights" })).toBeVisible();

  expect(writes, "the demo never sends data").toEqual([]);
  expect(errors).toEqual([]);
});

test("route map: choosing a city opens its destination card", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/destinations", { waitUntil: "networkidle" });
  const map = page.getByRole("group", { name: /Route map/ });
  await map.getByRole("button", { name: /Accra/ }).click();
  const card = page.getByRole("article", { name: "Accra" });
  await expect(card).toBeVisible();
  await expect(map.getByRole("button", { name: /Accra/ })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("link", { name: "Search demo flights to Accra" })).toHaveAttribute(
    "href",
    "/book?to=ACC",
  );
  // A selected city chip and its open card must stay readable.
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await expectAxeClean(page);

  // Keyboard: focusing another city switches the card; Escape closes it.
  await map.getByRole("button", { name: /Dubai/ }).focus();
  await expect(page.getByRole("article", { name: "Dubai" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("article", { name: "Dubai" })).toHaveCount(0);
  await expect(page.getByText("Select a city on the map")).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile menu opens full screen, traps focus and closes with Escape", async ({ page }, info) => {
  test.skip(!isMobile(info), "menu button only shows on small screens");
  await page.goto("/", { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close menu" })).toBeFocused();
  await expect(dialog.getByRole("link", { name: "Fleet & cabins" })).toBeVisible();
  await expectAxeClean(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByRole("link", { name: "Fleet & cabins" }).click();
  await expect(page).toHaveURL(/\/fleet$/);
  await expect(dialog).toBeHidden();
});

test("theme toggle switches and remembers the theme", async ({ page }, info) => {
  await page.goto("/about", { waitUntil: "networkidle" });
  const html = page.locator("html");
  const initial = info.project.name.includes("dark") ? "dark" : "light";
  const next = initial === "dark" ? "light" : "dark";
  await expect(html).toHaveAttribute("data-theme", initial);
  await page.getByRole("button", { name: `Switch to ${next} theme` }).click();
  await expect(html).toHaveAttribute("data-theme", next);
  await page.reload({ waitUntil: "networkidle" });
  await expect(html).toHaveAttribute("data-theme", next);
  await expect(page.getByRole("button", { name: `Switch to ${initial} theme` })).toBeVisible();
  await expectAxeClean(page);
});

test("contact form validates and sends nothing", async ({ page }) => {
  const errors = trackErrors(page);
  const writes: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "GET") writes.push(`${req.method()} ${req.url()}`);
  });
  await page.goto("/contact", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Send (demo)" }).click();
  await expect(page.getByText("Please enter a name")).toBeVisible();
  await expect(page.getByLabel("Name")).toBeFocused();
  await page.getByLabel("Name").fill("Ada Example");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Message").fill("Hello from the test suite!");
  await page.getByRole("button", { name: "Send (demo)" }).click();
  await expect(page.getByText("Please enter a valid email format")).toBeVisible();
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Send (demo)" }).click();
  await expect(page.getByRole("status")).toContainText("your message was not sent anywhere");
  await expect(page.getByLabel("Name")).toHaveValue("");
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("motion vs reduced-motion layouts", async ({ page }, info) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const viewport = page.viewportSize()!;
  const heroHeight = await page
    .locator('section[aria-labelledby="hero-title"]')
    .evaluate((el) => el.getBoundingClientRect().height);
  const panelsPosition = await page
    .locator('section[aria-labelledby="pinned-title"] > div')
    .evaluate((el) => getComputedStyle(el).position);

  const heroFrame = page.locator("[data-hero-frame]");

  if (isReduced(info)) {
    // Static fallback: no scroll-jacked heights, no sticky pinning, no animated planes.
    expect(await heroFrame.evaluate((el) => getComputedStyle(el).position)).toBe("relative");
    expect(heroHeight).toBeLessThan(viewport.height * 2.2);
    expect(panelsPosition).toBe("static");
    // The hero story beats are plain, visible text.
    for (const beat of await page.locator("[data-beat]").all()) {
      await expect(beat).toBeVisible();
      expect(await beat.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    }
    await page.goto("/destinations", { waitUntil: "networkidle" });
    await expect(page.locator(".map-plane").first()).toBeHidden();
    // Every route is fully drawn without animation.
    const offsets = await page
      .locator(".route-line")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDashoffset));
    expect(new Set(offsets)).toEqual(new Set(["0px"]));
    // All three cabins are visible as a plain list.
    await page.goto("/fleet", { waitUntil: "networkidle" });
    for (const name of ["Economy", "Comfort+", "Nord Suite"]) {
      await page.getByRole("heading", { name, exact: true }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      expect(
        await page
          .getByRole("heading", { name, exact: true })
          .evaluate((el) => getComputedStyle(el.closest("li")!).opacity),
      ).toBe("1");
    }
  } else {
    expect(heroHeight).toBeGreaterThan(viewport.height * 2);
    expect(await heroFrame.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    expect(panelsPosition).toBe("sticky");
    // Beats start hidden and scroll into view; scroll progress drives the poster crossfade.
    await expect(page.locator("[data-beat='0']")).toBeHidden();
    const hero = page.locator('section[aria-labelledby="hero-title"]');
    const travel = heroHeight - viewport.height;
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(travel * 0.45) + 92);
    await expect(page.locator("[data-beat='0']")).toBeVisible();
    const progress = Number(await hero.evaluate((el) => el.style.getPropertyValue("--hero-p")));
    expect(progress).toBeGreaterThan(0.35);
    expect(progress).toBeLessThan(0.6);
  }
});

test.describe("page-load intro", () => {
  test("plays once per session and never for reduced motion", async ({ browser }, info) => {
    const context = await browser.newContext({
      reducedMotion: isReduced(info) ? "reduce" : "no-preference",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("/");
    const intro = page.locator(".intro");
    if (isReduced(info)) {
      await expect(intro).toBeHidden();
    } else {
      await expect(page.locator("html")).toHaveAttribute("data-intro", "play");
      await expect(intro).toBeVisible();
      await expect(intro).toBeHidden({ timeout: 4000 });
      // The page underneath was rendered all along.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.reload();
      await expect(page.locator("html")).not.toHaveAttribute("data-intro", "play");
    }
    await context.close();
  });
});

test("SEO: metadata, sitemap, robots and Open Graph image", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop-light", "server output is identical across projects");
  await page.goto("/fleet");
  await expect(page).toHaveTitle(/Fleet & cabins/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /fictional/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/fleet$/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
    "content",
    /opengraph-image/,
  );

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  for (const path of ["/destinations", "/book", "/fleet", "/about", "/contact"]) expect(xml).toContain(path);

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Sitemap:");

  const og = await request.get("/opengraph-image");
  expect(og.headers()["content-type"]).toContain("image/png");
});
