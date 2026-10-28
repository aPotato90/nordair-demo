// Reports real JS sizes from a production build (`npm run build` first).
// - Initial JS per route: every script referenced by the prerendered HTML.
// - Lazy 3D JS: chunks not referenced by any page that contain three.js / scene code.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const NEXT = ".next";
const ROUTES = ["index", "destinations", "book", "fleet", "about", "contact"];
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const sizeOf = (file) => {
  const buf = readFileSync(file);
  return { raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length, text: buf.toString("utf8") };
};

const htmlDir = join(NEXT, "server", "app");
const referenced = new Set();
const rows = [];
for (const route of ROUTES) {
  const htmlFile = join(htmlDir, `${route}.html`);
  if (!existsSync(htmlFile)) continue;
  const html = readFileSync(htmlFile, "utf8");
  const scripts = [
    ...new Set([...html.matchAll(/\/_next\/(static\/chunks\/[^"'\s)]+\.js)/g)].map((m) => m[1])),
  ];
  let raw = 0;
  let gzip = 0;
  for (const s of scripts) {
    referenced.add(s);
    const f = sizeOf(join(NEXT, s));
    raw += f.raw;
    gzip += f.gzip;
  }
  rows.push({ route: route === "index" ? "/" : `/${route}`, scripts: scripts.length, raw, gzip });
}

console.log("Initial JS per route (scripts referenced by the HTML):");
for (const r of rows)
  console.log(
    `  ${r.route.padEnd(14)} ${String(r.scripts).padStart(2)} files  ${kb(r.raw).padStart(10)} min  ${kb(r.gzip).padStart(9)} gzip`,
  );

const chunkDir = join(NEXT, "static", "chunks");
const lazy = readdirSync(chunkDir)
  .filter((f) => f.endsWith(".js") && !referenced.has(`static/chunks/${f}`))
  .map((f) => ({ file: f, ...sizeOf(join(chunkDir, f)) }));

const markers = [
  ["three.js core", (t) => t.includes("WebGLRenderer") || t.includes("WebGLProgram")],
  [
    "React Three Fiber / drei",
    (t) => t.includes("PMREMGenerator") || t.includes("useFrame") || t.includes("Lightformer"),
  ],
  ["Hero scene", (t) => t.includes("#b9c6dc")],
  ["Cabin scene", (t) => t.includes("#dcdfe6")],
  ["Route scene", (t) => t.includes("--map-grid") && t.includes("Path2D")],
];
const threeChunks = lazy.filter((c) => markers.some(([, test]) => test(c.text)));
let raw = 0;
let gzip = 0;
console.log("\nLazy 3D chunks (downloaded only when a scene mounts):");
for (const c of threeChunks.sort((a, b) => b.gzip - a.gzip)) {
  raw += c.raw;
  gzip += c.gzip;
  const tags = markers
    .filter(([, test]) => test(c.text))
    .map(([name]) => name)
    .join(", ");
  console.log(
    `  ${c.file.padEnd(24)} ${kb(c.raw).padStart(10)} min  ${kb(c.gzip).padStart(9)} gzip  (${tags})`,
  );
}
console.log(`  ${"total".padEnd(24)} ${kb(raw).padStart(10)} min  ${kb(gzip).padStart(9)} gzip`);

const posterDir = join("public", "images", "hero");
if (existsSync(posterDir)) {
  console.log("\nPoster source files (next/image re-encodes per screen width):");
  for (const f of readdirSync(posterDir))
    console.log(`  ${f.padEnd(22)} ${kb(readFileSync(join(posterDir, f)).length).padStart(9)}`);
}
console.log("\nModel files: none (the aircraft, cabin and map are generated in code at runtime).");
