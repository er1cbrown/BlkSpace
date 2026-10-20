import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

/** Same four modules as ~/Desktop/typeverse/typeverse.py. */
export const TYPEVERSE_SWORD_MODULES = ["KJV", "GNT", "RVG", "SpaRV"];

const exec = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../scripts/logos-sword.py",
);

function pythonBins() {
  return [
    process.env.BLKSPACE_SWORD_PYTHON,
    path.join(homedir(), "Desktop/typeverse/.venv/bin/python"),
    "python3",
  ].filter(Boolean);
}

/**
 * Ask the local SWORD library for up to eight verses.
 * Missing pysword or ~/.sword becomes status 503. Restricted modules are
 * read in place and are not written into the repo.
 */
export async function readSwordVerses(module, refs) {
  if (!TYPEVERSE_SWORD_MODULES.includes(module)) {
    const err = new Error(
      "That SWORD module is not one of the typeverse four.",
    );
    err.status = 400;
    throw err;
  }
  const list = [
    ...new Set(
      (refs || []).map((ref) => String(ref || "").trim()).filter(Boolean),
    ),
  ].slice(0, 8);
  if (!list.length) {
    const err = new Error("Name a verse.");
    err.status = 400;
    throw err;
  }
  const swordHome = process.env.SWORD_HOME || path.join(homedir(), ".sword");
  let last = null;
  for (const bin of pythonBins()) {
    try {
      const { stdout } = await exec(bin, [script, module, ...list], {
        timeout: 20000,
        maxBuffer: 256 * 1024,
        env: { ...process.env, SWORD_HOME: swordHome },
      });
      return JSON.parse(stdout);
    } catch (err) {
      last = err;
      if (err?.code === "ENOENT" || err?.code === 2) continue;
      break;
    }
  }
  const err = new Error("SWORD library is not on this host.");
  err.status = 503;
  err.cause = last;
  throw err;
}
