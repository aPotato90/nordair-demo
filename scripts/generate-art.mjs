// Generates the original destination illustrations used with next/image.
// Run: node scripts/generate-art.mjs  (outputs WebP files to public/images)
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const W = 1200;
const H = 800;
const OUT = new URL("../public/images/", import.meta.url);

const sky = (stops) =>
  `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</linearGradient>`;

const sun = (cx, cy, r, color, glow) => `
  <circle cx="${cx}" cy="${cy}" r="${r * 3}" fill="${glow}" opacity="0.25"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 1.8}" fill="${glow}" opacity="0.35"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;

const palm = (x, y, s, fill) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">
    <path d="M0 0 C4 -60 10 -120 26 -170 L32 -168 C18 -120 12 -60 10 0 Z"/>
    <path d="M28 -170 C0 -190 -40 -180 -62 -160 C-30 -170 0 -168 28 -164 Z"/>
    <path d="M28 -170 C50 -196 92 -192 112 -170 C80 -178 52 -172 30 -164 Z"/>
    <path d="M28 -170 C20 -210 -10 -226 -36 -224 C-6 -212 12 -196 24 -168 Z"/>
    <path d="M28 -170 C48 -214 82 -222 104 -214 C74 -208 52 -194 32 -166 Z"/>
    <path d="M28 -170 C10 -150 -6 -120 -12 -96 C2 -122 16 -146 32 -164 Z"/>
  </g>`;

const waves = (y, color, amp = 10, opacity = 1) => {
  let d = `M0 ${y}`;
  for (let x = 0; x <= W; x += 60) d += ` q15 ${-amp} 30 0 t30 0`;
  return `<path d="${d} L${W} ${H} L0 ${H} Z" fill="${color}" opacity="${opacity}"/>`;
};

const skyline = (base, color, seed) => {
  let x = 0;
  let d = `M0 ${H} L0 ${base}`;
  let i = seed;
  while (x < W) {
    i = (i * 9301 + 49297) % 233280;
    const w = 40 + (i % 70);
    const h = 40 + ((i >> 3) % 200);
    d += ` L${x} ${base - h} L${x + w} ${base - h}`;
    x += w + 6;
    d += ` L${x} ${base}`;
  }
  return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
};

