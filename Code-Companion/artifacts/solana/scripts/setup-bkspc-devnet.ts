/**
 * Full devnet setup: treasury multisig → BKSPC mint → transfer mint authority to treasury.
 *
 *   pnpm --filter @workspace/solana run setup-bkspc-devnet
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

function run(script: string): void {
  execSync(`tsx ${join(dir, script)}`, {
    stdio: "inherit",
    env: process.env,
  });
}

run("init-treasury-devnet.ts");
run("init-bkspc-devnet-mint.ts");

console.log("\n--- Next: back up your keys (plain-English script) ---");
console.log("  pnpm --filter @workspace/solana run backup-bkspc-keys");
console.log("Treasury signers have NO seed phrase — file backup is required.\n");