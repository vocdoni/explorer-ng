SHELL := /bin/bash

.PHONY: install dev build lint test preview docker-build docker-up docker-down docker-logs

install:
	pnpm install --frozen-lockfile

dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

test:
	pnpm test

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