const scenes = {
  phc: `
    <defs>${sky([
      [0, "#1b2452"],
      [0.45, "#8a4a73"],
      [0.75, "#ff8a4c"],
      [1, "#ffd39a"],
    ])}</defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${sun(600, 520, 70, "#ffd39a", "#ffb35c")}
    ${waves(540, "#3a2f5e", 6)}
    <rect y="560" width="${W}" height="240" fill="#2a2450"/>
    <path d="M0 600 C200 580 420 640 600 610 C800 580 1000 640 1200 600 L1200 800 L0 800 Z" fill="#ff9a52" opacity="0.18"/>
    <path d="M0 640 C160 620 380 660 520 650 L520 800 L0 800 Z" fill="#0b1b3a"/>
    <path d="M760 660 C900 640 1080 650 1200 630 L1200 800 L760 800 Z" fill="#0b1b3a"/>
    ${palm(120, 660, 1.3, "#0b1b3a")}${palm(300, 660, 1, "#0b1b3a")}${palm(980, 660, 1.2, "#0b1b3a")}${palm(1110, 650, 0.9, "#0b1b3a")}
    <path d="M560 690 l70 0 l-10 14 l-50 0 Z" fill="#0b1b3a"/>`,
  los: `
    <defs>${sky([
      [0, "#26295c"],
      [0.4, "#c0566a"],
      [0.72, "#ff8a4c"],
      [1, "#ffe0b0"],
    ])}</defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${sun(860, 420, 60, "#ffe0b0", "#ffb35c")}
    ${skyline(520, "#3b2a5e", 7)}
    ${skyline(560, "#1d2350", 3)}
    <rect y="560" width="${W}" height="240" fill="#17204a"/>
    <path d="M0 600 L1200 540" stroke="#0b1b3a" stroke-width="16"/>
    ${Array.from({ length: 13 }, (_, i) => `<path d="M${i * 100} ${600 - i * 5} L${i * 100} ${680 - i * 5}" stroke="#0b1b3a" stroke-width="10"/>`).join("")}
    <path d="M0 590 Q300 470 600 560 Q900 440 1200 530" stroke="#0b1b3a" stroke-width="5" fill="none"/>
    <path d="M300 640 C500 620 700 660 900 640" stroke="#ffb35c" stroke-width="4" opacity="0.5" fill="none"/>`,
  acc: `
    <defs>${sky([
      [0, "#3a2d6b"],
      [0.5, "#e0603f"],
      [0.8, "#ffb35c"],
      [1, "#ffe7c2"],
    ])}</defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${sun(380, 470, 80, "#fff0d0", "#ffb35c")}
    ${waves(500, "#5a3a78", 8)}
    ${waves(560, "#3c2f68", 10)}
    ${waves(620, "#ff9a52", 6, 0.25)}
    <path d="M0 680 C300 640 700 700 1200 650 L1200 800 L0 800 Z" fill="#f2c68f"/>
    <path d="M0 720 C400 690 800 740 1200 700 L1200 800 L0 800 Z" fill="#e3ad72"/>
    ${palm(900, 720, 1.5, "#1d1640")}${palm(1060, 720, 1.1, "#1d1640")}${palm(760, 730, 0.8, "#1d1640")}`,
  lhr: `
    <defs>${sky([
      [0, "#6f86b8"],
      [0.45, "#c9a6c8"],
      [0.8, "#ffd0b0"],
      [1, "#ffe9d4"],
    ])}</defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${sun(200, 380, 50, "#fff3e2", "#ffd0b0")}
    ${skyline(520, "#8a86b0", 11)}
    <path d="M760 520 L760 300 L790 270 L820 300 L820 520 Z" fill="#5d628f"/>
    <circle cx="790" cy="330" r="14" fill="#ffe9d4"/>
    ${skyline(560, "#4d5585", 5)}
    <rect y="560" width="${W}" height="240" fill="#3d4677"/>
    <path d="M0 610 L1200 610" stroke="#ffd0b0" stroke-width="3" opacity="0.4"/>
    <path d="M80 600 Q240 520 400 600" stroke="#232a55" stroke-width="12" fill="none"/>
    <path d="M60 600 L420 600" stroke="#232a55" stroke-width="14"/>
    <path d="M700 620 Q900 540 1100 620" stroke="#232a55" stroke-width="12" fill="none"/>
    <path d="M680 620 L1120 620" stroke="#232a55" stroke-width="14"/>`,
  dxb: `
    <defs>${sky([
      [0, "#120c30"],
      [0.4, "#4b2470"],
      [0.72, "#c64e5a"],
      [1, "#ff9a52"],
    ])}</defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 233) % W}" cy="${(i * 97) % 300}" r="${1 + (i % 3)}" fill="#fff" opacity="0.6"/>`).join("")}
    ${sun(260, 540, 64, "#ffc27a", "#ff7a3d")}
    <g fill="#2a1c4f">
      <rect x="760" y="250" width="34" height="340"/><path d="M777 120 L794 250 L760 250 Z"/>
      <rect x="820" y="340" width="50" height="250"/><rect x="890" y="300" width="40" height="290"/>
      <rect x="700" y="380" width="44" height="210"/><rect x="950" y="400" width="60" height="190"/>
    </g>
    <g fill="#ffc27a" opacity="0.8">${Array.from({ length: 30 }, (_, i) => `<rect x="${704 + (i % 10) * 30}" y="${400 + Math.floor(i / 10) * 40}" width="6" height="6"/>`).join("")}</g>
    <path d="M0 600 C200 520 380 560 560 590 C760 620 900 540 1200 580 L1200 800 L0 800 Z" fill="#e0703f"/>
    <path d="M0 660 C260 600 480 640 700 670 C900 700 1050 640 1200 660 L1200 800 L0 800 Z" fill="#b8503a"/>
    <path d="M0 720 C300 690 600 730 1200 700 L1200 800 L0 800 Z" fill="#7a3040"/>`,
};

await mkdir(OUT, { recursive: true });
for (const [name, body] of Object.entries(scenes)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  const file = new URL(`dest-${name}.webp`, OUT);
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(file.pathname);
  console.log("wrote", file.pathname);
}
