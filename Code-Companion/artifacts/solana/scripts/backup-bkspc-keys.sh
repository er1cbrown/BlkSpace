#!/usr/bin/env bash
# Back up BKSPC / Solana dev keyfiles with a password you choose.
# No GPG required — uses openssl (built into macOS).
#
#   pnpm --filter @workspace/solana run backup-bkspc-keys

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEVNET_DIR="$ROOT/devnet"

DEFAULT_OUT="${BKSPC_BACKUP_DIR:-$HOME/BlkSpace-key-backups}"
OUT_DIR="${1:-$DEFAULT_OUT}"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  BKSPC — back up your Solana key files"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "WHY: setup created secret .json files on this computer."
echo "     They are NOT in git. If this machine dies, you lose mint control."
echo ""
echo "TWO KINDS OF KEYS:"
echo "  • Deployer wallet  (~/.config/solana/id.json)"
echo "      You also have a 12-word seed phrase — write that on PAPER."
echo "      Paper alone can restore the deployer wallet."
echo "  • Treasury signers A & B  (devnet/treasury-signer-*.json)"
echo "      Random keys — NO seed phrase. You MUST copy these files."
echo ""
echo "This script bundles everything into ONE password-locked file."
echo "Pick a password you will remember (or store in a password manager)."
echo ""

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

FILES=()
add_if_exists() {
  if [[ -f "$1" ]]; then
    FILES+=("$1")
    echo "  ✓ $1"
  else
    echo "  − skip (not found yet): $1"
  fi
}

echo "Files to include:"
add_if_exists "$HOME/.config/solana/id.json"
add_if_exists "$DEVNET_DIR/treasury-signer-a.json"
add_if_exists "$DEVNET_DIR/treasury-signer-b.json"
add_if_exists "$DEVNET_DIR/treasury-manifest.json"
add_if_exists "$DEVNET_DIR/bkspc-mint.json"

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo ""
  echo "Nothing to back up yet. Run setup first:"
  echo "  pnpm --filter @workspace/solana run setup-bkspc-devnet"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$OUT_DIR/bkspc-keys-$STAMP.tar.gz"
ENCRYPTED="$ARCHIVE.enc"

echo ""
tar czf "$ARCHIVE" "${FILES[@]}"

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl not found. Leaving unencrypted archive (move somewhere safe, then delete):"
  echo "  $ARCHIVE"
  chmod 600 "$ARCHIVE"
  exit 0
fi

echo "Enter a backup password (you will need it to restore):"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$ARCHIVE" -out "$ENCRYPTED"
rm -f "$ARCHIVE"
chmod 600 "$ENCRYPTED"

echo ""
echo "Done."
echo "  Encrypted backup: $ENCRYPTED"
echo ""
echo "Store that .enc file on USB, iCloud Drive, or another machine."
echo "Do NOT commit it to GitHub."
echo ""
echo "Restore later (pick a folder, then enter the same password):"
echo "  mkdir -p ~/blkspace-restore && cd ~/blkspace-restore"
echo "  openssl enc -d -aes-256-cbc -pbkdf2 -in \"$ENCRYPTED\" -out restore.tar.gz"
echo "  tar xzf restore.tar.gz"
echo ""