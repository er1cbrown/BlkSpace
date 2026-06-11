# BlkSpace — First Launch

## Ready out the box
- `node`, `pnpm`, `rustc`, `opencode`, `git` — all set
- Just run `opencode` to start coding

## Optional: install Solana + Anchor (for blockchain dev)
```bash
bash .devcontainer/setup-solana.sh
```

## Verify everything
```bash
node --version
pnpm --version
rustc --version
opencode --version
```

## Start dev
```bash
pnpm dev          # web preview
pnpm tauri dev    # desktop preview (after scaffold)
```
