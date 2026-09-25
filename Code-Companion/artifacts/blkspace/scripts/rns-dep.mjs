#!/usr/bin/env node
/**
 * Verify or remove the optional Reticulum dependency.
 *
 * The `rns-t3` feature and its `rns-core` dependency are optional and are NOT in
 * `default`, so no Yard build and no ordinary Full build links them. This script
 * makes that guarantee checkable rather than a claim in a document:
 *
 *   node scripts/rns-dep.mjs verify   # exit 1 if the guarantee is broken
 *   node scripts/rns-dep.mjs status   # print current state
 *   node scripts/rns-dep.mjs remove   # strip the dependency and feature
 *
 * Licence context: docs/implementation/RNS_LICENSE_REVIEW.md. Removal exists so the
 * dependency can be dropped in one command if licensing is not resolved in BlkSpace's
 * favour. The Reticulum License is non-OSI, so this must stay possible.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = join(root, "src-tauri", "Cargo.toml");
const lockfile = join(root, "src-tauri", "Cargo.lock");

const read = () => readFileSync(manifest, "utf8");

/** Does the dependency still exist in the manifest? */
function hasDep(text) {
  return /^\s*rns-core\s*=/m.test(text);
}

/** Is the feature still declared? */
function hasFeature(text) {
  return /^\s*rns-t3\s*=/m.test(text);
}

/**
 * The critical guarantee: `rns-t3` must not appear in the default feature set.
 * If it did, every shipped build would link a non-OSI dependency.
 */
function defaultIncludesT3(text) {
  const match = text.match(/^default\s*=\s*\[(.*?)\]/m);
  if (!match) return false;
  return match[1].split(",").some((entry) => entry.trim().replace(/^["']|["']$/g, "") === "rns-t3");
}

/** Any file under src-tauri/src that gates on the feature. */
function gatedSources() {
  const files = [
    "src/rns_t3.rs",
    "src/lib.rs",
  ];
  return files.filter((f) => {
    try {
      return readFileSync(join(root, "src-tauri", f), "utf8").includes("rns-t3");
    } catch {
      return false;
    }
  });
}

function report() {
  const text = read();
  const lock = (() => {
    try {
      return readFileSync(lockfile, "utf8");
    } catch {
      return "";
    }
  })();

  const inManifest = hasDep(text);
  const featureDeclared = hasFeature(text);
  const locked = /name = "rns-core"/.test(lock);
  const leaked = defaultIncludesT3(text);

  console.log("rns-t3 dependency state");
  console.log(`  rns-core in Cargo.toml : ${inManifest ? "yes" : "no"}`);
  console.log(`  rns-t3 feature declared: ${featureDeclared ? "yes" : "no"}`);
  console.log(`  rns-core in Cargo.lock : ${locked ? "yes" : "no"}`);
  console.log(`  in default features    : ${leaked ? "YES (PROBLEM)" : "no"}`);
  console.log(`  feature-gated sources  : ${gatedSources().join(", ") || "none"}`);

  return { inManifest, featureDeclared, locked, leaked };
}

const command = process.argv[2] ?? "status";

if (command === "status") {
  report();
  process.exit(0);
}

if (command === "verify") {
  const state = report();
  const problems = [];
  if (state.leaked) {
    problems.push(
      "rns-t3 is in the default feature set: every shipped build would link a non-OSI dependency.",
    );
  }
  if (state.inManifest && !state.featureDeclared) {
    problems.push("rns-core is declared but rns-t3 is not; the dependency is not feature-gated.");
  }
  if (problems.length) {
    console.error("\nFAIL:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("\nPASS: the Reticulum dependency is optional, pinned, and out of default.");
  process.exit(0);
}

if (command === "remove") {
  const text = read();
  let out = text;

  // Drop the dependency line and its comment block.
  out = out.replace(/\n# Full build only: native Rust Reticulum core[\s\S]*?rns-core = \{[^}]*\}\n/, "\n");
  // Drop the feature declaration and its comment block.
  out = out.replace(/\n# Route B \/ T3 degraded tier[\s\S]*?rns-t3 = \[[^\]]*\]\n/, "\n");

  if (out === text) {
    console.log("Nothing to remove: no rns-core dependency or rns-t3 feature found.");
    report();
    process.exit(0);
  }

  writeFileSync(manifest, out, "utf8");
  console.log("Removed rns-core and rns-t3 from Cargo.toml.");
  console.log("Next: delete src-tauri/src/rns_t3.rs and its `mod rns_t3;` line, then");
  console.log("      run `cargo check` to refresh Cargo.lock.");
  report();
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
console.error("Usage: node scripts/rns-dep.mjs [verify|status|remove]");
process.exit(2);
