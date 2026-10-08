/**
 * Full devnet setup: treasury → BKSPC mint → deploy & wire the bkspc Anchor program,
 * then the Token-2022 settlement/staking/governance path.
 *
 *   bun run --filter @workspace/solana setup-bkspc-devnet
 *
 * Run order matters: `initialize_convert` pins the `minter` and the supply `cap`, so it
 * must happen after the program is on devnet and the Token-2022 mint exists.
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
run("wire-bkspc-program-devnet.ts");

// Token-2022 path: settlement + staking + governance. Wrapped because it needs a funded
// deployer and a Token-2022 mint; a failure here must not hide the state of the legacy
// path above, which is already wired by this point.
try {
  run("init-bkspc-token2022-devnet.ts");
  run("wire-bkspc-token2022-convert.ts");
} catch (err) {
  console.error(
    "\n[setup] Token-2022 settlement path did not complete:",
    err instanceof Error ? err.message : err,
  );
  console.error(
    "[setup] The legacy SPL settlement path is still wired. Re-run " +
      "init-bkspc-token2022-devnet and wire-bkspc-token2022-convert once funded.",
  );
}

console.log("\n--- Next: back up your keys (plain-English script) ---");
console.log("  bun run --filter @workspace/solana backup-bkspc-keys");
console.log(
  "Treasury signers have NO seed phrase, and devnet/minter.json is the only key\n" +
    "permitted to mint BKSPC. Both need a file backup.\n",
);