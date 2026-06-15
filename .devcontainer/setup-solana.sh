#!/bin/bash
set -e

echo "=== Solana CLI ==="
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.zshrc

echo "=== Anchor CLI ==="
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

echo "=== Tauri Linux deps ==="
sudo apt-get update -qq && sudo apt-get install -y -qq \
  libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev

echo "=== Solana + Anchor ready ==="
solana --version
anchor --version
