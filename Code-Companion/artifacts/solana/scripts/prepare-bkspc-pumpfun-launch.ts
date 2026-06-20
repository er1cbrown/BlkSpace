/**
 * Prepare BKSPC for launch on pump.fun.
 *
 * Pump.fun does not have a public API, so this script prepares the metadata
 * and outputs the exact values to paste into the pump.fun launch form.
 *
 * Usage:
 *   pnpm --filter @workspace/solana exec tsx scripts/prepare-bkspc-pumpfun-launch.ts
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  external_url: string;
}

function main(): void {
  const metadataPath = join(ROOT, "metadata", "bkspc-token.json");
  const metadata: TokenMetadata = JSON.parse(
    readFileSync(metadataPath, "utf8"),
  );

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  BKSPC — pump.fun launch prep");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("Paste these values into https://pump.fun/create:\n");
  console.log(`Name:        ${metadata.name}`);
  console.log(`Symbol:      ${metadata.symbol}`);
  console.log(`Description: ${metadata.description}`);
  console.log(`Website:     ${metadata.external_url}`);
  console.log("Image:       Upload the BlkSpace logo (replace blank image field)\n");

  console.log("Expected costs (mainnet SOL):");
  console.log("  ~0.02 SOL  token creation + bonding curve");
  console.log("  + optional SOL for initial buys / market cap\n");

  console.log("Next steps:");
  console.log("  1. Visit https://pump.fun");
  console.log("  2. Connect your Solana wallet");
  console.log("  3. Click 'Create' and paste the values above");
  console.log("  4. Upload the BlkSpace logo image");
  console.log("  5. Submit and sign the transaction");
  console.log("  6. Save the mint address from the success page\n");

  console.log("After launch, update:");
  console.log("  - docs/bkspc-pumpfun-launch.md with the mint address");
  console.log("  - Code-Companion/artifacts/solana/devnet/bkspc-mint.json if mirroring");
  console.log("  - Wallet UI to display the live BKSPC mint\n");
}

main();
