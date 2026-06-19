.PHONY: dev build lint typecheck test format clean setup

dev:
	pnpm tauri dev

dev-web:
	pnpm dev

build:
	pnpm build

build-tauri:
	pnpm tauri build

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

test-watch:
	pnpm test -- --watch

format:
	pnpm format

format-check:
	pnpm format:check

clean:
	rm -rf dist src-tauri/target node_modules

setup:
	pnpm install
	cargo install tauri-cli --version "^2"

ci: lint typecheck test build

.PHONY: lint-ci typecheck-ci
lint-ci: lint format-check
typecheck-ci: typecheck
