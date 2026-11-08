SHELL := /bin/bash
.DEFAULT_GOAL := help

# ── Настройки ────────────────────────────────────────────────────────────────
PORT ?= 3000
HOST ?= localhost
RUN_LOG ?= /tmp/stezhok.log
RUN_PID ?= /tmp/stezhok.pid

DOCKER_PORT ?= 3000
IMAGE ?= stezhok
CONTAINER ?= stezhok
VOLUME ?= stezhok-data

.PHONY: help setup check-tools \
	up dev start down stop restart status logs \
	build prod \
	install lint typecheck test check \
	docker-build docker-up docker-down docker-status docker-logs \
	start-dev start-prod stop-all wait-ready

# ── Справка ──────────────────────────────────────────────────────────────────
help:
	@echo "Стежок — команды проекта"
	@echo ""
	@echo "Запуск и остановка"
	@echo "  make up          запустить dev-сервер в фоне"
	@echo "  make down        остановить сервер и освободить порт"
	@echo "  make restart     перезапустить dev-сервер"
	@echo "  make status      показать, запущен ли фронт и на каком порту"
	@echo "  make logs        смотреть логи в реальном времени"
	@echo ""
	@echo "Production"
	@echo "  make build       собрать проект"
	@echo "  make prod        собрать и запустить production-сервер"
	@echo ""
	@echo "Проверки"
	@echo "  make check       lint + typecheck + тесты"
	@echo "  make lint        ESLint"
	@echo "  make typecheck   TypeScript"
	@echo "  make test        Vitest"
	@echo ""
	@echo "Docker"
	@echo "  make docker-up   собрать образ и запустить контейнер"
	@echo "  make docker-down остановить и удалить контейнер"
	@echo "  make docker-logs логи контейнера"
	@echo "  make docker-status статус контейнера и порт"
	@echo ""
	@echo "Порт по умолчанию: $(PORT). Изменить: make up PORT=8080"
	@echo "Адрес: http://$(HOST):$(PORT)"

# ── Подготовка ───────────────────────────────────────────────────────────────
check-tools:
	@command -v pnpm >/dev/null 2>&1 || { echo "pnpm не найден. Установите pnpm 11+."; exit 1; }

setup: check-tools
	@pnpm install
	@if [ ! -f .env.local ] && [ -f .env.example ]; then \
		cp .env.example .env.local; \
		echo "Создан .env.local из .env.example"; \
	fi
	@echo "Готово. Запуск: make up"

install: check-tools
	@pnpm install

# ── Основные команды ─────────────────────────────────────────────────────────
up dev start: start-dev

down stop: stop-all

restart: down up

status:
	@pids="$$(lsof -ti tcp:$(PORT) 2>/dev/null || true)"; \
	if [ -n "$$pids" ]; then \
		echo "Фронт запущен: http://$(HOST):$(PORT)"; \
		echo "Порт: $(PORT)"; \
		lsof -nP -iTCP:$(PORT) -sTCP:LISTEN | sed -n '1,3p'; \
		if [ -f "$(RUN_PID)" ]; then \
			echo "PID: $$(cat "$(RUN_PID)" 2>/dev/null || echo '—')"; \
		fi; \
	else \
		echo "Фронт не запущен. Порт $(PORT) свободен."; \
	fi

logs:
	@if [ -f "$(RUN_LOG)" ]; then \
		tail -n 100 -f "$(RUN_LOG)"; \
	else \
		echo "Лог $(RUN_LOG) ещё не создан."; \
	fi

build: check-tools
	@pnpm build

prod: build
	@if lsof -ti tcp:$(PORT) >/dev/null 2>&1; then \
		echo "Порт $(PORT) уже занят. Сначала выполните: make down"; \
		exit 1; \
	fi; \
	echo "Запускаю production-сервер на http://$(HOST):$(PORT) ..."; \
	nohup pnpm start --port $(PORT) > "$(RUN_LOG)" 2>&1 & echo $$! > "$(RUN_PID)"; \
	$(MAKE) --no-print-directory wait-ready

