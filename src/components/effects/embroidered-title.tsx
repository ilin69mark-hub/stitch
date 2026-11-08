"use client";

import {
  useEffect,
  useId,
  useRef,
  type ElementType,
  type ReactNode,
} from "react";

import "./embroidered-title.css";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Тег контейнера. По умолчанию — h1. */
  as?: ElementType;
};

type Glyph = {
  char: string;
  x: number;
  baseline: number;
  size: number;
  family: string;
  style: string;
  weight: string;
};

type Box = {
  width: number;
  height: number;
  pad: number;
  cell: number;
  cols: number;
  rows: number;
  /** Разрешение маски (не зависит от DPR экрана). */
  scale: number;
};

type Stitch = { x: number; y: number; w: number; h: number; color: string };

/**
 * Розовый, коралловый, персиковый, жёлтый, бирюзовый, голубой, лавандовый.
 * Оттенки слегка приглушены — выглядят как окрашенная нить, а не как
 * чистый экранный цвет.
 */
const THREADS = [
  "#ec8098",
  "#ee8263",
  "#f5a878",
  "#eec25f",
  "#46b0a9",
  "#6ba4d9",
  "#b3a0de",
];

const READY_CLASS = "embroidered-title--ready";
/** Маска строится с тройным supersampling относительно CSS-пикселей. */
const MASK_SCALE = 3;
const SAMPLES = 10;
/** Минимальная доля клетки внутри маски, чтобы ставить полноценный крестик. */
const COVERAGE_MIN = 0.12;
/** Мягкий порог для достройки пропусков внутри штриха. */
const SOFT_COVERAGE = 0.08;
/** Сколько соседей должно быть вышито, чтобы достроить пропущенную клетку. */
const GAP_FILLED_BY = 2;

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

const hash = (value: number) => {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const shadeHex = (hex: string, k: number) => {
  const value = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((value >> 16) & 255) * k), 0, 255);
  const g = clamp(Math.round(((value >> 8) & 255) * k), 0, 255);
  const b = clamp(Math.round((value & 255) * k), 0, 255);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

/**
 * Плавное поле цвета: соседние клетки чаще одного оттенка, переходы идут
 * последовательно по палитре — получаются цельные пятна, а не мозаика.
 */
