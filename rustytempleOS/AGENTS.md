# AGENTS.md — rustytempleOS

## Project
Educational Rust OS / systems lab. Inspired by TempleOS simplicity. **Not** BlkSpace.

## Focus rule
**Primary active tree.** Do not expand BlkSpace DevOps (CI, signing, Pages, multi-OS installers) unless the user explicitly resumes BlkSpace work.

## Rules
1. Prefer hosted (Phase 1–2) before freestanding kernel  
2. No `unsafe` without a comment why  
3. No vendoring TempleOS binaries; clean-room + public docs only  
4. No AI/LLM product features in this OS  
5. Keep the shell tiny and documented  

## Commands
```bash
cargo run -p rtos-shell
cargo test -p rtos-shell
```
