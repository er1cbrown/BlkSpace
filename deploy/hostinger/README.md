# BlkSpace on the existing Hostinger VPS

Target verified on 2026-09-23: KVM 2, Docker Compose, host-network Traefik with a Docker provider, `websecure` entry point and `letsencrypt` HTTP-challenge resolver. Hermes already runs separately. This compose adds only BlkSpace. The application uses host networking but binds to `127.0.0.1`; Traefik reaches it over the host loopback, so no public application port is opened.

## Application

The production container serves the built React application and `/api/portfolio/*`, `/api/media/upload-target`, and `/api/health`. It does not run Vite. Server dependencies are bundled; runtime image contains only the server and public frontend, not source files or `.env`.

Writes use NIP-98 proofs signed with the user's existing browser Nostr key. Post handles are bound to keys on first cloud post, and post ownership is enforced. A new device needs the encrypted backup plus password, or the recovery phrase. Posts wait for Turso acknowledgement and active feeds refresh every five seconds. Hosted attachments must be HTTPS URLs; the browser-local blob store is not a cross-device store. Likes/follows remain browser-local and are not part of this deployment's shared-state claim.

## Deploy on the VPS

From a repository checkout, enter `deploy/hostinger`. Create `.env` using `.env.example`, transfer credentials privately, and restrict it to its owner (`chmod 600 .env`). The file is gitignored and excluded from the Docker image.

```sh
docker compose -p blkspace build
docker compose -p blkspace up -d
docker compose -p blkspace ps
```

The build uses Bun inside Docker **on the VPS**. It does not require Bun on the host. Existing repository-wide TypeScript/test failures are separate release blockers; this image performs the same frontend build that succeeded in the Pages job plus the server bundle. Run focused server/frontend tests before deployment.

Initial URL: `https://blkspace.srv1946189.hstgr.cloud` (verified to resolve to the VPS). Traefik also has routes prepared for `bkspc.app` and `www.bkspc.app`; those become reachable when their DNS records point to the VPS. Traefik requests TLS and forwards to the application through host loopback. No new public port is published.

To move to `bkspc.app`, first change that domain's website A records to the VPS's IPv4 address, remove conflicting website A/AAAA records, and retain email/TXT records. The Compose service already includes production-domain routers and allowed origins; once DNS resolves to the VPS, sign in/restore backup on the new origin because browser storage is origin-specific. Do not overwrite the existing Traefik deployment.

In R2 bucket CORS, include the exact application origins for `PUT`/`GET` and allow the `Content-Type` header. Stream needs Account → Stream → Edit scoped to the account, and Stream must be enabled. Changing a token requires `docker compose -p blkspace up -d --force-recreate blkspace` to reload the environment.

## Verify

1. `/api/health` responds with JSON; `/api/portfolio/posts` responds with shared rows.
2. Unsigned writes return 401; unknown `/api/*` paths return JSON 404, not the SPA.
3. On three independent browsers, create distinct identities, join the same yard, and post in both directions. Observe the five-second refresh, then reload.
4. Upload an image and video, wait for video processing, and play on the other devices.
5. Close the uploading laptop: cloud posts/media must remain accessible.

The health endpoint is process liveness, not a claim that Turso/Cloudflare permissions are healthy. Use the actual posts/upload tests to verify dependencies. Do not record physical-device checks as passing based only on HTTP or unit tests.
