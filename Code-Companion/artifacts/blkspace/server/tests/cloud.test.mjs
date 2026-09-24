import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { createApp } from "../server.mjs";

const origin = "https://demo.example.test";
const alice = generateSecretKey();
const bob = generateSecretKey();
const actualFetch = globalThis.fetch;
const db = new Database(":memory:");
let server, base, dir;
let failSql = false;
let sqlCalls = 0;

function authorization(route, body, key = alice, overrides = {}) {
  const event = finalizeEvent(
    {
      kind: 27235,
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["u", origin + route],
        ["method", "POST"],
        ["payload", createHash("sha256").update(body).digest("hex")],
      ],
      ...overrides,
    },
    key,
  );
  return `Nostr ${Buffer.from(JSON.stringify(event)).toString("base64")}`;
}

function post(route, body, key = alice, overrides = {}) {
  const raw = JSON.stringify(body);
  return fetch(base + route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: authorization(route, raw, key, overrides),
    },
    body: raw,
  });
}

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "blkspace-server-"));
  await writeFile(
    path.join(dir, "index.html"),
    "<!doctype html><h1>BlkSpace</h1>",
  );
  globalThis.fetch = async (url, options) => {
    if (String(url) === "https://test.turso/v2/pipeline") {
      sqlCalls++;
      if (failSql)
        return Response.json({
          results: [{ type: "error", error: { code: "SQL_ERROR" } }],
        });
      const stmt = JSON.parse(options.body).requests[0].stmt;
      const rows = db
        .query(stmt.sql)
        .all(
          ...stmt.args.map((a) =>
            a.type === "integer" ? Number(a.value) : a.value,
          ),
        );
      const names = rows.length ? Object.keys(rows[0]) : [];
      return Response.json({
        results: [
          {
            type: "ok",
            response: {
              type: "execute",
              result: {
                cols: names.map((name) => ({ name })),
                rows: rows.map((row) =>
                  names.map((name) => ({ type: "text", value: row[name] })),
                ),
              },
            },
          },
        ],
      });
    }
    if (String(url).startsWith("https://api.cloudflare.com/")) {
      return Response.json(
        { success: false, errors: [{ message: "Authorization Failure" }] },
        { status: 403 },
      );
    }
    return actualFetch(url, options);
  };
  server = createApp({
    publicDir: dir,
    origins: [origin],
    env: {
      TURSO_DATABASE_URL: "libsql://test.turso",
      TURSO_AUTH_TOKEN: "test-only",
      CLOUDFLARE_ACCOUNT_ID: "test-account",
      CLOUDFLARE_API_TOKEN: "test-only",
      R2_ACCESS_KEY_ID: "test-access",
      R2_SECRET_ACCESS_KEY: "test-secret",
      R2_BUCKET: "test",
      R2_PUBLIC_BASE_URL: "https://media.example.test",
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  globalThis.fetch = actualFetch;
  await new Promise((resolve) => server.close(resolve));
  db.close();
  await rm(dir, { recursive: true });
});

describe("standalone cloud server", () => {
  test("serves deep links, health, and JSON API 404s", async () => {
    expect(await (await fetch(base + "/feed")).text()).toContain("BlkSpace");
    expect((await (await fetch(base + "/api/health")).json()).ok).toBe(true);
    const missing = await fetch(base + "/api/unknown");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("content-type")).toBe("application/json");
    expect((await fetch(base + "/assets/missing.js")).status).toBe(404);
    expect((await fetch(base + "/.env")).status).toBe(404);
  });

  test("unsigned writes are rejected before database access", async () => {
    const before = sqlCalls;
    const r = await fetch(base + "/api/portfolio/post", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(r.status).toBe(401);
    expect(sqlCalls).toBe(before);
  });

  test("a signed post from one identity is visible to independent readers", async () => {
    const r = await post("/api/portfolio/post", {
      id: 1001,
      authorHandle: "alice",
      content: "hello from A",
      townTag: "tsu",
      mediaBlobs: [],
    });
    expect(r.status).toBe(200);
    for (let reader = 0; reader < 2; reader++) {
      const b = await (await fetch(base + "/api/portfolio/posts")).json();
      expect(b.rows).toHaveLength(1);
      expect(b.rows[0].content).toBe("hello from A");
    }
  });

  test("native postUid is idempotent and paginated", async () => {
    const body = {
      postUid: "native-alice-12345678",
      authorHandle: "alice",
      content: "hello from native",
      townTag: "tsu",
      channelId: "general",
      mediaBlobs: [],
    };
    const first = await post("/api/portfolio/post", body, alice);
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(firstBody.postUid).toBe(body.postUid);
    expect(firstBody.remoteId).toBeTruthy();

    const retry = await post("/api/portfolio/post", body, alice);
    expect(retry.status).toBe(200);
    expect((await retry.json()).remoteId).toBe(firstBody.remoteId);

    const changed = await post(
      "/api/portfolio/post",
      { ...body, content: "changed" },
      alice,
    );
    expect(changed.status).toBe(409);

    const page = await (
      await fetch(`${base}/api/portfolio/posts?town=tsu&limit=1`)
    ).json();
    expect(page.rows[0].postUid).toBeTruthy();
    expect(page.serverTime).toBeTruthy();
    db.run("DELETE FROM portfolio_posts WHERE post_uid = ?", [body.postUid]);
  });

  test("retrying a signed post does not duplicate it", async () => {
    const r = await post("/api/portfolio/post", {
      id: 1001,
      authorHandle: "alice",
      content: "hello from A",
      townTag: "tsu",
    });
    expect(r.status).toBe(200);
    expect(
      (await (await fetch(base + "/api/portfolio/posts")).json()).rows,
    ).toHaveLength(1);
  });

  test("another key cannot claim Alice's handle or overwrite her post", async () => {
    expect(
      (
        await post(
          "/api/portfolio/post",
          { id: 1002, authorHandle: "alice", content: "fake", townTag: "tsu" },
          bob,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await post(
          "/api/portfolio/post",
          {
            id: 1001,
            authorHandle: "bob",
            content: "overwrite",
            townTag: "tsu",
          },
          bob,
        )
      ).status,
    ).toBe(409);
    expect(
      (await (await fetch(base + "/api/portfolio/posts")).json()).rows[0]
        .content,
    ).toBe("hello from A");
  });

  test("legacy posts remain readable and cannot be overwritten", async () => {
    db.run(
      "INSERT INTO portfolio_posts (id, author_handle, content, town_tag, media_blobs) VALUES (10, 'legacy', 'keep me', 'tsu', '[]')",
    );
    const r = await post(
      "/api/portfolio/post",
      { id: 10, authorHandle: "bob", content: "overwrite", townTag: "tsu" },
      bob,
    );
    expect(r.status).toBe(409);
    expect(
      db.query("SELECT content FROM portfolio_posts WHERE id=10").get().content,
    ).toBe("keep me");
  });

  test("Turso HTTP-200 SQL errors are not reported as saved", async () => {
    failSql = true;
    try {
      const r = await post(
        "/api/portfolio/post",
        { id: 1003, authorHandle: "bob", content: "not saved", townTag: "tsu" },
        bob,
      );
      expect(r.status).toBe(502);
      expect((await r.json()).ok).toBe(false);
    } finally {
      failSql = false;
    }
  });

  test("stale, cross-origin and payload-tampered proofs are rejected", async () => {
    expect(
      (await post("/api/portfolio/post", {}, alice, { created_at: 1 })).status,
    ).toBe(401);
    const raw = "{}";
    const valid = authorization("/api/portfolio/post", raw);
    expect(
      (
        await fetch(base + "/api/portfolio/post", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: valid },
          body: '{"tampered":true}',
        })
      ).status,
    ).toBe(401);
    const wrong = authorization("/api/portfolio/post", raw, alice, {
      tags: [
        ["u", "https://wrong.test/api/portfolio/post"],
        ["method", "POST"],
        ["payload", createHash("sha256").update(raw).digest("hex")],
      ],
    });
    expect(
      (
        await fetch(base + "/api/portfolio/post", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: wrong },
          body: raw,
        })
      ).status,
    ).toBe(401);
  });

  test("cloud posts refuse browser-only attachments", async () => {
    expect(
      (
        await post("/api/portfolio/post", {
          id: 1004,
          authorHandle: "alice",
          content: "local file",
          townTag: "tsu",
          mediaBlobs: ["web_local"],
        })
      ).status,
    ).toBe(400);
  });

  test("authenticated R2 targets and actionable Stream errors", async () => {
    const image = await post("/api/media/upload-target", {
      filename: "photo.jpg",
      mime: "image/jpeg",
      size: 5,
    });
    expect(image.status).toBe(200);
    const target = await image.json();
    expect(target.provider).toBe("r2");
    expect(target.uploadUrl).toContain("X-Amz-Signature");
    expect(target.headers["content-type"]).toBe("image/jpeg");
    expect(target.secretAccessKey).toBeUndefined();
    const unsafe = await post("/api/media/upload-target", {
      filename: "unsafe.svg",
      mime: "image/svg+xml",
      size: 5,
    });
    expect(unsafe.status).toBe(400);
    const hostedImage = await post("/api/portfolio/post", {
      id: 1005,
      authorHandle: "alice",
      content: "hosted image",
      townTag: "tsu",
      mediaBlobs: ["https://media.example.test/photo.jpg"],
    });
    expect(hostedImage.status).toBe(200);
    db.run("DELETE FROM portfolio_posts WHERE id = 1005");
    const untrustedImage = await post("/api/portfolio/post", {
      id: 1006,
      authorHandle: "alice",
      content: "untrusted image",
      townTag: "tsu",
      mediaBlobs: ["https://evil.example/photo.jpg"],
    });
    expect(untrustedImage.status).toBe(400);
    const audio = await post("/api/media/upload-target", {
      filename: "voice.mp3",
      mime: "audio/mpeg",
      size: 5,
    });
    expect(audio.status).toBe(200);
    expect((await audio.json()).headers["content-type"]).toBe("audio/mpeg");
    const pdf = await post("/api/media/upload-target", {
      filename: "notes.pdf",
      mime: "application/pdf",
      size: 5,
    });
    expect(pdf.status).toBe(200);
    expect((await pdf.json()).headers["content-type"]).toBe("application/pdf");
    const mismatched = await post("/api/media/upload-target", {
      filename: "notes.pdf",
      mime: "audio/mpeg",
      size: 5,
    });
    expect(mismatched.status).toBe(400);
    const oversizedAudio = await post("/api/media/upload-target", {
      filename: "voice.mp3",
      mime: "audio/mpeg",
      size: 25 * 1024 * 1024 + 1,
    });
    expect(oversizedAudio.status).toBe(400);
    const unsupported = await post("/api/media/upload-target", {
      filename: "payload.exe",
      mime: "application/octet-stream",
      size: 5,
    });
    expect(unsupported.status).toBe(400);
    const video = await post("/api/media/upload-target", {
      filename: "clip.mp4",
      mime: "video/mp4",
      size: 5,
    });
    expect(video.status).toBe(502);
    expect((await video.json()).error).toContain(
      "Stream authorization failed (403)",
    );

    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith("https://api.cloudflare.com/")) {
        return Response.json({
          success: true,
          result: {
            uid: "stream-test-uid",
            uploadURL: "https://upload.videodelivery.net/stream-test",
          },
        });
      }
      return previousFetch(url, options);
    };
    try {
      const stream = await post("/api/media/upload-target", {
        filename: "clip.mp4",
        mime: "video/mp4",
        size: 5,
      });
      expect(stream.status).toBe(200);
      const streamTarget = await stream.json();
      expect(streamTarget.provider).toBe("stream");
      expect(streamTarget.method).toBe("POST");
      expect(streamTarget.publicUrl).toBe(
        "https://iframe.videodelivery.net/stream-test-uid",
      );
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
