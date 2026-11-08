# Disintegrating Gallery для Next.js

**Версия:** 1.0  
**Статус:** реализация для интеграции и последующего тестирования  
**Назначение:** интерактивная галерея изображений с автоматическим распадом на квадратные частицы и восстановлением изображения.

---

## 1. Цель

Реализовать собственный компонент `DisintegratingGallery`, не используя платный исходный код Aceternity UI.

### Функциональные требования

- Автоматическая смена изображений в цикле.
- Распад текущего изображения на квадратные частицы.
- Плавное восстановление следующего изображения.
- Ручное переключение изображений.
- Перетаскивание мышью и свайпы на сенсорных устройствах.
- Индикаторы текущего изображения.
- Пауза и возобновление автоматического цикла.
- Адаптивная вёрстка.
- Поддержка `prefers-reduced-motion`.
- Отсутствие обязательных сторонних библиотек анимации.

### Технологии

- Next.js и React.
- TypeScript.
- Canvas 2D API.
- CSS.
- Стандартные браузерные API.

Three.js и WebGL для первой версии не требуются.

---

## 2. Структура файлов

Создай следующую структуру:

```text
your-project/
├── app/
│   └── page.tsx
├── components/
│   └── DisintegratingGallery/
│       ├── DisintegratingGallery.tsx
│       └── disintegrating-gallery.css
└── public/
    └── gallery/
        ├── embroidery-01.jpg
        ├── embroidery-02.jpg
        └── embroidery-03.jpg
```

Если в проекте используется `src/app`, размести компонент в существующей структуре проекта, не создавая дублирующие директории.

---

## 3. Основной компонент

Файл: `components/DisintegratingGallery/DisintegratingGallery.tsx`

```tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
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
  dwellMs?: number;
  transitionMs?: number;
  particleSize?: number;
  pauseOnHover?: boolean;
  label?: string;
};

type Particle = {
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
  rotation: number;
  spin: number;
  delay: number;
};

type Phase = "hold" | "out" | "in";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const ease = (t: number) =>
  t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function DisintegratingGallery({
  images,
  className = "",
  dwellMs = 2400,
  transitionMs = 1500,
  particleSize = 7,
  pauseOnHover = true,
  label = "Галерея работ",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const imageCache = useRef(new Map<string, HTMLImageElement>());
  const particles = useRef<Particle[]>([]);
  const frame = useRef<number | null>(null);

  const indexRef = useRef(0);
  const targetRef = useRef(0);
  const phaseRef = useRef<Phase>("hold");
  const phaseStart = useRef(0);

  const paused = useRef(false);
  const reducedMotion = useRef(false);

  const dimensions = useRef({
    width: 0,
    height: 0,
    dpr: 1,
  });

  const drag = useRef({
    active: false,
    startX: 0,
    lastX: 0,
    moved: false,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [ready, setReady] = useState(false);

  const items = useMemo(
    () => images.filter((image) => image?.src),
    [images],
  );

  const currentIndex = items.length
    ? activeIndex % items.length
    : 0;

  const currentItem = items[currentIndex];

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

  const drawCover = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      image: HTMLImageElement,
      width: number,
      height: number,
    ) => {
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
    },
    [],
  );

  const createParticles = useCallback(
    (
      image: HTMLImageElement,
      width: number,
      height: number,
    ): Particle[] => {
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.max(1, Math.round(width));
      offscreen.height = Math.max(1, Math.round(height));

      const offCtx = offscreen.getContext("2d", {
        willReadFrequently: true,
      });

      if (!offCtx) return [];

      drawCover(offCtx, image, offscreen.width, offscreen.height);

      const data = offCtx.getImageData(
        0,
        0,
        offscreen.width,
        offscreen.height,
      ).data;

      const step = clamp(Math.round(particleSize), 4, 24);
      const result: Particle[] = [];

      for (let y = 0; y < offscreen.height; y += step) {
        for (let x = 0; x < offscreen.width; x += step) {
          const px = Math.min(x + Math.floor(step / 2), offscreen.width - 1);
          const py = Math.min(y + Math.floor(step / 2), offscreen.height - 1);

          const alpha = data[(py * offscreen.width + px) * 4 + 3];

          if (alpha < 20) continue;

          const direction = Math.random() < 0.5 ? -1 : 1;

          result.push({
            x,
            y,
            size: step,
            dx: direction * (width * (0.08 + Math.random() * 0.3)),
            dy: height * (-0.2 + Math.random() * 0.4),
            rotation: (Math.random() - 0.5) * 0.4,
            spin: (Math.random() - 0.5) * 2.5,
            delay: Math.random() * 0.25,
          });
        }
      }

      return result;
    },
    [drawCover, particleSize],
  );

  const drawParticles = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      image: HTMLImageElement,
      width: number,
      height: number,
      progress: number,
      direction: "out" | "in",
    ) => {
      if (!particles.current.length) {
        particles.current = createParticles(image, width, height);
      }

      ctx.clearRect(0, 0, width, height);

      const eased = ease(progress);
      const sourceScaleX = image.naturalWidth / width;
      const sourceScaleY = image.naturalHeight / height;

      for (const p of particles.current) {
        const localProgress = clamp(
          (progress - p.delay) / (1 - p.delay),
          0,
          1,
        );

        const t = ease(localProgress);
        const movement = direction === "out" ? t : 1 - t;
        const opacity = direction === "out" ? 1 - eased : eased;

        const x = p.x + p.dx * movement;
        const y =
          p.y +
          p.dy * movement +
          Math.sin(movement * Math.PI) * 10;

        const sampleX = clamp(
          p.x * sourceScaleX,
          0,
          image.naturalWidth - 1,
        );

        const sampleY = clamp(
          p.y * sourceScaleY,
          0,
          image.naturalHeight - 1,
        );

        const sampleWidth = Math.max(1, p.size * sourceScaleX);
        const sampleHeight = Math.max(1, p.size * sourceScaleY);

        ctx.save();
        ctx.globalAlpha = clamp(opacity, 0, 1);
        ctx.translate(x + p.size / 2, y + p.size / 2);
        ctx.rotate(p.rotation + p.spin * movement);

        ctx.drawImage(
          image,
          sampleX,
          sampleY,
          sampleWidth,
          sampleHeight,
          -p.size / 2,
          -p.size / 2,
          p.size,
          p.size,
        );

        ctx.restore();
      }
    },
    [createParticles],
  );

  const goTo = useCallback(
    (requestedIndex: number) => {
      if (items.length < 2) return;

      const next =
        (requestedIndex + items.length) % items.length;

      if (next === indexRef.current && phaseRef.current === "hold") {
        return;
      }

      targetRef.current = next;
      phaseRef.current = "out";
      phaseStart.current = performance.now();
      particles.current = [];
    },
    [items.length],
  );

  const setPause = useCallback((value: boolean) => {
    paused.current = value;
    setIsPaused(value);
  }, []);

  useEffect(() => {
    if (!items.length) return;

    let cancelled = false;

    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    reducedMotion.current = media.matches;

    const onMotionChange = () => {
      reducedMotion.current = media.matches;
      particles.current = [];

      if (media.matches) {
        phaseRef.current = "hold";
        indexRef.current = targetRef.current;
        setActiveIndex(targetRef.current);
        phaseStart.current = performance.now();
      }
    };

    media.addEventListener?.("change", onMotionChange);

    Promise.all(
      items.map((item) =>
        loadImage(item.src).catch(() => null),
      ),
    ).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      media.removeEventListener?.("change", onMotionChange);
    };
  }, [items, loadImage]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !items.length) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let running = true;
    let lastTimestamp = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);

      dimensions.current = { width, height, dpr };

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles.current = [];
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const render = async (timestamp: number) => {
      if (!running) return;

      frame.current = requestAnimationFrame(render);

      const { width, height } = dimensions.current;

      if (!width || !height) return;

      if (document.hidden) return;

      const current = items[indexRef.current];

      if (!current) return;

      const image = await loadImage(current.src).catch(() => null);

      if (!running || !image) return;

      if (reducedMotion.current) {
        ctx.clearRect(0, 0, width, height);
        drawCover(ctx, image, width, height);
        return;
      }

      if (paused.current) {
        if (phaseRef.current === "hold") {
          ctx.clearRect(0, 0, width, height);
          drawCover(ctx, image, width, height);
        }

        return;
      }

      if (!lastTimestamp) lastTimestamp = timestamp;

      if (phaseRef.current === "hold") {
        ctx.clearRect(0, 0, width, height);
        drawCover(ctx, image, width, height);

        if (timestamp - phaseStart.current >= dwellMs) {
          targetRef.current = (indexRef.current + 1) % items.length;

          particles.current = createParticles(
            image,
            width,
            height,
          );

          phaseRef.current = "out";
          phaseStart.current = timestamp;
        }

        lastTimestamp = timestamp;
        return;
      }

      const halfTransition = Math.max(100, transitionMs / 2);

      if (phaseRef.current === "out") {
        const progress = clamp(
          (timestamp - phaseStart.current) / halfTransition,
          0,
          1,
        );

        drawParticles(
          ctx,
          image,
          width,
          height,
          progress,
          "out",
        );

        if (progress >= 1) {
          indexRef.current = targetRef.current;
          setActiveIndex(targetRef.current);

          phaseRef.current = "in";
          phaseStart.current = timestamp;
          particles.current = [];
        }
      } else {
        const next = items[targetRef.current];

        if (!next) return;

        const nextImage = await loadImage(next.src).catch(() => null);

        if (!running || !nextImage) {
          phaseRef.current = "hold";
          phaseStart.current = timestamp;
          return;
        }

        if (!particles.current.length) {
          particles.current = createParticles(
            nextImage,
            width,
            height,
          );
        }

        const progress = clamp(
          (timestamp - phaseStart.current) / halfTransition,
          0,
          1,
        );

        drawParticles(
          ctx,
          nextImage,
          width,
          height,
          progress,
          "in",
        );

        if (progress >= 1) {
          phaseRef.current = "hold";
          phaseStart.current = timestamp;
          particles.current = [];
        }
      }

      lastTimestamp = timestamp;
    };

    frame.current = requestAnimationFrame(render);

    return () => {
      running = false;
      observer.disconnect();

      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }
    };
  }, [
    items,
    loadImage,
    drawCover,
    drawParticles,
    createParticles,
    dwellMs,
    transitionMs,
  ]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    drag.current = {
      active: true,
      startX: event.clientX,
      lastX: event.clientX,
      moved: false,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!drag.current.active) return;

    drag.current.lastX = event.clientX;

    if (
      Math.abs(drag.current.lastX - drag.current.startX) > 6
    ) {
      drag.current.moved = true;
    }
  };

  const handlePointerUp = () => {
    const state = drag.current;

    if (state.active && state.moved) {
      const delta = state.lastX - state.startX;

      if (Math.abs(delta) > 36) {
        setPause(false);

        goTo(
          indexRef.current + (delta < 0 ? 1 : -1),
        );
      }
    }

    drag.current.active = false;
  };

  if (!items.length) {
    return (
      <div className={`dg-empty ${className}`}>
        Добавьте изображения в галерею.
      </div>
    );
  }

  return (
    <section
      className={`dg-gallery ${className}`}
      aria-label={label}
      onMouseEnter={() => pauseOnHover && setPause(true)}
      onMouseLeave={() => pauseOnHover && setPause(false)}
    >
      <div
        className="dg-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="group"
        aria-roledescription="интерактивная галерея"
      >
        <canvas
          ref={canvasRef}
          className="dg-canvas"
          aria-label={currentItem?.alt ?? label}
        />

        {!ready && (
          <div className="dg-loading">
            Загрузка галереи…
          </div>
        )}

        <div className="dg-overlay">
          <div className="dg-caption">
            {currentItem?.title && (
              <p className="dg-title">
                {currentItem.title}
              </p>
            )}

            <p className="dg-counter">
              {String(currentIndex + 1).padStart(2, "0")}
              {" / "}
              {String(items.length).padStart(2, "0")}
            </p>
          </div>

          <div className="dg-controls">
            <button
              type="button"
              className="dg-button"
              aria-label="Предыдущее изображение"
              onClick={() => {
                setPause(false);
                goTo(indexRef.current - 1);
              }}
            >
              ←
            </button>

            <button
              type="button"
              className="dg-button"
              aria-label="Следующее изображение"
              onClick={() => {
                setPause(false);
                goTo(indexRef.current + 1);
              }}
            >
              →
            </button>

            <button
              type="button"
              className="dg-button"
              aria-label={
                isPaused
                  ? "Продолжить показ"
                  : "Приостановить показ"
              }
              onClick={() => setPause(!paused.current)}
            >
              {isPaused ? "▶" : "Ⅱ"}
            </button>
          </div>
        </div>
      </div>

      <div className="dg-dots" aria-label="Выбор изображения">
        {items.map((item, index) => (
          <button
            type="button"
            key={`${item.src}-${index}`}
            className={`dg-dot ${
              index === currentIndex ? "is-active" : ""
            }`}
            aria-label={`Показать изображение ${index + 1}`}
            aria-current={
              index === currentIndex ? "true" : undefined
            }
            onClick={() => {
              setPause(false);
              goTo(index);
            }}
          />
        ))}
      </div>

      <p className="dg-hint">
        Перетаскивайте галерею или используйте стрелки
      </p>
    </section>
  );
}
```