const threadColorIndex = (col: number, row: number) => {
  const x = col * 0.16;
  const y = row * 0.2;
  const value =
    0.5 +
    0.32 * Math.sin(x * 0.85 + y * 0.3 + 1.1) +
    0.26 * Math.sin(y * 1.05 - x * 0.4 + 2.2);

  return Math.floor(clamp(value, 0, 0.999) * THREADS.length);
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const num = (value: number) => Math.round(value * 100) / 100;

const parseLineHeight = (value: string, fontSize: number) => {
  if (!value || value === "normal") return 0;
  if (value.endsWith("px")) return parseFloat(value) || 0;

  const parsed = parseFloat(value);

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  // Безразмерное значение (line-height: 0.92) множится на размер шрифта.
  return parsed < 10 ? parsed * fontSize : parsed;
};

/**
 * Маска букв: каждый символ рисуется в точке, где он стоит в DOM, поэтому
 * формы и пропорции оригинального текста сохраняются точно.
 */
const buildMask = (host: HTMLElement, textRoot: HTMLElement, box: Box) => {
  const rect = host.getBoundingClientRect();
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(box.width * box.scale));
  canvas.height = Math.max(1, Math.round(box.height * box.scale));

  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) return null;

  ctx.setTransform(box.scale, 0, 0, box.scale, 0, 0);
  ctx.fillStyle = "#ffffff";

  const hostStyle = getComputedStyle(textRoot.parentElement ?? textRoot);
  const fontSize = parseFloat(hostStyle.fontSize) || 16;
  const lineHeight = parseLineHeight(hostStyle.lineHeight, fontSize);
  const walker = document.createTreeWalker(textRoot, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const fonts = new Map<Element, Glyph>();
  const glyphs: Glyph[] = [];

  let node = walker.nextNode();

  while (node) {
    const value = node.nodeValue;
    const parent = node.parentElement;

    if (value && parent) {
      let font = fonts.get(parent);

      if (!font) {
        const style = getComputedStyle(parent);
        const size = parseFloat(style.fontSize) || fontSize;

        font = {
          char: "",
          x: 0,
          baseline: 0,
          size,
          family: style.fontFamily,
          style: style.fontStyle,
          weight: style.fontWeight,
        };

        fonts.set(parent, font);
      }

      ctx.font = `${font.style} ${font.weight} ${font.size}px ${font.family}`;

      for (let i = 0; i < value.length; i += 1) {
        const char = value[i];

        if (/\s/.test(char)) continue;

        range.setStart(node, i);
        range.setEnd(node, i + 1);

        const glyphRect = range.getBoundingClientRect();

        if (!glyphRect || glyphRect.width < 0.5 || glyphRect.height < 0.5) {
          continue;
        }

        const metrics = ctx.measureText(char);
        const ascent =
          metrics.fontBoundingBoxAscent ??
          metrics.actualBoundingBoxAscent ??
          font.size * 0.8;
        const descent =
          metrics.fontBoundingBoxDescent ??
          metrics.actualBoundingBoxDescent ??
          font.size * 0.25;
        const content = ascent + descent;
        const top = glyphRect.top - rect.top + box.pad;
        const left = glyphRect.left - rect.left + box.pad;
        // Rect может быть строковым боксом (line-height) или контент-боксом
        // шрифта (ascent + descent) — выбираем интерпретацию по высоте.
        const byLine = Math.abs(glyphRect.height - lineHeight);
        const byContent = Math.abs(glyphRect.height - content);
        const offset =
          lineHeight > 0 && byLine < byContent
            ? (lineHeight - content) / 2
            : Math.max(0, (glyphRect.height - content) / 2);
        const baseline = top + offset + ascent;

        ctx.fillText(char, left, baseline);

        glyphs.push({
          char,
          x: left,
          baseline,
          size: font.size,
          family: font.family,
          style: font.style,
          weight: font.weight,
        });
      }
    }

    node = walker.nextNode();
  }

  return { canvas, ctx, glyphs };
};

/**
 * Сетка клеток → стежки. Каждая ставшаяся клетка даёт полноценный
 * регулярный крестик одинакового размера: никаких индивидуальных
 * подгонок под контур. Границы буквы задаются clipping'ом в buildSvg.
 */
const collectStitches = (
  ctx: CanvasRenderingContext2D,
  box: Box,
): Stitch[] => {
  const image = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = image.data;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const step = box.cell / SAMPLES;
  const total = box.cols * box.rows;
  const coverage = new Uint8Array(total);
  const filled = new Uint8Array(total);
  const stitches: Stitch[] = [];

  for (let row = 0; row < box.rows; row += 1) {
    for (let col = 0; col < box.cols; col += 1) {
      let count = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        const py = Math.round((row * box.cell + (sy + 0.5) * step) * box.scale);

        if (py < 0 || py >= height) continue;

        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = Math.round((col * box.cell + (sx + 0.5) * step) * box.scale);

          if (px < 0 || px >= width) continue;
          if (data[(py * width + px) * 4 + 3] <= 110) continue;

          count += 1;
        }
      }

      coverage[row * box.cols + col] = Math.min(255, count);

      // Достаточно, чтобы клетка считалась частью буквы. Всё остальное —
      // контур буквы — обрезается clipping'ом, а не геометрией стежка.
      if (count >= SAMPLES * SAMPLES * COVERAGE_MIN) {
        filled[row * box.cols + col] = 1;
      }
    }
  }

  // Достройка пропусков: тонкие диагонали («ж») и кривые («с») иначе
  // оставляют внутри штриха пустые клетки канвы.
  const seeds = Uint8Array.from(filled);

  for (let row = 0; row < box.rows; row += 1) {
    for (let col = 0; col < box.cols; col += 1) {
      const index = row * box.cols + col;

      if (filled[index]) continue;
      if (coverage[index] < SOFT_COVERAGE * SAMPLES * SAMPLES) continue;

      let neighbors = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;

          const nRow = row + dy;
          const nCol = col + dx;

          if (nRow < 0 || nCol < 0 || nRow >= box.rows || nCol >= box.cols) {
            continue;
          }

          if (seeds[nRow * box.cols + nCol]) neighbors += 1;
        }
      }

      if (neighbors >= GAP_FILLED_BY) filled[index] = 1;
    }
  }

  for (let index = 0; index < total; index += 1) {
    if (!filled[index]) continue;

    const col = index % box.cols;
    const row = (index / box.cols) | 0;
    const color = shadeHex(
      THREADS[threadColorIndex(col, row)],
      0.95 + hash(index) * 0.1,
    );

    stitches.push({
      x: col * box.cell,
      y: row * box.cell,
      w: box.cell,
      h: box.cell,
      color,
    });
  }

  return stitches;
};

