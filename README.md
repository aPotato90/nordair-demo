# Nordair — a fictional airline motion demo

> **Nordair is not a real airline.** This is a front-end portfolio demo. Flights, fares, aircraft and
> people are invented. There are no real bookings, no payments and no personal data is collected or
> sent anywhere. The name, "N" wing-mark, colours and copy are original and not affiliated with any
> real company.

A motion-heavy marketing site and demo booking flow built to show front-end animation craft:
scroll-scrubbed timelines, self-drawing SVG routes, layout transitions and an animated seat map —
all with clean static fallbacks for `prefers-reduced-motion`, full keyboard support and WCAG 2.2 AA
checks in CI.

| Dawn                                            | Midday                                              | Dusk                                            |
| ----------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| ![Hero at dawn](docs/screenshots/home-dawn.jpg) | ![Hero at midday](docs/screenshots/home-midday.jpg) | ![Hero at dusk](docs/screenshots/home-dusk.jpg) |

| Route map (dark)                                                  | Cabin sequence (dark)                                    | Demo results                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| ![Destinations route map](docs/screenshots/destinations-dark.jpg) | ![Fleet cabin sequence](docs/screenshots/fleet-dark.jpg) | ![Flight results](docs/screenshots/book-results.jpg) |

| Seat map (375px)                                              | Mobile menu                                                  | Reduced motion (375px)                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| ![Seat map on mobile](docs/screenshots/book-seats-mobile.jpg) | ![Full-screen mobile menu](docs/screenshots/menu-mobile.jpg) | ![Static hero with reduced motion](docs/screenshots/home-reduced-motion-mobile.jpg) |

## What's inside

- **Home** — a CSS-only page-load intro (logo + progress bar, once per session); a hero where a
  plane flies a curved path while the sky shifts dawn → midday → dusk as you scroll; a headline
  word-by-word reveal; scroll-pinned horizontal panels; count-up stats.
- **Destinations** — an SVG route map (stylised, hand-simplified coastlines) where flight paths
  between Port Harcourt, Lagos, Accra, London and Dubai draw themselves; hover, tap or tab to a city
  to open an animated destination card; a static list of every destination below.
- **Book (demo)** — Zod + React Hook Form search with inline errors, a fake "search", results with
  sortable layout animations, an animated seat map with roving-tabindex arrow-key navigation, and a
  boarding-pass style summary. Clearly marked "demo, no real booking".
- **Fleet & cabins** — a pinned scroll sequence where the cabin rebuilds itself from Economy (3-3)
  to Comfort+ (2-3-2) to Nord Suite (1-2-1).
- **About**, **Contact** (validates, then clears; nothing is sent), a full-screen animated mobile
  menu, an animated 404, light/dark themes with a circular view-transition reveal.
- **SEO** — per-page metadata and canonical URLs, generated Open Graph image, `sitemap.xml`,
  `robots.txt` and an SVG icon.

## Stack

Next.js 16 (App Router, Cache Components, all routes statically prerendered) · TypeScript ·
Tailwind CSS 4 · Motion (`motion/react`) · GSAP + ScrollTrigger · Zod + React Hook Form ·
Vitest · Playwright + axe-core · Lighthouse.

Three.js was deliberately **not** added: nothing here needed real 3D, and it would have been the
single heaviest dependency.

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000

npm run lint           # ESLint (next/core-web-vitals + TypeScript)
npm run format:check   # Prettier (+ Tailwind class sorting)
npm run typecheck      # next typegen && tsc --noEmit
npm test               # Vitest unit tests (search, pricing, seats)
npm run build
npm run test:e2e       # Playwright + axe-core (starts `next start` on :3300)

# Lighthouse (median of 3 runs, mobile + desktop) against a running production server:
npm run start -- -p 3200 &
BASE_URL=http://localhost:3200 npm run lighthouse   # set CHROME_PATH if needed
```

`npm run generate:art` regenerates the destination illustrations.
`BASE_URL=http://localhost:3200 node scripts/screenshots.mjs` regenerates the screenshots above
from a running server.

## How it was built

**Content as data.** Every user-facing string lives in [`src/content/site.ts`](src/content/site.ts)
and destination data in [`src/content/airports.ts`](src/content/airports.ts). Components only render
it.

**Three animation tools, each with one job.**

- **CSS** for anything that must never wait for JavaScript: the page-load intro, the headline reveal,
  route drawing and decorative loops. The intro is decided by a tiny inline `<head>` script (which
  also applies the saved theme before first paint, as recommended in the bundled Next.js
  "preventing flash before hydration" guide).
- **GSAP ScrollTrigger** for scroll-scrubbed timelines (hero flight, pinned panels, cabin
  sequence). GSAP is dynamically imported by a small `useGsap` hook, so it stays out of the initial
  bundle, and every timeline runs inside `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`
  so it is fully reverted for reduced motion. Pinning uses CSS `position: sticky` rather than GSAP
  pin-spacers, so layout is decided by CSS before any script runs — no layout shift.
- **Motion** for UI state: menu, cards, step transitions, sort re-ordering, seat selection,
  segmented controls. It is loaded through `LazyMotion` with async features and wrapped in
  `MotionConfig reducedMotion="user"`; components that animate non-transform properties (clip-path,
  slides) also branch on `useReducedMotion()`.

**Reduced motion is a layout, not just "no animation".** A Tailwind custom variant,
`motion-ok:`, maps to `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`.
Tall scroll-scrubbed sections, sticky pinning and "hidden until revealed" states only exist inside
that variant, so reduced-motion and no-JS visitors get a normal, static page: the plane waits
mid-sky, every route is already drawn and the cabins become a list. All content is real text in the
DOM; animation only changes how it arrives.

**Deterministic fake data.** [`src/lib/search.ts`](src/lib/search.ts) validates searches (Zod) and
generates flights with a seeded PRNG, real great-circle distances and fixed UTC offsets for local
arrival times; connections route through the Lagos hub.
[`src/lib/pricing.ts`](src/lib/pricing.ts) is a transparent fare formula (distance × cabin ×
advance purchase × weekday × time-of-day ± 5%). Both are unit-tested, as is the seat-map generator.

**Original artwork.** The logo, plane, cabins, map and destination illustrations are hand-written
SVG; the destination "postcards" are rendered to small WebP files by
[`scripts/generate-art.mjs`](scripts/generate-art.mjs) and served through `next/image`. Fonts
(Bricolage Grotesque + Inter) are self-hosted via `next/font`.

## Quality checks

The Playwright suite runs every page and the key flows at **375, 768 and 1280px in light and dark**,
plus **reduced-motion** projects at 375 and 1280px (light and dark). Each page test scrolls the
whole page, then asserts: no horizontal overflow, no console errors, and zero axe-core violations
for `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`. Interaction tests cover the full booking
flow (validation, keyboard seat selection, no non-GET requests), the route map, the mobile menu
(focus and Escape), theme persistence, the contact form, the intro, reduced-motion layouts and SEO
files.

Lighthouse results (median of 3 runs, local production build) are in the pull request description.

## Project structure

```
src/
  app/                 routes, metadata files (sitemap, robots, OG image, icon), globals.css
  components/          brand, layout (header, menu, theme), home, destinations, book, fleet, contact, ui
  content/             site.ts (all copy), airports.ts (destination data)
  lib/                 search, pricing, seats, geo, map geometry, metadata, useGsap
tests/unit/            Vitest
tests/e2e/             Playwright + axe-core
scripts/               art generation, screenshots, Lighthouse
```