---

## 4. Стили галереи

Файл: `components/DisintegratingGallery/disintegrating-gallery.css`

```css
.dg-gallery {
  width: 100%;
  color: #f8f5f0;
  font-family: inherit;
}

.dg-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 280px;
  overflow: hidden;
  isolation: isolate;
  border-radius: 18px;
  background: #171614;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}

.dg-stage:active {
  cursor: grabbing;
}

.dg-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.dg-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  pointer-events: none;
}

.dg-overlay {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(16px, 3vw, 30px);
  background: linear-gradient(
    transparent,
    rgba(0, 0, 0, 0.6)
  );
  pointer-events: none;
}

.dg-caption {
  min-width: 0;
}

.dg-title {
  margin: 0 0 7px;
  font-size: clamp(1rem, 2.4vw, 1.55rem);
  font-weight: 500;
  letter-spacing: -0.025em;
}

.dg-counter {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
}

.dg-controls {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.dg-button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  background: rgba(18, 17, 16, 0.45);
  color: white;
  font: inherit;
  font-size: 1.1rem;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.dg-button:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.8);
}

.dg-button:active {
  transform: scale(0.95);
}

.dg-button:focus-visible,
.dg-dot:focus-visible {
  outline: 2px solid white;
  outline-offset: 3px;
}

.dg-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
}

.dg-dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #c9c2b8;
  opacity: 0.55;
  cursor: pointer;
  transition:
    width 180ms ease,
    opacity 180ms ease;
}

.dg-dot.is-active {
  width: 24px;
  opacity: 1;
  background: #4e453c;
}

.dg-hint {
  margin: 10px 0 0;
  color: #77716a;
  font-size: 0.75rem;
  text-align: center;
}

.dg-empty {
  padding: 32px;
  border: 1px dashed #c9c2b8;
  border-radius: 12px;
  color: #77716a;
  text-align: center;
}

@media (max-width: 640px) {
  .dg-stage {
    aspect-ratio: 4 / 5;
    min-height: 360px;
    border-radius: 14px;
  }

  .dg-overlay {
    padding: 16px;
  }

  .dg-controls {
    gap: 6px;
  }

  .dg-button {
    width: 38px;
    height: 38px;
  }

  .dg-hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dg-button,
  .dg-dot {
    transition: none;
  }
}
```

