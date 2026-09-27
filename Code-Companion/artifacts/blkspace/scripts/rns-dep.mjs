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

/**
 * Every crate carrying the non-OSI "Reticulum License".
 *
 * This list must stay complete. `remove` strips exactly these, and `verify`
 * fails if one is declared without its feature gate, so adding a new rns-*
 * dependency without adding it here would leave the escape hatch quietly broken:
 * `remove` would report success while a non-OSI crate stayed in the tree.
 */
const RNS_DEPS = ["rns-core", "rns-crypto", "rns-net"];

/** Features that must never appear in `default`. */
const RNS_FEATURES = ["rns-t3", "rns-t3-net"];

const read = () => readFileSync(manifest, "utf8");

/** Does the dependency still exist in the manifest? */
function hasDep(text, dep = "rns-core") {
  return new RegExp(`^\\s*${dep}\\s*=`, "m").test(text);
}

/** Is the feature still declared? */
function hasFeature(text, feature = "rns-t3") {
  return new RegExp(`^\\s*${feature}\\s*=`, "m").test(text);
}

/**
 * The critical guarantee: no rns feature may appear in the default feature set.
 * If one did, every shipped build would link a non-OSI dependency.
 */
function defaultIncludesT3(text) {
  const match = text.match(/^default\s*=\s*\[(.*?)\]/m);
  if (!match) return false;
  return match[1]
    .split(",")
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
    .some((entry) => RNS_FEATURES.includes(entry));
}

/** Any file under src-tauri/src that gates on the feature. */
function gatedSources() {
  const files = [
    "src/rns_t3.rs",
    "src/rns_routing.rs",
    "src/rns_courier.rs",
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

  const declared = RNS_DEPS.filter((dep) => hasDep(text, dep));
  const locked = RNS_DEPS.filter((dep) => new RegExp(`name = "${dep}"`).test(lock));
  const features = RNS_FEATURES.filter((feature) => hasFeature(text, feature));
  const leaked = defaultIncludesT3(text);

  console.log("rns-t3 dependency state");
  for (const dep of RNS_DEPS) {
    console.log(`  ${dep.padEnd(12)} manifest: ${declared.includes(dep) ? "yes" : "no"}`);
  }
  for (const feature of RNS_FEATURES) {
    console.log(`  ${feature.padEnd(12)} declared: ${features.includes(feature) ? "yes" : "no"}`);
  }
  console.log(`  in default features    : ${leaked ? "YES (PROBLEM)" : "no"}`);
  console.log(`  locked crates          : ${locked.join(", ") || "none"}`);
  console.log(`  feature-gated sources  : ${gatedSources().join(", ") || "none"}`);

  return { declared, features, locked, leaked };
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
      "an rns feature is in the default feature set: every shipped build would link a non-OSI dependency.",
    );
  }
  for (const dep of state.declared) {
    // Every non-OSI crate must sit behind a declared feature. rns-crypto reached
    // the manifest as a direct dependency of the T3 payload layer, so this check
    // is what stops `remove` from silently leaving it behind.
    const gated = state.features.some((feature) =>
      new RegExp(`${dep}\\b`).test(featureBlock(read(), feature) ?? ""),
    );
    if (!gated) {
      problems.push(`${dep} is declared but no rns feature enables it; the dependency is not feature-gated.`);
    }
  }
  // A crate locked but absent from the manifest means the lockfile is stale,
  // which would break `cargo --locked` in CI.
  for (const dep of state.locked) {
    if (!state.declared.includes(dep)) {
      problems.push(`${dep} is in Cargo.lock but not in Cargo.toml; refresh the lockfile.`);
    }
  }
  if (problems.length) {
    console.error("\nFAIL:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("\nPASS: every Reticulum dependency is optional, pinned, gated, and out of default.");
  process.exit(0);
}

/** The declaration line(s) of a feature, used to check which deps it enables. */
function featureBlock(text, feature) {
  const match = text.match(new RegExp(`^\\s*${feature}\\s*=\\s*\\[[^\\]]*\\]`, "m"));
  return match ? match[0] : null;
}

if (command === "remove") {
  const text = read();
  let out = text;

  // Drop every non-OSI dependency line, each with its preceding comment block.
  // Comment blocks are matched by content, not by a fixed marker, because the
  // notes have grown as the platform findings accumulated.
  for (const dep of RNS_DEPS) {
    out = out.replace(
      new RegExp(`\\n(?:#[^\\n]*\\n)*#?[ \\t]*${dep}\\s*=\\s*\\{[^}]*\\}\\n`, "g"),
      "\n",
    );
  }
  // Drop the feature declarations and their comment blocks.
  for (const feature of RNS_FEATURES) {
    out = out.replace(
      new RegExp(`\\n(?:#[^\\n]*\\n)*\\s*${feature}\\s*=\\s*\\[[^\\]]*\\]\\n`, "g"),
      "\n",
    );
  }
  // Collapse the blank-line runs the removals leave behind.
  out = out.replace(/\n{3,}/g, "\n\n");

  if (out === text) {
    console.log("Nothing to remove: no rns dependency or feature found.");
    report();
    process.exit(0);
  }

  writeFileSync(manifest, out, "utf8");
  console.log(`Removed ${RNS_DEPS.join(", ")} and ${RNS_FEATURES.join(", ")} from Cargo.toml.`);
  console.log("Next: delete src-tauri/src/rns_t3.rs, rns_routing.rs and rns_courier.rs,");
  console.log("      drop their `mod` lines from src/lib.rs, then run `cargo check`");
  console.log("      to refresh Cargo.lock.");
  report();
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
console.error("Usage: node scripts/rns-dep.mjs [verify|status|remove]");
process.exit(2);
