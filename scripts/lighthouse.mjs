// Runs Lighthouse (mobile + desktop) against a running production server and prints median scores.
// Usage: npm run build && npm run start -- -p 3200 &  then  BASE_URL=http://localhost:3200 npm run lighthouse
// Set CHROME_PATH if Chrome/Chromium isn't on the default path. RUNS controls repeats (default 3).
// QUERY appends a query string to every URL (e.g. QUERY="?3d=1" forces the 3D scenes on);
// ROUTES limits the pages (comma-separated). LABEL names the summary file.
import { mkdir, writeFile } from "node:fs/promises";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const RUNS = Number(process.env.RUNS ?? 3);
const ROUTES = process.env.ROUTES?.split(",") ?? [
  "/",
  "/destinations",
  "/book",
  "/fleet",
  "/about",
  "/contact",
];
const QUERY = process.env.QUERY ?? "";
const LABEL = process.env.LABEL ?? "summary";
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

// Forced 3D runs need software WebGL (SwiftShader) to render without a GPU. It is NOT used for
// normal runs: it also moves page compositing onto software GL, which slows every page down.
const softwareGL = QUERY.includes("3d=1") ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [];
const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox", ...softwareGL],
});
const rows = [];

try {
  for (const formFactor of ["mobile", "desktop"]) {
    for (const route of ROUTES) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const result = await lighthouse(
          BASE + route + QUERY,
          { port: chrome.port, output: "json", logLevel: "error", onlyCategories: CATEGORIES },
          formFactor === "desktop" ? desktopConfig : undefined,
        );
        const { categories, audits } = result.lhr;
        runs.push({
          ...Object.fromEntries(CATEGORIES.map((c) => [c, Math.round(categories[c].score * 100)])),
          lcp: audits["largest-contentful-paint"].numericValue,
          tbt: audits["total-blocking-time"].numericValue,
          cls: audits["cumulative-layout-shift"].numericValue,
        });
      }
      const row = {
        formFactor,
        route,
        ...Object.fromEntries(
          [...CATEGORIES, "lcp", "tbt", "cls"].map((k) => [k, median(runs.map((r) => r[k]))]),
        ),
        perfRuns: runs.map((r) => r.performance).join("/"),
      };
      rows.push(row);
      console.log(
        `${formFactor.padEnd(8)} ${route.padEnd(14)} perf ${row.performance} (runs ${row.perfRuns}) a11y ${row.accessibility} bp ${row["best-practices"]} seo ${row.seo} | LCP ${(row.lcp / 1000).toFixed(1)}s TBT ${Math.round(row.tbt)}ms CLS ${row.cls.toFixed(3)}`,
      );
    }
  }
} finally {
  await chrome.kill();
}

const table = [
  "| Form factor | Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map(
    (r) =>
      `| ${r.formFactor} | \`${r.route}\` | ${r.performance} | ${r.accessibility} | ${r["best-practices"]} | ${r.seo} | ${(r.lcp / 1000).toFixed(1)} s | ${Math.round(r.tbt)} ms | ${r.cls.toFixed(3)} |`,
  ),
].join("\n");

await mkdir("lighthouse", { recursive: true });
await writeFile(
  `lighthouse/${LABEL}.md`,
  `Median of ${RUNS} runs per page${QUERY ? ` with ${QUERY}` : ""}.\n\n${table}\n`,
);
console.log(`\n${table}`);