---

## 5. Подключение на странице

Пример для `app/page.tsx`:

```tsx
import DisintegratingGallery, {
  type GalleryImage,
} from "@/components/DisintegratingGallery/DisintegratingGallery";

const works: GalleryImage[] = [
  {
    src: "/gallery/embroidery-01.jpg",
    alt: "Вышитая картина с цветочным мотивом",
    title: "Цветочная история",
  },
  {
    src: "/gallery/embroidery-02.jpg",
    alt: "Вышитый пейзаж",
    title: "Тихий пейзаж",
  },
  {
    src: "/gallery/embroidery-03.jpg",
    alt: "Яркая вышитая картина",
    title: "Цвет и настроение",
  },
];

export default function HomePage() {
  return (
    <main>
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 20px",
        }}
      >
        <p>Работы для вдохновения</p>

        <h1>
          Превратите любимое фото в картину для вышивания
        </h1>

        <DisintegratingGallery
          images={works}
          dwellMs={2600}
          transitionMs={1500}
          particleSize={7}
          pauseOnHover
        />
      </section>
    </main>
  );
}
```

Если алиас `@/` в проекте не настроен, используй относительный путь импорта.

### Зависимости

Дополнительные пакеты не нужны. Компонент использует только React и стандартные API браузера.

---

## 6. Настройки компонента

| Параметр | По умолчанию | Назначение |
|---|---:|---|
| `images` | Обязательный | Массив изображений |
| `dwellMs` | `2400` | Время показа цельного изображения, мс |
| `transitionMs` | `1500` | Общая длительность распада и восстановления, мс |
| `particleSize` | `7` | Размер частиц |
| `pauseOnHover` | `true` | Пауза при наведении |
| `label` | `Галерея работ` | Доступное имя галереи |
| `className` | `""` | Дополнительный CSS-класс |

### Производительность

