# Стежок — магазин наборов для вышивания

Одностраничный интернет-магазин наборов для вышивания по клеткам: готовые дизайны, картина по фотографии, подарочные боксы, калькулятор стоимости, корзина, серверные заказы, промокоды и адаптер ЮKassa.

> Это демонстрационный проект. Цены, состав наборов, сроки, юридические документы и изображения — шаблонные. Перед публикацией замените их на реальные и проверьте тексты у юриста.

## Стек

- Next.js `16.4.3` (App Router, Cache Components)
- React `19.3.0`, TypeScript
- Tailwind CSS `4`
- SQLite через встроенный `node:sqlite` (`DatabaseSync`)
- `sharp` для проверки и нормализации фотографий
- Vitest для тестов ценообразования и заказов

Требуется Node.js с поддержкой `node:sqlite` (проверено на Node `25.9.0`; используйте актуальный LTS/Current).

## Быстрый старт

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Откройте `http://localhost:3001`. Без переменных окружения магазин работает в демонстрационном режиме: онлайн-оплата отключена, заказ сохраняется со статусом «ожидает оплаты», деньги не списываются.

## Управление через Makefile

Все основные действия доступны через `make` из корня проекта:

```bash
make help      # список команд и текущие настройки
make setup     # установка зависимостей и создание .env.local
make up        # запуск dev-сервера в фоне
make status    # статус фронта: URL, порт, PID
make logs      # логи dev-сервера в реальном времени
make down      # остановка и освобождение порта
make restart   # перезапуск dev-сервера

make build     # production-сборка
make prod      # production-сборка и запуск в фоне
make check     # lint + typecheck + тесты

make docker-up      # сборка образа и запуск контейнера
make docker-status  # статус контейнера и порт
make docker-logs    # логи контейнера
make docker-down    # остановка и удаление контейнера
```

`make up` и `make prod` запускают сервер в фоне и печатают адрес и порт. Порт по умолчанию — `3001`, изменить можно так:

```bash
make up PORT=8080
make status PORT=8080
```

Логи запущенного сервера пишутся в `/tmp/stezhok.log`, PID — в `/tmp/stezhok.pid`.

## Запуск в Docker

В репозитории есть multi-stage `Dockerfile` на Node.js 24 LTS. Сборка использует `pnpm`, а runtime — standalone-сервер Next.js. Контейнер работает от непривилегированного пользователя, данные вынесены в том `/data`.

Соберите образ, передав публичный URL на этапе сборки (он встраивается в клиентские бандлы, canonical и `return_url` оплаты):

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://shop.example.com \
  -t stezhok .
```

Запустите контейнер с файлом переменных окружения и постоянным томом:

```bash
docker run -d --name stezhok \
  -p 3001:3000 \
  -v stezhok-data:/data \
  --env-file .env.local \
  -e DATA_DIR=/data \
  stezhok
```

Проверка и логи:

```bash
docker logs -f stezhok
curl http://localhost:3001/api/payments/config
```

Остановка и удаление (том с заказами и фото сохраняется):

```bash
docker stop stezhok
docker rm stezhok
```

Важно:

- `.env`/`.env.local` не попадают в образ благодаря `.dockerignore`; секреты передавайте только при запуске.
- `NEXT_PUBLIC_SITE_URL` задаётся **build-arg**, а не только runtime-env. После смены домена пересоберите образ.
- Внутри контейнера `DATA_DIR=/data`; не переопределяйте его на относительный путь, если используете том.
- Для production используйте HTTPS-прокси перед контейнером и резервное копирование тома `stezhok-data`.
- SQLite и in-memory rate limiting рассчитаны на один инстанс. Для нескольких реплик нужны внешняя БД, объектное хранилище и общий rate-limit store.

## Скрипты

```bash
pnpm dev        # dev-сервер
pnpm build      # production build
pnpm start      # запуск production build
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run
pnpm test:watch # vitest в watch-режиме
```

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Публичный URL сайта для canonical, sitemap и `return_url` оплаты. В production — HTTPS без слэша на конце. |
| `DATA_DIR` | Каталог для `shop.db` и загруженных фото. Должен быть доступен на запись. В production лучше абсолютный путь вне репозитория. |
| `UPLOAD_MAX_MB` | Максимальный размер загружаемого файла в МБ. По умолчанию `15`. |
| `PAYMENT_PROVIDER` | `none` или `yookassa`. |
| `PAYMENT_MODE` | `test` или `live`; влияет на текст уведомления. Реальный режим определяется ключами ЮKassa. |
| `YOOKASSA_SHOP_ID` | ID магазина ЮKassa. |
| `YOOKASSA_SECRET_KEY` | Секретный ключ ЮKassa. |
| `YOOKASSA_API_URL` | Базовый URL API, по умолчанию `https://api.yookassa.ru/v3`. |
| `YOOKASSA_WEBHOOK_SECRET` | Секрет webhook. Передаётся в query `?secret=...`. Если пуст, проверка секрета отключается. |
| `YOOKASSA_ALLOWED_IPS` | Необязательный список IP/CIDR через запятую для webhook. Если пуст, IP-фильтр отключён. |
| `ADMIN_TOKEN` | Bearer-токен для `/api/admin/*`. Если пуст, админ-маршруты отвечают `503`. |

