FROM oven/bun:1.3.14 AS build
WORKDIR /build
COPY Code-Companion/ ./
RUN bun install --frozen-lockfile
WORKDIR /build/artifacts/blkspace
ENV NODE_ENV=production BASE_PATH=/
RUN bun run build && bun run build:server

FROM build AS verify
# Vitest's workers need real Node; Bun's fallback node wrapper cannot run them.
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
ENV NODE_ENV=test
RUN bun run test:server && bun run test:run src/test/remote-media.test.ts src/test/web-posts-cloud.test.ts src/test/auth.test.ts src/test/use-app-data.test.tsx --maxWorkers=1 --minWorkers=1

FROM oven/bun:1.3.14-slim
WORKDIR /app
COPY --from=verify --chown=bun:bun /build/artifacts/blkspace/dist/public ./public
COPY --from=verify --chown=bun:bun /build/artifacts/blkspace/dist/server.mjs ./server.mjs
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 PUBLIC_DIR=/app/public
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD bun -e 'const r=await fetch("http://127.0.0.1:3000/api/health");process.exit(r.ok?0:1)'
CMD ["bun", "server.mjs"]
