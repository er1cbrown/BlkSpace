#!/usr/bin/env bash
# Deploy bkspc Anchor program to devnet (requires anchor + solana CLI).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v anchor >/dev/null 2>&1; then
  echo "anchor CLI not found. Install: https://www.anchor-lang.com/docs/installation"
  exit 1
fi

solana config set --url devnet
anchor build
anchor deploy --provider.cluster devnet

echo "Deployed. Update program id in Anchor.toml + programs/bkspc/src/lib.rs when using a non-placeholder id."