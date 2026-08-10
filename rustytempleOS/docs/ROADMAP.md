# rustytempleOS roadmap

**Active focus.** BlkSpace DevOps / feature velocity is paused by choice; this tree is primary craft.

## Research

Architecture + legal + milestones distilled: [`RESEARCH-SUMMARY.md`](RESEARCH-SUMMARY.md) (deep-research-2).

## Phase 0 — Scaffold ✅

- [x] Directory + Cargo workspace  
- [x] Hosted shell crate `rtos-shell`  
- [x] README · non-goals · BlkSpace relationship  
- [x] Research summary linked  

## Phase 1 — Hosted playground (current)

- [x] REPL: help, about, echo, version  
- [ ] In-memory VFS (RedSea-*inspired* simple tree)  
- [ ] Tiny framebuffer / “pixel console” (optional terminal canvas or minifb later)  
- [ ] One mini “app” command (e.g. `snake` or `fortune`)  

## Phase 2 — Hosted FS image

- [ ] `.img` file format + create/read  
- [ ] Persist shell history / tiny scripts  

## Phase 3 — Kernel lab (Track K)

- [ ] Separate `rtos-kernel` crate `#![no_std]`  
- [ ] Boot via Limine or `bootloader` crate → QEMU  
- [ ] Serial or VGA text hello  
- [ ] Keyboard input  

## Phase 4 — Interaction

- [ ] Heap + basic allocator  
- [ ] Shell ported to freestanding (subset of hosted commands)  

## Phase 5 — Language (Track L, optional)

- [ ] HolyC-*inspired* expression subset interpreter  
- [ ] JIT only if interpreter is solid (cranelift later)  

## Never required for “success”

- Full DolDoc clone  
- Full RedSea bit-identical compatibility  
- Full TempleOS game suite  
- AI features  