## Оплата

### Режим без оплаты

`PAYMENT_PROVIDER=none` — безопасный дефолт. Заказ создаётся, платёж не имитируется, статус оплаты остаётся `not_configured`/`pending`. На странице заказа явно написано, что деньги не списаны.

### ЮKassa

1. Укажите `PAYMENT_PROVIDER=yookassa`, `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`.
2. Настройте webhook в личном кабинете ЮKassa на URL:
   `https://<ваш-домен>/api/payments/yookassa/webhook?secret=<YOOKASSA_WEBHOOK_SECRET>`
3. Подпишитесь на события `payment.succeeded` и `payment.canceled` (обрабатываются и другие `payment.*`).
4. Задайте `YOOKASSA_WEBHOOK_SECRET` и, желательно, `YOOKASSA_ALLOWED_IPS` с актуальными адресами ЮKassa.
5. Проверьте, что `NEXT_PUBLIC_SITE_URL` указывает на публичный HTTPS-домен: он используется в `return_url`.

Webhook:

- проверяет секрет через `safeEqual` и IP allowlist;
- ограничивает частоту (120 запросов/мин на IP);
- сохраняет событие в `webhook_events` для идемпотентности;
- **самостоятельно запрашивает платёж через API провайдера**, а не доверяет телу уведомления;
- сверяет `orderId`, сумму и валюту;
- помечает заказ оплаченным только после `paid === true` от провайдера;
- при недоступности провайдера возвращает `503` и оставляет событие необработанным для повтора.

## Данные и загрузки

- SQLite: `DATA_DIR/shop.db` (WAL, foreign keys).
- Фотографии: `DATA_DIR/uploads/YYYY/MM/...webp`, вне `public`.
- Допустимые форматы: JPEG, PNG, WebP; проверяются magic bytes и `sharp`.
- Лимиты: 15 МБ (настраивается), минимум `300 × 300 px`, максимум `40 МП`.
- Файл нормализуется в WebP; оригинал не публикуется.
- Доступ к фото заказа — по ссылке с токеном заказа; админ — по `ADMIN_TOKEN`.

## Админ-доступ

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/api/admin/orders"
```

Также поддерживается `?token=...`. Если `ADMIN_TOKEN` не задан, маршруты отключены. Для production используйте только HTTPS и не передавайте токен в логах/реферере.

## API

| Метод | Маршрут | Назначение |
| --- | --- | --- |
| `POST` | `/api/promo` | Проверка промокода на сервере. |
| `POST` | `/api/uploads` | Загрузка и нормализация фото. |
| `POST` | `/api/orders` | Создание заказа с серверным пересчётом цен. |
| `GET` | `/api/orders/[id]?token=` | Публичные данные заказа по токену. |
| `POST` | `/api/orders/[id]/payment` | Создание/повтор платежа. |
| `GET` | `/api/orders/[id]/photo/[itemId]?token=` | Фото позиции заказа. |
| `GET` | `/api/payments/config` | Статус платёжной конфигурации. |
| `POST` | `/api/payments/yookassa/webhook` | Webhook ЮKassa. |
| `GET` | `/api/admin/orders` | Список заказов (админ). |
| `GET` | `/api/admin/orders/[id]/photo` | Фото заказа (админ). |

## Безопасность и ограничения

- Rate limiting реализован **в памяти процесса**. При нескольких инстансах или serverless нужен общий store (Redis/edge) — иначе лимиты будут считаться отдельно на каждом инстансе.
- SQLite подходит для одного инстанса с локальным диском. Для горизонтального масштабирования нужна внешняя БД и объектное хранилище.
- Ссылка заказа содержит секретный токен. Не публикуйте её и не добавляйте в аналитику.
- Страницы `/checkout` и `/order/[id]` закрыты от индексации (`noindex`).
- Юридические страницы — шаблоны с плейсхолдерами; они не являются проверенным юридическим текстом.
- Демо-изображения сгенерированы из Unsplash и обработаны в cross-stitch-мозаику. Источники: `public/images/catalog/sources.json`.

## Проверка

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Тесты покрывают расчёт цен, валидацию размеров, промокоды, создание заказов, идемпотентность и серверный пересчёт. Для тестов заказов используется временный `DATA_DIR` и `PAYMENT_PROVIDER=none`.

## Структура

```
src/app/                 страницы, API-роуты, SEO-файлы
src/components/          UI, секции, корзина, checkout, заказ
src/config/              бренд, цены, каталог, боксы, промокоды
src/lib/                 цены, БД, заказы, загрузки, платежи, корзина
tests/                   Vitest
scripts/generate-art.mjs генерация демо-ассетов
public/images/           демо-изображения
```

## Перед публикацией

1. Заполните реквизиты в `src/config/site.ts` и юридические страницы.
2. Подтвердите цены, состав наборов, сроки и условия возврата.
3. Настройте HTTPS, `NEXT_PUBLIC_SITE_URL`, `ADMIN_TOKEN` и секреты оплаты.
4. Подключите постоянное хранилище для `DATA_DIR` и резервное копирование.
5. Замените in-memory rate limiting на общий store, если инстансов больше одного.
6. Проверьте webhook и оплату тестовой картой в тестовом контуре ЮKassa.