type Point = { x: number; y: number };

/** Диагональ стежка: `at(t, offset)` — точка вдоль нити со сдвигом по перпендикуляру. */
const strandGeometry = (from: Point, to: Point) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  return {
    at: (t: number, offset: number): Point => ({
      x: from.x + ux * length * t - uy * offset,
      y: from.y + uy * length * t + ux * offset,
    }),
  };
};

/**
 * SVG вышивки: светлая канва Aida, обрезанная по точному контуру букв, и
 * регулярные X-стежки одинаковой геометрии, тоже обрезанные маской букв.
 */
const buildSvg = (box: Box, glyphs: Glyph[], stitches: Stitch[], uid: string) => {
  const s = box.cell;
  const inset = num(s * 0.04);
  const strip = num(s * 0.34);
  const far = num(s * 0.62);
  const threadW = 45; // ширина нити в системе координат клетки 100×100
  const stitchInset = 23; // концы нити касаются границ клетки, не выходя за них
  const fibers = [-14.5, -6, 6, 14.5];

  const glyphText = glyphs
    .map(
      (glyph) =>
        `<text x="${num(glyph.x)}" y="${num(glyph.baseline)}" ` +
        `font-family="${escapeXml(glyph.family)}" font-size="${num(
          glyph.size,
        )}" font-style="${glyph.style}" font-weight="${glyph.weight}" ` +
        `fill="#000">${escapeXml(glyph.char)}</text>`,
    )
    .join("");

  const uses = stitches
    .map(
      (stitch) =>
        `<use href="#st-${uid}" x="${num(stitch.x)}" y="${num(
          stitch.y,
        )}" width="${num(stitch.w)}" height="${num(stitch.h)}" ` +
        `style="color:${stitch.color}"/>`,
    )
    .join("");

  const line = (a: Point, b: Point) =>
    `M${num(a.x)} ${num(a.y)}L${num(b.x)} ${num(b.y)}`;

  /** Одна диагональ: контактные тени, округлая нить, витки скрутки, волокна, блик. */
  const renderStrand = (
    from: Point,
    to: Point,
    gradient: string,
    spec: string,
    strong: boolean,
  ) => {
    const geom = strandGeometry(from, to);
    const axis = line(geom.at(0, 0), geom.at(1, 0));
    const out: string[] = [];

    // Мягкая тень из трёх слоёв — затухание без SVG-фильтров.
    out.push(
      `<path d="${axis}" stroke="rgba(56,40,28,0.06)" stroke-width="56" transform="translate(1.5,6)"/>`,
      `<path d="${axis}" stroke="rgba(56,40,28,0.09)" stroke-width="50" transform="translate(1.5,5)"/>`,
      `<path d="${axis}" stroke="rgba(56,40,28,0.16)" stroke-width="44" transform="translate(2,4)"/>`,
    );

    // Основное тело нити и округлый профиль объёма.
    out.push(
      `<path d="${axis}" stroke="currentColor" stroke-width="${threadW}"/>`,
      `<path d="${axis}" stroke="url(#${gradient})" stroke-width="${threadW}"/>`,
    );

    // Витки скрутки: дуги, обегающие цилиндр нити, с теневой бороздкой
    // после каждой светлой грани — главный признак кручёной нити.
    const ridges: string[] = [];
    const grooves: string[] = [];

    for (let t = 0.06; t <= 0.84; t += 0.15) {
      const start = geom.at(t, -19.5);
      const peak = geom.at(t + 0.02, 0);
      const end = geom.at(t + 0.11, 19.5);
      ridges.push(
        `M${num(start.x)} ${num(start.y)}Q${num(peak.x)} ${num(peak.y)} ${num(
          end.x,
        )} ${num(end.y)}`,
      );

      const grooveStart = geom.at(t + 0.075, -19.5);
      const groovePeak = geom.at(t + 0.095, 0);
      const grooveEnd = geom.at(t + 0.185, 19.5);
      grooves.push(
        `M${num(grooveStart.x)} ${num(grooveStart.y)}Q${num(
          groovePeak.x,
        )} ${num(groovePeak.y)} ${num(grooveEnd.x)} ${num(grooveEnd.y)}`,
      );
    }

    out.push(
      `<path d="${ridges.join("")}" stroke="rgba(255,255,255,0.22)" stroke-width="3.2"/>`,
      `<path d="${grooves.join("")}" stroke="rgba(44,31,20,0.15)" stroke-width="2.6"/>`,
    );

    // Продольные волокна внутри нити — тонкая фактура пучка.
    for (const offset of fibers) {
      const start = geom.at(0.04, offset);
      const end = geom.at(0.96, offset * 0.55);
      const ctrl = geom.at(0.5, offset * 1.06 + (offset < 0 ? -1.6 : 1.6));

      out.push(
        `<path d="M${num(start.x)} ${num(start.y)}Q${num(ctrl.x)} ${num(
          ctrl.y,
        )} ${num(end.x)} ${num(end.y)}" stroke="${
          offset < 0 ? "rgba(255,255,255,0.28)" : "rgba(44,31,20,0.16)"
        }" stroke-width="5"/>`,
      );
    }

    // Лёгкий ворс за контуром нити — края не выглядят вырезанными.
    for (const offset of [-23, 23]) {
      const start = geom.at(0.14, offset);
      const end = geom.at(0.86, offset * 0.85);

      out.push(
        `<path d="${line(start, end)}" stroke="${
          offset < 0 ? "rgba(255,255,255,0.16)" : "rgba(44,31,20,0.12)"
        }" stroke-width="1.8"/>`,
      );
    }

    // Мягкий матовый блик вдоль нити со стороны света.
    const specStart = geom.at(0.1, -7.5);
    const specEnd = geom.at(0.9, -7.5);

    out.push(
      `<path d="M${num(specStart.x)} ${num(specStart.y)}L${num(
        specEnd.x,
      )} ${num(specEnd.y)}" stroke="url(#${spec})" stroke-width="${
        strong ? 10 : 9
      }"/>`,
    );

    return out.join("");
  };

  const cylinder = (highlight: number) => `
      <stop offset="0" stop-color="rgba(0,0,0,0.62)"/>
      <stop offset="0.1" stop-color="rgba(0,0,0,0.3)"/>
      <stop offset="0.26" stop-color="rgba(255,255,255,${num(highlight * 0.7)})"/>
      <stop offset="0.4" stop-color="rgba(255,255,255,${highlight})"/>
      <stop offset="0.56" stop-color="rgba(255,255,255,0.05)"/>
      <stop offset="0.72" stop-color="rgba(0,0,0,0.14)"/>
      <stop offset="0.9" stop-color="rgba(0,0,0,0.42)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0.62)"/>`;

  const specStops = `
      <stop offset="0" stop-color="rgba(255,255,255,0)"/>
      <stop offset="0.35" stop-color="rgba(255,255,255,0.24)"/>
      <stop offset="0.62" stop-color="rgba(255,255,255,0.1)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0)"/>`;

  const weaveStops = `
      <stop offset="0" stop-color="rgba(126,106,80,0.09)"/>
      <stop offset="0.24" stop-color="rgba(255,254,250,0.38)"/>
      <stop offset="0.6" stop-color="rgba(255,253,248,0.1)"/>
      <stop offset="1" stop-color="rgba(126,106,80,0.1)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(
    box.width,
  )}" height="${num(box.height)}" viewBox="0 0 ${num(box.width)} ${num(
    box.height,
  )}" aria-hidden="true" focusable="false">
  <defs>
    <pattern id="aida-${uid}" patternUnits="userSpaceOnUse" x="0" y="0" width="${num(
      s,
    )}" height="${num(s)}">
      <rect width="${num(s)}" height="${num(s)}" fill="#f7f1e4"/>
      <rect x="${inset}" y="0" width="${strip}" height="${num(s)}" fill="url(#wvV-${uid})"/>
      <rect x="${far}" y="0" width="${strip}" height="${num(s)}" fill="url(#wvV-${uid})"/>
      <rect x="0" y="${inset}" width="${num(s)}" height="${strip}" fill="url(#wvH-${uid})"/>
      <rect x="0" y="${far}" width="${num(s)}" height="${strip}" fill="url(#wvH-${uid})"/>
      <rect x="${inset}" y="${inset}" width="${strip}" height="${strip}" fill="url(#wvV-${uid})"/>
      <rect x="${far}" y="${far}" width="${strip}" height="${strip}" fill="url(#wvV-${uid})"/>
      <circle cx="0" cy="0" r="${num(s * 0.115)}" fill="url(#hole-${uid})"/>
      <circle cx="${num(s)}" cy="0" r="${num(s * 0.115)}" fill="url(#hole-${uid})"/>
      <circle cx="0" cy="${num(s)}" r="${num(s * 0.115)}" fill="url(#hole-${uid})"/>
      <circle cx="${num(s)}" cy="${num(s)}" r="${num(s * 0.115)}" fill="url(#hole-${uid})"/>
      <rect x="0.5" y="0.5" width="${num(s - 1)}" height="${num(s - 1)}" fill="none" stroke="rgba(118,98,72,0.04)" stroke-width="1"/>
    </pattern>

    <linearGradient id="wvH-${uid}" x1="0" y1="0" x2="0" y2="1">${weaveStops}</linearGradient>
    <linearGradient id="wvV-${uid}" x1="0" y1="0" x2="1" y2="0">${weaveStops}</linearGradient>
    <radialGradient id="hole-${uid}" cx="0.5" cy="0.5" r="0.5" fx="0.44" fy="0.42">
      <stop offset="0" stop-color="rgba(74,58,42,0.4)"/>
      <stop offset="0.5" stop-color="rgba(96,78,56,0.24)"/>
      <stop offset="0.82" stop-color="rgba(126,106,80,0.1)"/>
      <stop offset="1" stop-color="rgba(126,106,80,0)"/>
    </radialGradient>

    <clipPath id="letters-${uid}" clipPathUnits="userSpaceOnUse">${glyphText}</clipPath>

    <linearGradient id="shA-${uid}" x1="0" y1="0" x2="1" y2="1">${cylinder(
      0.32,
    )}</linearGradient>
    <linearGradient id="shB-${uid}" x1="1" y1="0" x2="0" y2="1">${cylinder(
      0.4,
    )}</linearGradient>
    <linearGradient id="spA-${uid}" x1="0" y1="1" x2="1" y2="0">${specStops}</linearGradient>
    <linearGradient id="spB-${uid}" x1="0" y1="0" x2="1" y2="1">${specStops}</linearGradient>

    <symbol id="st-${uid}" viewBox="0 0 100 100">
      <g fill="none" stroke-linecap="round">
        ${renderStrand(
          { x: stitchInset, y: 100 - stitchInset },
          { x: 100 - stitchInset, y: stitchInset },
          `shA-${uid}`,
          `spA-${uid}`,
          false,
        )}
        ${renderStrand(
          { x: stitchInset, y: stitchInset },
          { x: 100 - stitchInset, y: 100 - stitchInset },
          `shB-${uid}`,
          `spB-${uid}`,
          true,
        )}
      </g>
    </symbol>
  </defs>

  <rect x="0" y="0" width="${num(box.width)}" height="${num(
    box.height,
  )}" fill="url(#aida-${uid})" clip-path="url(#letters-${uid})"/>
  <g clip-path="url(#letters-${uid})">${uses}</g>
</svg>`;
};

