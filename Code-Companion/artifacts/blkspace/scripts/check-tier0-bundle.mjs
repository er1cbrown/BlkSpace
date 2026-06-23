#!/usr/bin/env node
/**
 * Tier 0 JS bundle budget gate — runs after `pnpm build:tier0`.
 * Fails CI when entry or total JS gzip exceeds configured limits.
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const assetsDir = join(root, "dist/public/assets");

/** Entry chunk gzip budget (index-*.js) — see docs/tier0-load-optimization.md */
const ENTRY_BUDGET_KB = 420;
/** Total JS assets gzip budget (all chunks) */
const TOTAL_JS_BUDGET_KB = 2800;

const skipBuild = process.argv.includes("--skip-build");

function gzipKb(filePath) {
  const raw = readFileSync(filePath);
  return gzipSync(raw).length / 1024;
}

if (!skipBuild) {
  execSync("pnpm build:tier0", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PORT: "24442", BASE_PATH: "/" },
  });
}

let files;
try {
  files = readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`Missing build output: ${assetsDir}`);
  process.exit(1);
}

let totalKb = 0;
let entryKb = 0;
const rows = [];

for (const file of files.sort()) {
  const path = join(assetsDir, file);
  const kb = gzipKb(path);
  totalKb += kb;
  if (/^index-/.test(file)) entryKb += kb;
  rows.push({ file, kb: kb.toFixed(1), rawKb: (statSync(path).size / 1024).toFixed(1) });
}

console.log("\nTier 0 bundle report (gzip KB):");
for (const row of rows) {
  console.log(`  ${row.file.padEnd(36)} gzip ${row.kb.padStart(7)}  raw ${row.rawKb}`);
}
console.log(`\n  Entry (index-*.js): ${entryKb.toFixed(1)} KB / ${ENTRY_BUDGET_KB} KB`);
console.log(`  Total JS:           ${totalKb.toFixed(1)} KB / ${TOTAL_JS_BUDGET_KB} KB`);

let failed = false;
if (entryKb > ENTRY_BUDGET_KB) {
  console.error(`\nFAIL: entry gzip ${entryKb.toFixed(1)} KB exceeds ${ENTRY_BUDGET_KB} KB`);
  failed = true;
}
if (totalKb > TOTAL_JS_BUDGET_KB) {
  console.error(`\nFAIL: total JS gzip ${totalKb.toFixed(1)} KB exceeds ${TOTAL_JS_BUDGET_KB} KB`);
  failed = true;
}

if (failed) process.exit(1);
console.log("\nPASS: Tier 0 bundle within budget.");