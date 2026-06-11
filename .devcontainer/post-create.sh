#!/bin/bash
set -e

echo "=== Installing pnpm ==="
npm install -g pnpm@latest

echo "=== Installing OpenCode ==="
npm install -g @opencode-ai/cli

echo "=== pnpm store in /tmp (saves disk) ==="
pnpm config set store-dir /tmp/pnpm-store 2>/dev/null || true

echo ""
echo "=== Ready ==="
echo "node:  $(node --version)"
echo "pnpm:  $(pnpm --version)"
echo "rustc: $(rustc --version 2>/dev/null | head -1 || echo 'not loaded')"
echo "opencode: $(opencode --version 2>/dev/null || echo 'ok')"
echo ""
echo "Optional tools (run when needed):"
echo "  bash .devcontainer/setup-solana.sh   # Solana + Anchor"
