#!/usr/bin/env bash
# Local-validator smoke tests for bkspc Anchor program.
set -euo pipefail
cd "$(dirname "$0")/.."

export ANCHOR_PROVIDER_URL="${ANCHOR_PROVIDER_URL:-http://127.0.0.1:8899}"
export ANCHOR_WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"

echo "Building bkspc program..."
cargo build-sbf --manifest-path programs/bkspc/Cargo.toml

VALIDATOR_PID=""
cleanup() {
  if [[ -n "${VALIDATOR_PID}" ]]; then
    kill "${VALIDATOR_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if ! curl -s "${ANCHOR_PROVIDER_URL}" >/dev/null 2>&1; then
  echo "Starting solana-test-validator..."
  solana-test-validator --reset --quiet &
  VALIDATOR_PID=$!
  sleep 5
fi

KEYPAIR_SRC="tests/fixtures/bkspc-program-keypair.json"
KEYPAIR_DST="target/deploy/bkspc-keypair.json"
mkdir -p target/deploy
if [[ -f "${KEYPAIR_SRC}" ]]; then
  cp "${KEYPAIR_SRC}" "${KEYPAIR_DST}"
else
  echo "Missing ${KEYPAIR_SRC} — generate with: solana-keygen new -o ${KEYPAIR_SRC}"
  exit 1
fi

echo "Deploying program..."
solana program deploy target/deploy/bkspc.so \
  --program-id "${KEYPAIR_DST}" \
  --url "${ANCHOR_PROVIDER_URL}"

echo "Running anchor tests..."
pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 tests/bkspc.ts