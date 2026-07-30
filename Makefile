SHELL := /bin/bash

.PHONY: install dev build lint preview docker-build docker-up docker-down docker-logs

install:
	pnpm install --frozen-lockfile

dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

preview:
	pnpm preview

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f