export default function EmbroideredTitle({
  children,
  className,
  as,
}: Props) {
  const hostRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const artRef = useRef<HTMLSpanElement | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const host = hostRef.current;
    const textRoot = textRef.current;
    const art = artRef.current;

    if (!host || !textRoot || !art) return;

    let disposed = false;
    let fontsTried = false;
    let resizeTimer: number | undefined;

    const render = () => {
      const rect = host.getBoundingClientRect();

      if (rect.width < 4 || rect.height < 4) return;

      const style = getComputedStyle(textRoot);
      const fontSize = parseFloat(style.fontSize) || 16;
      const cell = clamp(Math.round(fontSize * 0.11), 5, 18);
      const pad = Math.max(8, Math.round(cell * 1.1));
      const box: Box = {
        width: Math.round(rect.width + pad * 2),
        height: Math.round(rect.height + pad * 2),
        pad,
        cell,
        cols: Math.max(1, Math.ceil((rect.width + pad * 2) / cell)),
        rows: Math.max(1, Math.ceil((rect.height + pad * 2) / cell)),
        scale: MASK_SCALE,
      };

      const mask = buildMask(host, textRoot, box);

      if (!mask || !mask.glyphs.length) return;

      const stitches = collectStitches(mask.ctx, box);

      if (!stitches.length) return;

      const svg = buildSvg(box, mask.glyphs, stitches, uid);
      const parsed = new DOMParser().parseFromString(
        svg.replace("<svg ", `<svg id="art-${uid}" `),
        "image/svg+xml",
      );

      if (parsed.querySelector("parsererror")) return;

      art.style.left = `${-pad}px`;
      art.style.top = `${-pad}px`;
      art.style.width = `${box.width}px`;
      art.style.height = `${box.height}px`;
      art.replaceChildren(document.importNode(parsed.documentElement, true));
      host.classList.add(READY_CLASS);
    };

    const withTimeout = async <T,>(promise: Promise<T>, ms: number) => {
      await Promise.race([
        promise,
        new Promise((resolve) => window.setTimeout(resolve, ms)),
      ]);
    };

    const run = async () => {
      if (!fontsTried) {
        fontsTried = true;

        try {
          const style = getComputedStyle(textRoot);

          await withTimeout(
            document.fonts.load(
              `${style.fontStyle} ${style.fontWeight} 100px ${style.fontFamily}`,
              "Ваша фотография в стежках",
            ),
            4000,
          );
          await withTimeout(document.fonts.ready, 4000);
        } catch {
          // Шрифт не догрузился — построим по тому, что есть.
        }
      }

      if (!disposed) render();
    };

    void run();

    // Смена шрифта после загрузки может изменить переносы — перестраиваем.
    const onFontsReady = () => {
      if (!disposed) render();
    };

    document.fonts.addEventListener?.("loadingdone", onFontsReady);

    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!disposed) render();
      }, 160);
    });

    observer.observe(host);

    return () => {
      disposed = true;
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      document.fonts.removeEventListener?.("loadingdone", onFontsReady);
      host.classList.remove(READY_CLASS);
      art.replaceChildren();
    };
  }, [uid]);

  const Tag = (as ?? "h1") as ElementType;

  return (
    <Tag ref={hostRef} className={cn("embroidered-title", className)}>
      <span ref={textRef} className="embroidered-title__text">
        {children}
      </span>
      <span
        ref={artRef}
        className="embroidered-title__art"
        aria-hidden="true"
      />
    </Tag>
  );
}
