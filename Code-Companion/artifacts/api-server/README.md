# api-server (demo only)

Express mock API for local/web experiments. **Not** the product auth path — Yard ships via Tauri local IPC.

## Write lock (default)

Mutating routes (`POST`/`PATCH`/`DELETE`) return **403** unless:

```bash
export API_SERVER_ALLOW_WRITES=1
# optional shared secret:
export API_SERVER_TOKEN=dev-secret
# then: Authorization: Bearer dev-secret
```

## CORS

Defaults to `http://localhost:24442`. Override with:

```bash
export API_SERVER_CORS_ORIGIN=http://localhost:24442,http://127.0.0.1:24442
```

## Run

```bash
cd Code-Companion
PORT=3000 bun run --filter @workspace/api-server dev
```
