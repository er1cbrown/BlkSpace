import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { HttpError } from "./http.mjs";

const TTL_MS = 2 * 60 * 60 * 1000;
const FILE_OK = /^(index\.m3u8|seg_\d{1,6}\.ts)$/;

function handleOf(value) {
  const handle = String(value || "")
    .trim()
    .replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,32}$/.test(handle)) return "member";
  return handle;
}

function yardOf(value) {
  const yard = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9_-]{1,32}$/.test(yard)) {
    throw new HttpError(400, "Pick a yard.");
  }
  return yard;
}

function titleOf(value) {
  const title = String(value || "").trim().slice(0, 80);
  return title || "RTMP ingest";
}

function idOf() {
  return `rtmp_${randomBytes(8).toString("hex")}`;
}

/** ffmpeg on PATH, or FFMPEG_PATH. Empty when this host cannot ingest. */
export function findFfmpeg() {
  const fromEnv = String(process.env.FFMPEG_PATH || "").trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const finder = process.platform === "win32" ? "where.exe" : "which";
  try {
    const out = execFileSync(finder, ["ffmpeg"], { encoding: "utf8" });
    const line = out
      .split(/\r?\n/)
      .map((row) => row.trim())
      .find(Boolean);
    if (line && existsSync(line)) return line;
  } catch {
    return "";
  }
  return "";
}

function killChild(child) {
  if (!child) return;
  const pid = Number(child.pid) || 0;
  try {
    child.kill();
  } catch {
    /* already gone */
  }
  if (process.platform === "win32" && pid > 10) {
    try {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    } catch {
      /* the process already exited */
    }
  }
}

/**
 * One RTMP listener on this process. OBS publishes to 127.0.0.1.
 * ffmpeg remuxes that publish to HLS. The yard serves the playlist.
 * The stream key stays off the public session.
 */
export function createRtmpIngest(options = {}) {
  const port = Number(options.port) || 1935;
  const ffmpeg = options.ffmpeg ?? findFfmpeg();
  const spawnImpl = options.spawn ?? spawn;
  const workRoot =
    options.workRoot || path.join(os.tmpdir(), "blkspace-rtmp");
  const settleMs = Number.isFinite(options.settleMs) ? options.settleMs : 400;
  const sessions = new Map();

  function publicSession(session) {
    return {
      id: session.id,
      yardId: session.yardId,
      hostHandle: session.hostHandle,
      title: session.title,
      createdAt: session.createdAt,
      publishServer: `rtmp://127.0.0.1:${port}/live`,
      playbackPath: `/api/yards/rtmp/media/${session.id}/index.m3u8`,
      live: session.live,
    };
  }

  function hostSession(session) {
    return { ...publicSession(session), streamKey: session.streamKey };
  }

  function drop(session) {
    session.live = false;
    sessions.delete(session.id);
    rmSync(session.dir, { recursive: true, force: true });
  }

  function prune() {
    const now = Date.now();
    for (const session of sessions.values()) {
      if (now - session.startedAt < TTL_MS) continue;
      killChild(session.child);
      drop(session);
    }
  }

  function must(id) {
    prune();
    const session = sessions.get(String(id || ""));
    if (!session) throw new HttpError(404, "That ingest has ended.");
    return session;
  }

  return {
    list(yard) {
      prune();
      const name = yardOf(yard);
      return [...sessions.values()]
        .filter((session) => session.yardId === name && session.live)
        .map(publicSession);
    },

    read(id) {
      return publicSession(must(id));
    },

    async start(body, pubkey) {
      prune();
      if (!pubkey) throw new HttpError(401, "Sign in to open an ingest.");
      if ([...sessions.values()].some((session) => session.live)) {
        throw new HttpError(429, "This PC already has an RTMP ingest open.");
      }
      if (!ffmpeg) throw new HttpError(503, "ffmpeg is not on this host.");
      const yardId = yardOf(body.yardId);
      const hostHandle = handleOf(body.handle);
      const title = titleOf(body.title);
      const id = idOf();
      const streamKey = randomBytes(16).toString("hex");
      const dir = path.join(workRoot, id);
      mkdirSync(dir, { recursive: true });
      const child = spawnImpl(
        ffmpeg,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-listen",
          "1",
          "-timeout",
          String(Math.floor(TTL_MS / 1000)),
          "-i",
          `rtmp://127.0.0.1:${port}/live/${streamKey}`,
          "-c",
          "copy",
          "-f",
          "hls",
          "-hls_time",
          "2",
          "-hls_list_size",
          "6",
          "-hls_flags",
          "delete_segments+append_list+omit_endlist",
          "-hls_segment_filename",
          "seg_%03d.ts",
          "index.m3u8",
        ],
        { cwd: dir, windowsHide: true, stdio: "ignore" },
      );
      const session = {
        id,
        yardId,
        hostHandle,
        hostPubkey: pubkey,
        title,
        createdAt: new Date().toISOString(),
        streamKey,
        dir,
        child,
        live: true,
        startedAt: Date.now(),
      };
      sessions.set(id, session);
      child.on?.("error", () => {
        session.live = false;
      });
      child.on?.("exit", () => {
        if (sessions.get(id) === session) drop(session);
      });
      if (settleMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, settleMs));
      }
      if (!sessions.has(id) || child.exitCode != null) {
        if (sessions.has(id)) drop(session);
        throw new HttpError(
          503,
          "RTMP ingest did not start. Port " + port + " may already be in use.",
        );
      }
      return hostSession(session);
    },

    end(body, pubkey) {
      const session = must(body.sessionId);
      if (session.hostPubkey !== pubkey) {
        throw new HttpError(403, "Only the ingest host can end this publish.");
      }
      killChild(session.child);
      drop(session);
      return { ended: true, id: session.id };
    },

    media(id, file) {
      const name = String(file || "");
      if (!FILE_OK.test(name)) {
        throw new HttpError(400, "That media file is not a playlist segment.");
      }
      const session = must(id);
      const root = path.resolve(session.dir);
      const full = path.resolve(root, name);
      if (!full.startsWith(root + path.sep)) {
        throw new HttpError(400, "That media file is not a playlist segment.");
      }
      if (!existsSync(full)) {
        throw new HttpError(404, "Waiting for the publish.");
      }
      return {
        mime: name.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : "video/mp2t",
        body: readFileSync(full),
      };
    },
  };
}
