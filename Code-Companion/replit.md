# BlkSpace

A federated social platform built for and by HBCU college-town communities — connecting students across the network with a community-owned, economically incentivized architecture.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/blkspace run dev` — run the BlkSpace frontend (port 24442)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, shadcn/ui, Framer Motion, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Single source of truth for all API contracts
- `lib/db/src/schema/` — Database schema (users, posts, replies, relays, activity)
- `artifacts/api-server/src/routes/` — Express route handlers (users, posts, relays, network)
- `artifacts/blkspace/src/` — React frontend (pages, components, theme)
- `lib/api-client-react/src/generated/` — Auto-generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Auto-generated Zod schemas for server (do not edit)

## Architecture decisions

- Contract-first: OpenAPI spec gates all codegen; never hand-write types the codegen produces.
- Body schemas use entity-shaped names (e.g. `PostInput`, not `CreatePostBody`) to avoid Orval TS2308 collisions.
- Feed endpoint reuses posts router mounted at `/feed` for the `/feed/trending` route.
- Relay status enum: `online | degraded | offline` stored as text in DB.
- Architecture layer data is served as a static JSON response from the API (no DB table needed).

## Product

- `/` — Landing page: "The Digital Yard" hero, mission, protocol stack, WeixBucks economy, relay network
- `/feed` — Social feed with Local Yard and Trending tabs, post composer with town tag selector
- `/posts/:id` — Single post thread with replies
- `/profile/:handle` — User profiles with WeixBucks balance, stats, and post history
- `/relays` — Relay network dashboard: node grid, live uptime, events/hr, connected peers, activity feed
- `/architecture` — Interactive architecture explainer: 5-layer protocol stack, design principles, security model

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after any OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- Always run `pnpm --filter @workspace/db run push` after schema changes
- Do not edit generated files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/`
- The `feed` router is re-mounted at both `/posts` and `/feed` paths in `routes/index.ts`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
