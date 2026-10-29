import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { HttpError } from "./http.mjs";

const exec = promisify(execFile);

function pythonBins() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const candidates = [
    process.env.BLKSPACE_HOMEWORK_PYTHON,
    home && path.join(home, "miniconda3", "bin", "python"),
    home && path.join(home, "miniconda3", "python.exe"),
    "python",
    "python3",
  ].filter(Boolean);
  return candidates;
}

export async function runHomeworkCell(lang, source) {
  const normalized = String(lang || "").trim().toLowerCase();
  if (normalized !== "python" && normalized !== "r") {
    throw new HttpError(400, "Only Python and R cells run here.");
  }
  const code = String(source || "");
  if (!code.trim()) throw new HttpError(400, "That cell is empty.");
  if (code.length > 8000) throw new HttpError(400, "That cell is too long.");

  const dir = await mkdtemp(path.join(tmpdir(), "blkspace-ide-"));
  const ext = normalized === "r" ? "R" : "py";
  const file = path.join(dir, `cell.${ext}`);
  await writeFile(file, code);

  const bins =
    normalized === "r"
      ? ["Rscript", "Rscript.exe"]
      : pythonBins();

  let last = null;
  for (const bin of bins) {
    try {
      const { stdout, stderr } = await exec(bin, [file], {
        timeout: 8000,
        maxBuffer: 256 * 1024,
        windowsHide: true,
      });
      await rm(dir, { recursive: true, force: true });
      const out = [stdout, stderr].filter(Boolean).join("\n").trim();
      return out || "(no output)";
    } catch (err) {
      last = err;
      if (err?.code === "ENOENT") continue;
      await rm(dir, { recursive: true, force: true });
      const out = [err?.stdout, err?.stderr].filter(Boolean).join("\n").trim();
      throw new HttpError(500, out || String(err?.message || err));
    }
  }
  await rm(dir, { recursive: true, force: true });
  throw new HttpError(503, `No ${normalized} interpreter found.`);
}
