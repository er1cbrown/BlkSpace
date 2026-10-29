import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { HttpError } from "./http.mjs";

/** Same four modules as the typeverse reader. Text stays in the local library. */
export const TYPEVERSE_SWORD_MODULES = ["KJV", "GNT", "RVG", "SpaRV"];

const exec = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../scripts/logos-sword.py",
);

function pythonBins() {
  const venv = path.join(homedir(), "Desktop", "typeverse", ".venv");
  return [
    process.env.BLKSPACE_SWORD_PYTHON,
    path.join(venv, "Scripts", "python.exe"),
    path.join(venv, "bin", "python"),
    "python",
    "python3",
  ].filter(Boolean);
}

/**
 * Ask the local SWORD library for up to eight verses.
 * Missing pysword or a SWORD home becomes status 503. Restricted modules are
 * read in place and are not written into the repo.
 */
export async function readSwordVerses(module, refs) {
  if (!TYPEVERSE_SWORD_MODULES.includes(module)) {
    throw new HttpError(
      400,
      "That SWORD module is not one of the typeverse four.",
    );
  }
  const list = [
    ...new Set(
      (refs || []).map((ref) => String(ref || "").trim()).filter(Boolean),
    ),
  ].slice(0, 8);
  if (!list.length) throw new HttpError(400, "Name a verse.");
  const swordHome = process.env.SWORD_HOME || path.join(homedir(), ".sword");
  let last = null;
  for (const bin of pythonBins()) {
    try {
      const { stdout } = await exec(bin, [script, module, ...list], {
        timeout: 4000,
        maxBuffer: 256 * 1024,
        env: { ...process.env, SWORD_HOME: swordHome },
        windowsHide: true,
      });
      const parsed = JSON.parse(stdout);
      return {
        ok: true,
        module,
        verses: Array.isArray(parsed?.verses) ? parsed.verses : [],
      };
    } catch (err) {
      last = err;
      if (err?.code === "ENOENT" || err?.code === 2 || err?.status === 2)
        continue;
      break;
    }
  }
  const missing = new HttpError(503, "SWORD library is not on this host.");
  missing.cause = last;
  throw missing;
}
