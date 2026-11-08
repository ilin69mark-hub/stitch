"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import "./disintegrating-gallery.css";

export type GalleryImage = {
  src: string;
  alt: string;
  title?: string;
};

type Props = {
  images: GalleryImage[];
  className?: string;
  label?: string;
  cardWidth?: number;
  cardHeight?: number;
  gap?: number;
  cellSize?: number;
  speed?: number;
  scatter?: number;
  edge?: number;
};

type Card = {
  slot: number;
  cellsX: number;
  cellsY: number;
  rand: Float32Array;
  source: HTMLCanvasElement;
};

type Layout = {
  width: number;
  height: number;
  dpr: number;
  zoom: number;
  cardW: number;
  cardH: number;
  spacing: number;
  total: number;
  half: number;
  cards: Card[];
};

type Motion = {
  offset: number;
  velocity: number;
  time: number;
  last: number;
  dragging: boolean;
  lastX: number;
  lastT: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const wrap = (value: number, total: number) => {
  const half = total / 2;
  let next = value % total;

  if (next < -half) next += total;
  if (next >= half) next -= total;

  return next;
};

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  ctx.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function buildCard(
  slot: number,
  image: HTMLImageElement,
  cardW: number,
  cardH: number,
  dpr: number,
  cellsX: number,
  cellsY: number,
): Card | null {
  const source = document.createElement("canvas");
  source.width = Math.max(1, Math.round(cardW * dpr));
  source.height = Math.max(1, Math.round(cardH * dpr));

  const ctx = source.getContext("2d");

  if (!ctx) return null;

  drawCover(ctx, image, source.width, source.height);

  const rand = new Float32Array(cellsX * cellsY * 2);

  for (let i = 0; i < rand.length; i += 1) {
    rand[i] = Math.random();
  }

  return { slot, cellsX, cellsY, rand, source };
}

export default function DisintegratingGallery({
  images,
  className = "",
  label = "Галерея работ",
  cardWidth = 280,
  cardHeight = 360,
  gap = 28,
  cellSize = 12,
  speed = 40,
  scatter = 140,
  edge = 0.45,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef(new Map<string, HTMLImageElement>());

  const layoutRef = useRef<Layout | null>(null);
  const motionRef = useRef<Motion>({
    offset: 0,
    velocity: 0,
    time: 0,
    last: 0,
    dragging: false,
    lastX: 0,
    lastT: 0,
  });
  const rafRef = useRef<number | null>(null);
  const reducedRef = useRef(false);
  const speedRef = useRef(speed);
  const scatterRef = useRef(scatter);
  const edgeRef = useRef(edge);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    speedRef.current = speed;
    scatterRef.current = scatter;
    edgeRef.current = edge;
  }, [speed, scatter, edge]);

  const items = useMemo(() => {
    const broken = new Set(failed);
    return images.filter((image) => image?.src && !broken.has(image.src));
  }, [images, failed]);

  const loadImage = useCallback((src: string) => {
    const cached = imageCache.current.get(src);

    if (cached?.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }

    if (cached) {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        cached.addEventListener("load", () => resolve(cached), {
          once: true,
        });
        cached.addEventListener(
          "error",
          () => reject(new Error(`Ошибка загрузки: ${src}`)),
          { once: true },
        );
      });
    }

    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";

      image.onload = () => {
        imageCache.current.set(src, image);
        resolve(image);
      };

      image.onerror = () => {
        imageCache.current.delete(src);
        reject(new Error(`Не удалось загрузить изображение: ${src}`));
      };

      image.src = src;
      imageCache.current.set(src, image);
    });
  }, []);

  useEffect(() => {
    if (!items.length) return;

    let cancelled = false;

    Promise.all(
      items.map((item) =>
        loadImage(item.src).then(
          () => null,
          () => item.src,
        ),
      ),
    ).then((results) => {
      if (cancelled) return;

      const broken = results.filter(
        (src): src is string => Boolean(src),
      );

      if (broken.length) {
        setFailed((previous) => {
          const next = new Set(previous);
          broken.forEach((src) => next.add(src));
          return Array.from(next);
        });
      }

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [items, loadImage]);

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const update = () => {
      reducedRef.current = media.matches;

      if (media.matches) {
        motionRef.current.velocity = 0;
      }
    };

    update();
    media.addEventListener?.("change", update);

    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;

    if (!stage || !canvas || !items.length || !ready) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let running = true;

    const resize = () => {
      const bounds = stage.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const previous = layoutRef.current;

      if (
        previous &&
        previous.width === width &&
        previous.height === height &&
        previous.dpr === dpr
      ) {
        return;
      }

      const zoom = Math.min(
        1,
        (height * 0.82) / cardHeight,
        width / ((cardWidth + gap) * 2.6),
      );
      const cardW = Math.max(40, cardWidth * zoom);
      const cardH = Math.max(40, cardHeight * zoom);
      const spacing = (cardWidth + gap) * zoom;
      const cellsX = Math.max(2, Math.round(cardWidth / cellSize));
      const cellsY = Math.max(2, Math.round(cardHeight / cellSize));
      const visible = Math.ceil(width / spacing) + 2;
      const count = Math.max(
        items.length,
        Math.ceil(visible / items.length) * items.length,
      );

      const cards: Card[] = [];

      for (let slot = 0; slot < count; slot += 1) {
        const item = items[slot % items.length];
        const image = imageCache.current.get(item.src);

        if (!image) continue;

        const card = buildCard(
          slot,
          image,
          cardW,
          cardH,
          dpr,
          cellsX,
          cellsY,
        );

        if (card) cards.push(card);
      }

      if (!cards.length) return;

      layoutRef.current = {
        width,
        height,
        dpr,
        zoom,
        cardW,
        cardH,
        spacing,
        total: cards.length * spacing,
        half: width / 2,
        cards,
      };

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    layoutRef.current = null;
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    const render = (timestamp: number) => {
      if (!running) return;

      rafRef.current = requestAnimationFrame(render);

      const layout = layoutRef.current;

      if (!layout) return;

      const motion = motionRef.current;
      const reduced = reducedRef.current;
      const delta = motion.last
        ? Math.min(timestamp - motion.last, 64)
        : 16;

      motion.last = timestamp;

      const dt = delta / 1000;

      if (!motion.dragging && !reduced) {
        const target = -speedRef.current * layout.zoom;

        motion.velocity +=
          (target - motion.velocity) * Math.min(1, dt * 2.5);
        motion.offset += motion.velocity * dt;
      }

      if (!reduced) {
        motion.time += dt;
      }

      const { width, height, half, cardW, cardH, spacing, total } =
        layout;
      const scatterValue = scatterRef.current * layout.zoom;
      const edgeValue = clamp(edgeRef.current, 0.05, 1);
      const wobble = 7 * layout.zoom;

      ctx.clearRect(0, 0, width, height);

      for (const card of layout.cards) {
        const x = wrap(card.slot * spacing + motion.offset, total);

        if (Math.abs(x) > half + cardW * 0.75) continue;

        const left = width / 2 + x - cardW / 2;
        const top = (height - cardH) / 2;
        const cellW = cardW / card.cellsX;
        const cellH = cardH / card.cellsY;
        const sourceCellW = card.source.width / card.cellsX;
        const sourceCellH = card.source.height / card.cellsY;

        for (let row = 0; row < card.cellsY; row += 1) {
          const cellUvY = (row + 0.5) / card.cellsY;
          const depthY = Math.abs(cellUvY - 0.5) * 2;

          for (let column = 0; column < card.cellsX; column += 1) {
            const index = row * card.cellsX + column;
            const randX = card.rand[index * 2];
            const randY = card.rand[index * 2 + 1];
            const cellUvX = (column + 0.5) / card.cellsX;
            const screenX = x + (cellUvX - 0.5) * cardW;
            const side = screenX < 0 ? -1 : 1;
            const zone = clamp(
              (Math.abs(screenX) / half - (1 - edgeValue)) /
                edgeValue,
              0,
              1,
            );
            const depth =
              1 -
              Math.max(
                Math.abs(cellUvX - 0.5) * 2,
                depthY,
              );
            let progress = clamp(
              (zone * 1.45 - depth * 0.75 - randX * 0.4) / 0.3,
              0,
              1,
            );

            progress = progress * progress * (3 - 2 * progress);

            const alpha = 1 - progress;

            if (alpha <= 0.015) continue;

            const driftX =
              side *
              (0.35 + randY) *
              scatterValue *
              progress;
            const driftY =
              (randX - 0.5) * 1.4 * scatterValue * progress +
              Math.sin(
                motion.time * (1.6 + randY * 2.2) +
                  randX * Math.PI * 2,
              ) *
                wobble *
                progress;
            const shrink = 1 - 0.7 * progress;
            const sizeW = cellW * shrink;
            const sizeH = cellH * shrink;
            const pad = shrink > 0.999 ? 0.5 : 0;
            const cellCenterX =
              left + (column + 0.5) * cellW + driftX;
            const cellCenterY =
              top + (row + 0.5) * cellH + driftY;

            ctx.globalAlpha = alpha;
            ctx.drawImage(
              card.source,
              column * sourceCellW,
              row * sourceCellH,
              sourceCellW,
              sourceCellH,
              cellCenterX - sizeW / 2 - pad / 2,
              cellCenterY - sizeH / 2 - pad / 2,
              sizeW + pad,
              sizeH + pad,
            );
          }
        }
      }

      ctx.globalAlpha = 1;
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      observer.disconnect();

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [items, ready, cardWidth, cardHeight, gap, cellSize]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;

    const motion = motionRef.current;

    motion.dragging = true;
    motion.lastX = event.clientX;
    motion.lastT = performance.now();
    motion.velocity = 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const motion = motionRef.current;

    if (!motion.dragging) return;

    const now = performance.now();
    const delta = event.clientX - motion.lastX;

    motion.offset += delta;
    motion.velocity =
      (delta / Math.max(now - motion.lastT, 1)) * 1000;
    motion.lastX = event.clientX;
    motion.lastT = now;
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    motionRef.current.dragging = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

    motionRef.current.velocity -= event.deltaX * 12;
  };

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    const layout = layoutRef.current;

    if (!layout) return;

    event.preventDefault();

    motionRef.current.velocity +=
      (event.key === "ArrowLeft" ? 1 : -1) * layout.spacing * 3;
  };

  if (!items.length) {
    return (
      <div className={`dg-empty ${className}`}>
        {failed.length || images.length
          ? "Не удалось загрузить изображения галереи."
          : "Добавьте изображения в галерею."}
      </div>
    );
  }

  return (
    <div className={`dg-gallery ${className}`}>
      <div
        ref={stageRef}
        className="dg-stage"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${label}. Перетаскивайте, используйте горизонтальную прокрутку или стрелки влево и вправо.`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        <canvas
          ref={canvasRef}
          className="dg-canvas"
          aria-hidden="true"
        />

        {!ready && (
          <div className="dg-loading">Загрузка галереи…</div>
        )}

        <ul className="dg-sr">
          {items.map((item, index) => (
            <li key={`${item.src}-${index}`}>{item.alt}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