- `particleSize={5}` — мелкие частицы, более детальный эффект, выше нагрузка.
- `particleSize={7}` — исходный баланс.
- `particleSize={10}` — меньше частиц, легче для слабых устройств.
- Ограничение `devicePixelRatio` значением 2 снижает нагрузку на экраны с высокой плотностью пикселей.
- Не загружай сотни изображений одновременно без необходимости.

---

## 7. Инструкция для ИИ-агента

Передай агенту следующий запрос после сохранения этого документа в корне проекта.

> Прочитай `DISINTEGRATING_GALLERY.md` полностью.
>
> Цель — интегрировать компонент Disintegrating Gallery в существующий проект Next.js.
>
> Правила работы:
>
> 1. Сначала изучи структуру проекта, `package.json`, версию Next.js, существующую архитектуру и соглашения по стилям.
> 2. Не переписывай приложение и не меняй архитектуру.
> 3. Создай только необходимые файлы компонента.
> 4. Не устанавливай дополнительные зависимости, если они не нужны существующему проекту.
> 5. Не заменяй существующие страницы целиком. Подключи компонент в согласованное место минимальными изменениями.
> 6. Проверь пути изображений, типизацию, жизненный цикл React, обработку ошибок загрузки и корректное завершение `requestAnimationFrame`.
> 7. Исправь потенциальные проблемы с повторными рендерами, изменением массива изображений, переключением вкладок и изменением размера окна.
> 8. Проверь автоматический цикл, распад, восстановление, ручные стрелки, точки навигации, паузу и свайпы.
> 9. Запусти доступные проверки: TypeScript, ESLint и production build.
> 10. Если есть ошибки, исправь их, не отключая проверки и не маскируя ошибки типизации.
> 11. Не заявляй, что браузерное поведение проверено, если реально не запускал браузер.
> 12. В конце выведи изменённые файлы, результаты проверок, известные ограничения и инструкции для ручной проверки.
>
> Сначала проведи аудит совместимости кода из документа с проектом. Если обнаружишь дефект, исправь его до интеграции.

---

## 8. Чек-лист приёмки

### Функциональность

- [ ] Галерея отображает изображения.
- [ ] Автоматический цикл работает без остановки после нескольких переключений.
- [ ] Изображение распадается на квадратные частицы.
- [ ] Следующее изображение собирается из частиц.
- [ ] Стрелки переключают изображения.
- [ ] Индикаторы переключают изображения.
- [ ] Перетаскивание работает мышью.
- [ ] Свайпы работают на сенсорном устройстве.
- [ ] Пауза и возобновление работают корректно.
- [ ] Ошибка загрузки изображения не ломает всю страницу.

### Совместимость

- [ ] TypeScript проходит без ошибок.
- [ ] ESLint проходит без новых ошибок.
- [ ] Production build завершается успешно.
- [ ] Нет ошибок в консоли браузера.
- [ ] Нет бесконечного создания циклов анимации после размонтирования.
- [ ] Изменение размера окна не ломает отображение.
- [ ] Галерея адаптируется к мобильной ширине.
- [ ] Учитывается настройка уменьшения движения.

### Производительность и доступность

- [ ] Анимация не блокирует интерфейс.
- [ ] Количество частиц приемлемо на мобильном устройстве.
- [ ] Кнопки доступны с клавиатуры.
- [ ] У кнопок и изображений есть доступные названия.
- [ ] Изображения не содержат единственный экземпляр важного SEO-текста.
- [ ] Проверено поведение при переключении вкладки браузера.

---

## 9. Известные ограничения

1. Canvas не предоставляет поисковым системам содержимое изображения как обычный HTML. Поэтому заголовки, описания и SEO-текст должны оставаться в DOM.
2. Удалённые изображения могут требовать корректных CORS-заголовков.
3. Качество анимации зависит от разрешения изображения и производительности устройства.
4. `prefers-reduced-motion` должен отключать сложную анимацию, а не только CSS-переходы.
5. Приведённый исходный код — основа для интеграции, а не подтверждение того, что компонент уже прошёл тестирование в конкретном проекте.

---

## 10. Критерий готовности

Компонент считается готовым к внедрению, когда:

- он встроен в существующий проект без ненужных изменений;
- все обязательные проверки завершились успешно;
- автоматический цикл и ручное управление проверены в браузере;
- нет критических ошибок в консоли;
- адаптивность проверена на десктопе и мобильном устройстве;
- агент представил отчёт с фактическими результатами тестирования.

**Важно:** не считать задачу завершённой только на основании успешной компиляции. Визуальная проверка анимации обязательна.
