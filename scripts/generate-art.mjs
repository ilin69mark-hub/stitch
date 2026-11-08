#!/usr/bin/env node
/**
 * Generates local demo artwork for the storefront.
 *
 * The catalogue pictures are built from Unsplash photographs (free to use under
 * the Unsplash licence) and rendered as cross-stitch style mosaics: a limited
 * palette of threads, one X per cell, stitched onto a linen ground. These are
 * demonstration assets, not customer photographs.
 *
 * Run with: node scripts/generate-art.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "images");
const UNSPLASH = "https://images.unsplash.com";

const DESIGNS = [
  { slug: "teply-vzglyad", source: "photo-1517849845537-4d257902454a", grid: 64, k: 14 },
  { slug: "domashniy-uyut", source: "photo-1518791841217-8f162f1e1131", grid: 64, k: 16 },
  { slug: "nad-oblakami", source: "photo-1506905925346-21bda4d32df4", grid: 56, k: 16 },
  { slug: "lesnaya-tropa", source: "photo-1441974231531-c6227db76b6e", grid: 60, k: 14 },
  { slug: "podsolnuhi", source: "photo-1455659817273-f96807779a8a", grid: 56, k: 14 },
  { slug: "solnechnyy-sad", source: "photo-1490750967868-88aa4486c946", grid: 56, k: 14 },
  { slug: "gorodskoy-ritm", source: "photo-1449824913935-59a10b8d2000", grid: 60, k: 14 },
  { slug: "sobornaya-ploshchad", source: "photo-1596484552834-6a58f850e0a1", grid: 64, k: 18 },
  { slug: "ulybka", source: "photo-1494790108377-be9c29b29330", grid: 72, k: 18 },
  { slug: "v-kraskah", source: "photo-1541961017774-22349e4a1262", grid: 56, k: 18 },
  { slug: "prazdnik-krasok", source: "photo-1503454537195-1dcabb73ffb9", grid: 64, k: 18 },
  { slug: "rozovyy-vecher", source: "photo-1518895949257-7621c3c786d7", grid: 56, k: 12 },
];

const LIFESTYLE = [
  { slug: "floral-hoop", source: "photo-1771555739335-95ea325f29d2" },
  { slug: "pattern-hoop", source: "photo-1771555739342-94a08cacb227" },
  { slug: "threads", source: "photo-1605743970487-c2c58adbdfba" },
  { slug: "supplies", source: "photo-1586037606448-71374cac38f8" },
  { slug: "sewing-hands", source: "photo-1568288796918-03e7d93306bd" },
  { slug: "gift-heart", source: "photo-1771409046945-917ec1c2e25a" },
  { slug: "yarn", source: "photo-1584992236310-6edddc08acff" },
  { slug: "pattern-2", source: "photo-1771585654998-23fe43d8b4c6" },
];

const FABRIC = "#f4ecdf";
const STITCH = 16;
const BORDER = 32;

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dist2(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function quantize(pixels, k, seed = 7) {
  const random = mulberry32(seed);
  const centers = [];
  const step = Math.max(1, Math.floor(pixels.length / 3 / k));
  for (let i = 0; i < k; i++) {
    const offset = Math.min(
      pixels.length - 3,
      (i * step + Math.floor(random() * step)) * 3,
    );
    centers.push([pixels[offset], pixels[offset + 1], pixels[offset + 2]]);
  }

  const assignment = new Uint8Array(pixels.length / 3);
  for (let iteration = 0; iteration < 7; iteration++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i += 3) {
      let best = 0;
      let bestDistance = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist2([pixels[i], pixels[i + 1], pixels[i + 2]], centers[c]);
        if (d < bestDistance) {
          bestDistance = d;
          best = c;
        }
      }
      assignment[i / 3] = best;
      sums[best][0] += pixels[i];
      sums[best][1] += pixels[i + 1];
      sums[best][2] += pixels[i + 2];
      sums[best][3] += 1;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centers[c] = [
          Math.round(sums[c][0] / sums[c][3]),
          Math.round(sums[c][1] / sums[c][3]),
          Math.round(sums[c][2] / sums[c][3]),
        ];
      }
    }
  }
  return { centers, assignment };
}

const hex = (rgb) =>
  `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

function stitchSvg(centers, assignment, grid) {
  const size = grid * STITCH + BORDER * 2;
  const byColor = new Map();
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const color = centers[assignment[y * grid + x]];
      const key = hex(color);
      if (!byColor.has(key)) byColor.set(key, []);
      byColor.get(key).push([x, y]);
    }
  }

  let stitches = "";
  for (const [color, cells] of byColor) {
    let d = "";
    for (const [x, y] of cells) {
      const px = BORDER + x * STITCH;
      const py = BORDER + y * STITCH;
      d += `M${px + 3} ${py + 3}L${px + STITCH - 3} ${py + STITCH - 3}`;
      d += `M${px + STITCH - 3} ${py + 3}L${px + 3} ${py + STITCH - 3}`;
    }
    stitches += `<path d="${d}" stroke="${color}" stroke-width="9.2" stroke-linecap="round" opacity="0.96"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 0H8M0 4H8" stroke="#8f7a5f" stroke-width="0.5" opacity="0.10"/>
      <path d="M0 0V8M4 0V8" stroke="#ffffff" stroke-width="0.5" opacity="0.18"/>
    </pattern>
    <radialGradient id="light" cx="42%" cy="34%" r="78%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="62%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#4a3524" stop-opacity="0.16"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${FABRIC}"/>
  <rect width="100%" height="100%" fill="url(#weave)"/>
  ${stitches}
  <rect x="${BORDER / 2}" y="${BORDER / 2}" width="${size - BORDER}" height="${size - BORDER}" fill="none" stroke="#b7a488" stroke-width="2" stroke-dasharray="9 11" opacity="0.65"/>
  <rect width="100%" height="100%" fill="url(#light)"/>
</svg>`;
}

async function buildDesign(design) {
  const url = `${UNSPLASH}/${design.source}?w=1400&h=1400&fit=crop&q=85&fm=jpg`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${design.source}`);
  const input = Buffer.from(await response.arrayBuffer());

  const { data } = await sharp(input)
    .resize(design.grid, design.grid, { fit: "cover" })
    .modulate({ saturation: 1.12 })
    .sharpen({ sigma: 0.6 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { centers, assignment } = quantize(data, design.k, design.slug.length + 3);
  const svg = stitchSvg(centers, assignment, design.grid);

  const file = path.join(OUT, "catalog", `${design.slug}.webp`);
  await sharp(Buffer.from(svg)).webp({ quality: 86, effort: 6 }).toFile(file);
  console.log(`✓ catalog/${design.slug}.webp  palette ${centers.length}`);
}

async function buildLifestyle(item) {
  const url = `${UNSPLASH}/${item.source}?w=1600&q=85&fm=jpg`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${item.source}`);
  const input = Buffer.from(await response.arrayBuffer());
  const file = path.join(OUT, "lifestyle", `${item.slug}.webp`);
  await sharp(input).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(file);
  console.log(`✓ lifestyle/${item.slug}.webp`);
}

async function buildOg() {
  const base = await sharp(path.join(OUT, "lifestyle", "floral-hoop.webp"))
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.82, saturation: 0.95 })
    .toBuffer();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#241b12" stop-opacity="0.92"/>
        <stop offset="55%" stop-color="#241b12" stop-opacity="0.72"/>
        <stop offset="100%" stop-color="#241b12" stop-opacity="0.18"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#fade)"/>
    <g font-family="Georgia, 'Times New Roman', serif" fill="#f7f0e4">
      <text x="72" y="250" font-size="92" letter-spacing="2">Стежок</text>
      <text x="76" y="318" font-size="30" fill="#e7d6bf">вышивка по клеткам</text>
      <text x="76" y="432" font-size="40">Картина по вашему фото —</text>
      <text x="76" y="486" font-size="40">или готовый дизайн из каталога</text>
    </g>
    <rect x="72" y="540" width="360" height="2" fill="#c98a63"/>
    <text x="76" y="585" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#e7d6bf">Наборы для вышивания · от 299 ₽</text>
  </svg>`;

  await sharp(base)
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 88 })
    .toFile(path.join(ROOT, "public", "og.jpg"));
  console.log("✓ public/og.jpg");
}

async function main() {
  await mkdir(path.join(OUT, "catalog"), { recursive: true });
  await mkdir(path.join(OUT, "lifestyle"), { recursive: true });
  for (const design of DESIGNS) await buildDesign(design);
  for (const item of LIFESTYLE) await buildLifestyle(item);
  await buildOg();
  await writeFile(
    path.join(OUT, "catalog", "sources.json"),
    JSON.stringify(
      {
        note: "Demo artwork generated from Unsplash photographs (Unsplash licence). Replace with real product photography before launch.",
        designs: DESIGNS.map(({ slug, source }) => ({ slug, source: `${UNSPLASH}/${source}` })),
        lifestyle: LIFESTYLE.map(({ slug, source }) => ({ slug, source: `${UNSPLASH}/${source}` })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