# ── Внутренние цели ──────────────────────────────────────────────────────────
start-dev: check-tools
	@if lsof -ti tcp:$(PORT) >/dev/null 2>&1; then \
		echo "Порт $(PORT) уже занят. Ничего не запускаю."; \
		$(MAKE) --no-print-directory status; \
		exit 0; \
	fi; \
	if [ ! -d node_modules ]; then \
		echo "Устанавливаю зависимости..."; \
		pnpm install; \
	fi; \
	echo "Запускаю dev-сервер на http://$(HOST):$(PORT) ..."; \
	nohup pnpm dev --port $(PORT) > "$(RUN_LOG)" 2>&1 & echo $$! > "$(RUN_PID)"; \
	$(MAKE) --no-print-directory wait-ready

wait-ready:
	@for i in $$(seq 1 60); do \
		if curl -fsS --max-time 2 -o /dev/null "http://$(HOST):$(PORT)" 2>/dev/null; then \
			echo ""; \
			echo "Готово: http://$(HOST):$(PORT)"; \
			echo "Порт: $(PORT)"; \
			echo "Логи: make logs"; \
			echo "Остановить: make down"; \
			exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "Сервер не запустился за 60 секунд. Последние строки лога:"; \
	tail -n 30 "$(RUN_LOG)" 2>/dev/null || true; \
	exit 1

stop-all:
	@if [ -f "$(RUN_PID)" ]; then \
		pid="$$(cat "$(RUN_PID)" 2>/dev/null || true)"; \
		if [ -n "$$pid" ] && kill -0 "$$pid" 2>/dev/null; then \
			kill "$$pid" 2>/dev/null || true; \
		fi; \
		rm -f "$(RUN_PID)"; \
	fi; \
	pids="$$(lsof -ti tcp:$(PORT) 2>/dev/null || true)"; \
	if [ -n "$$pids" ]; then \
		echo "Останавливаю процессы на порту $(PORT): $$pids"; \
		kill $$pids 2>/dev/null || true; \
	fi; \
	for i in 1 2 3 4 5 6 7 8 9 10; do \
		lsof -ti tcp:$(PORT) >/dev/null 2>&1 || break; \
		sleep 0.5; \
	done; \
	pids="$$(lsof -ti tcp:$(PORT) 2>/dev/null || true)"; \
	if [ -n "$$pids" ]; then \
		kill -9 $$pids 2>/dev/null || true; \
	fi; \
	echo "Остановлено. Порт $(PORT) свободен."

# ── Проверки ─────────────────────────────────────────────────────────────────
lint:
	@pnpm lint

typecheck:
	@pnpm typecheck

test:
	@pnpm test

check: lint typecheck test

# ── Docker ───────────────────────────────────────────────────────────────────
docker-build: check-tools
	@command -v docker >/dev/null 2>&1 || { echo "docker не найден."; exit 1; }
	@docker build \
		--build-arg NEXT_PUBLIC_SITE_URL=$${NEXT_PUBLIC_SITE_URL:-http://$(HOST):$(DOCKER_PORT)} \
		-t $(IMAGE) .

docker-up: docker-build
	@if lsof -ti tcp:$(DOCKER_PORT) >/dev/null 2>&1; then \
		echo "Порт $(DOCKER_PORT) уже занят. Сначала выполните: make down"; \
		exit 1; \
	fi; \
	docker rm -f $(CONTAINER) >/dev/null 2>&1 || true; \
	env_args=""; \
	if [ -f .env.local ]; then env_args="--env-file .env.local"; fi; \
	docker run -d --name $(CONTAINER) \
		-p $(DOCKER_PORT):3000 \
		-v $(VOLUME):/data \
		$$env_args \
		-e DATA_DIR=/data \
		$(IMAGE) >/dev/null; \
	echo "Готово: http://$(HOST):$(DOCKER_PORT)"; \
	echo "Порт: $(DOCKER_PORT)"; \
	echo "Логи: make docker-logs"; \
	echo "Остановить: make docker-down"

docker-down:
	@docker stop $(CONTAINER) >/dev/null 2>&1 || true
	@docker rm $(CONTAINER) >/dev/null 2>&1 || true
	@echo "Контейнер $(CONTAINER) остановлен. Порт $(DOCKER_PORT) свободен."

docker-status:
	@if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx '$(CONTAINER)'; then \
		echo "Docker-контейнер запущен: http://$(HOST):$(DOCKER_PORT)"; \
		echo "Порт: $(DOCKER_PORT)"; \
	else \
		echo "Docker-контейнер $(CONTAINER) не запущен."; \
	fi

docker-logs:
	@docker logs -f --tail 100 $(CONTAINER)
