import { EventEmitter } from "node:events";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { createRtmpIngest, findFfmpeg } from "../rtmp-ingest.mjs";

function fakeSpawn() {
  const calls = [];
  const spawnImpl = (cmd, args) => {
    const child = new EventEmitter();
    child.pid = 1;
    child.exitCode = null;
    child.kill = () => {
      child.exitCode = 0;
      child.emit("exit", 0);
    };
    calls.push({ cmd, args });
    return child;
  };
  return { spawnImpl, calls };
}

function harness() {
  const { spawnImpl, calls } = fakeSpawn();
  const workRoot = mkdtempSync(path.join(tmpdir(), "blkspace-rtmp-"));
  const rtmp = createRtmpIngest({
    spawn: spawnImpl,
    ffmpeg: "ffmpeg",
    port: 1935,
    workRoot,
    settleMs: 0,
  });
  return { rtmp, calls, workRoot };
}

describe("yard RTMP ingest", () => {
  test("the public session omits the stream key", async () => {
    const { rtmp } = harness();
    const opened = await rtmp.start(
      { yardId: "tsu", title: "Homecoming", handle: "host" },
      "pubkey-host",
    );
    expect(opened.streamKey).toMatch(/^[0-9a-f]{32}$/);
    expect(opened.publishServer).toBe("rtmp://127.0.0.1:1935/live");
    const listed = rtmp.list("tsu");
    expect(listed).toHaveLength(1);
    expect(JSON.stringify(listed)).not.toContain(opened.streamKey);
    expect(JSON.stringify(rtmp.read(opened.id))).not.toContain(opened.streamKey);
    expect(listed[0].playbackPath).toBe(
      `/api/yards/rtmp/media/${opened.id}/index.m3u8`,
    );
  });

  test("a guest cannot end the publish and a second ingest waits", async () => {
    const { rtmp } = harness();
    const opened = await rtmp.start(
      { yardId: "tsu", title: "Lab", handle: "host" },
      "pubkey-host",
    );
    expect(() => rtmp.end({ sessionId: opened.id }, "pubkey-guest")).toThrow(
      /Only the ingest host/,
    );
    await expect(
      rtmp.start({ yardId: "tsu", title: "Other", handle: "host" }, "pubkey-host"),
    ).rejects.toThrow(/already has an RTMP ingest/);
    rtmp.end({ sessionId: opened.id }, "pubkey-host");
    expect(() => rtmp.read(opened.id)).toThrow(/ended/);
  });

  test("rejects a file that is not a playlist segment", async () => {
    const { rtmp, workRoot } = harness();
    const opened = await rtmp.start(
      { yardId: "tsu", title: "Lab", handle: "host" },
      "pubkey-host",
    );
    expect(() => rtmp.media(opened.id, "../secret")).toThrow(/playlist segment/);
    expect(() => rtmp.media(opened.id, "index.m3u8.txt")).toThrow(
      /playlist segment/,
    );
    expect(() => rtmp.media(opened.id, "index.m3u8")).toThrow(/Waiting/);
    writeFileSync(path.join(workRoot, opened.id, "index.m3u8"), "#EXTM3U\n");
    const file = rtmp.media(opened.id, "index.m3u8");
    expect(file.mime).toBe("application/vnd.apple.mpegurl");
    expect(file.body.toString()).toContain("#EXTM3U");
  });

  test("refuses to listen when ffmpeg is missing", async () => {
    const rtmp = createRtmpIngest({
      ffmpeg: "",
      settleMs: 0,
      workRoot: mkdtempSync(path.join(tmpdir(), "blkspace-rtmp-")),
    });
    await expect(
      rtmp.start({ yardId: "tsu", title: "Lab", handle: "host" }, "pubkey-host"),
    ).rejects.toThrow(/ffmpeg is not on this host/);
  });

  test("ffmpeg accepts one publish and writes a playlist", async () => {
    const ffmpeg = findFfmpeg();
    if (!ffmpeg) return;
    const workRoot = mkdtempSync(path.join(tmpdir(), "blkspace-rtmp-live-"));
    const rtmp = createRtmpIngest({
      ffmpeg,
      port: 19361,
      workRoot,
      settleMs: 500,
    });
    const opened = await rtmp.start(
      { yardId: "tsu", title: "Smoke", handle: "host" },
      "pubkey-host",
    );
    expect(JSON.stringify(rtmp.list("tsu"))).not.toContain(opened.streamKey);
    const publisher = spawn(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-re",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=160x120:rate=15",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=44100",
        "-t",
        "4",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-tune",
        "zerolatency",
        "-pix_fmt",
        "yuv420p",
        "-g",
        "15",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-f",
        "flv",
        `rtmp://127.0.0.1:19361/live/${opened.streamKey}`,
      ],
      { windowsHide: true, stdio: "ignore" },
    );
    try {
      let playlist = "";
      for (let i = 0; i < 20; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        try {
          playlist = rtmp.media(opened.id, "index.m3u8").body.toString();
        } catch {
          playlist = "";
        }
        if (playlist.includes("seg_")) break;
      }
      expect(playlist).toContain("seg_");
      expect(playlist).not.toContain(opened.streamKey);
    } finally {
      try {
        publisher.kill();
      } catch {
        /* publisher already finished */
      }
      try {
        rtmp.end({ sessionId: opened.id }, "pubkey-host");
      } catch {
        /* the publish already closed the listener */
      }
    }
  }, 20000);
});
