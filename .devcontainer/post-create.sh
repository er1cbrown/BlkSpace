#!/bin/bash
set -e

echo "=== Installing OpenCode ==="
npm install -g @opencode-ai/cli

echo "=== Installing Solana CLI ==="
sh -c "$(curl -sSfL https://release.solana.com/stable/install)" 2>/dev/null
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "=== Installing Anchor CLI ==="
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force 2>/dev/null || true
avm install latest 2>/dev/null || true
avm use latest 2>/dev/null || true

echo "=== Setting up Tauri system deps ==="
sudo apt-get update -qq && sudo apt-get install -y -qq \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev 2>/dev/null || true

echo "=== pnpm store (saves disk) ==="
pnpm config set store-dir /tmp/pnpm-store 2>/dev/null || true

echo "=== Installing OpenClaw ==="
npm install -g openclaw@latest 2>/dev/null || true

echo "=== Dev environment ready ==="
code --version 2>/dev/null | head -1
rustc --version
node --version
pnpm --version
opencode --version
openclaw --version 2>/dev/null || echo "openclaw: installed (run 'openclaw onboard' to configure)"
