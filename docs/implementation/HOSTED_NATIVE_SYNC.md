# Hosted Native Sync

Native Tauri clients can share public posts through the hosted portfolio API at
`https://bkspc.app` without receiving the server's Turso credentials.

## Boundary

- The WebView sends only a Tauri command invocation.
- Rust loads the user's Nostr key from `KeyStore`.
- Rust creates a NIP-98 kind `27235` proof over the exact request bytes.
- The server keeps Turso, R2, and Stream credentials.
- The private key is never returned to JavaScript or written into an HTTP log.

## Local-first flow

1. `create_post` writes the post to the local SQLite database immediately.
2. The post receives a stable UUID `postUid` and a durable hosted outbox row.
3. The sync worker pulls hosted rows into `hosted_posts`, a separate read cache.
4. Due outbox rows are signed and pushed to `/api/portfolio/post`.
5. A successful acknowledgement creates a binding so the author's own post is
   not shown twice.
6. Network failures leave the local post available and retry the same `postUid`.

Hosted rows use negative, JavaScript-safe local IDs and do not create local
users, grant WB/karma, or enter the local `posts` table. Likes, replies, reposts,
and follows on hosted rows are read-only in this first phase.

## Configuration

The default endpoint is `https://bkspc.app`. Override it for a local mock only:

```text
BLKSPACE_API_URL=http://127.0.0.1:3000
BLKSPACE_CLOUD_SYNC=0
```

`BLKSPACE_ALLOW_DIRECT_TURSO=1` is a debug-only escape hatch for the embedded
Turso development replica. It is disabled unless the binary is a debug build and
the flag is explicitly set. Never put `TURSO_DATABASE_URL` or
`TURSO_AUTH_TOKEN` in a native client.

## Current limits

- Native media hashes are local-only; native media is not pushed until a
  Rust-side R2/Stream upload flow exists.
- The first pull caches the newest hosted page (up to 100 rows).
- Hosted rows are read-only until authenticated interaction endpoints exist.
- The server keeps legacy `id` response aliases for the deployed browser client.
