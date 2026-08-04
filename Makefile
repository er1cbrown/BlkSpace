.PHONY: dev build lint typecheck test format clean setup ci

# The Bun workspace root is ./Code-Companion; all bun commands run from there.
CC := Code-Companion
export PATH := $(HOME)/.bun/bin:$(PATH)

dev:
	cd $(CC) && bun run --filter @workspace/blkspace tauri:dev

dev-web:
	cd $(CC) && bun run dev

build:
	cd $(CC) && bun run build

build-tauri:
	cd $(CC)/artifacts/blkspace && bun run tauri build

lint:
	cd $(CC) && bun run lint

typecheck:
	cd $(CC) && bun run typecheck

test:
	cd $(CC) && bun run test

test-watch:
	cd $(CC)/artifacts/blkspace && bun run test -- --watch

format:
	cd $(CC) && bun run format

format-check:
	cd $(CC) && bun run format:check

clean:
	rm -rf $(CC)/artifacts/*/dist $(CC)/artifacts/*/node_modules
	rm -rf $(CC)/artifacts/blkspace/src-tauri/target
	rm -rf $(CC)/node_modules $(CC)/lib/*/node_modules $(CC)/lib/*/dist

setup:
	cd $(CC) && bun install
	cargo install tauri-cli --version "^2"

ci: lint typecheck test build

.PHONY: lint-ci typecheck-ci
lint-ci: lint format-check
typecheck-ci: typecheck
