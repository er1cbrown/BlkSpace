.PHONY: dev build lint typecheck test format clean setup ci

# The pnpm workspace root is ./Code-Companion; all node/pnpm commands run from there.
CC := Code-Companion

dev:
	cd $(CC) && pnpm tauri dev

dev-web:
	cd $(CC) && pnpm dev

build:
	cd $(CC) && pnpm build

build-tauri:
	cd $(CC)/artifacts/blkspace && pnpm tauri build

lint:
	cd $(CC) && pnpm lint

typecheck:
	cd $(CC) && pnpm typecheck

test:
	cd $(CC) && pnpm test

test-watch:
	cd $(CC) && pnpm test -- --watch

format:
	cd $(CC) && pnpm format

format-check:
	cd $(CC) && pnpm format:check

clean:
	rm -rf $(CC)/artifacts/*/dist $(CC)/artifacts/*/node_modules
	rm -rf $(CC)/artifacts/blkspace/src-tauri/target
	rm -rf $(CC)/node_modules $(CC)/lib/*/node_modules $(CC)/lib/*/dist

setup:
	cd $(CC) && pnpm install
	cargo install tauri-cli --version "^2"

ci: lint typecheck test build

.PHONY: lint-ci typecheck-ci
lint-ci: lint format-check
typecheck-ci: typecheck
