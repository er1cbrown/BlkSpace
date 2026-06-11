# BlkSpace — First Launch

Everything's pre-installed. Run these to verify:

```bash
# Check tools
rustc --version
node --version
pnpm --version
opencode --version
solana --version
openclaw --version        # will say "run onboard" if not configured yet
```

## Open Code

```bash
opencode run "what's the next step for blkspace?"
# or just
opencode
```

## Open Claw (first time setup)

```bash
openclaw onboard
```

## Start dev server

```bash
pnpm dev     # web preview
pnpm tauri dev   # desktop preview (after scaffold)
```

## Daily workflow

1. `git pull` — get latest
2. `pnpm lint && pnpm typecheck` — quality gate
3. Code
4. `git push` — triggers CI

## Disk-saving tips (Codespaces auto-cleans)

```
pnpm config set store-dir /tmp/pnpm-store   # already set
cargo clean     # if target/ gets bloated
```
