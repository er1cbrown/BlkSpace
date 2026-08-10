# Research summary — TempleOS → rustytempleOS

**Source:** deep-research-2 (2026-08) · **Status:** Partial (architecture clear; full boot path not line-audited)  
**Project stance:** Non-1:1 Rust reimplementation of *selected* goals — not a HolyC line translation, not a BlkSpace feature.

---

## Doctrine (confirmed)

| Do | Don’t |
|----|--------|
| Reimplement **goals**: tiny machine, interactive language, RedSea-class store, 640×480-class UI | 1:1 HolyC source dump as “Rust” |
| Use **existing** boot/host tools (QEMU, Limine/`bootloader`, phil-opp path, `x86_64-unknown-none`) | Rebuild every dependency from zero |
| **BlkSpace discipline**: Tier 0 / hosted first, honest tracks, student-doable slices | Merge OS into BlkSpace monorepo product |
| **rustyTempleLang** as phased language (interpreter → later JIT) | Full TempleOS compiler bootstrap day one |
| Separate GitHub-backed releases later | Claim BlkSpace *is* the OS |

TempleOS is **public domain** (sources on distro); study/port of original is community-normal. Your *Rust* code stays MIT (this tree). Credit Davis; name carefully (not “official TempleOS”).

---

## TempleOS layers (what “robust + small” means)

| Layer | Reality |
|-------|---------|
| **Kernel** | x86-64, cooperative multitasking, ring-0-only, shared address space, no net stack |
| **Boot story** | Early init → load Compiler binary → JIT `StartOS.HC` under immortal **Adam** → WM → home |
| **RedSea** | 64-bit FS: 64-byte dir entries, bitmap alloc, 512 B/cluster, contiguous files, `.Z` compress |
| **HolyC** | Language **and** shell: JIT/AOT native, line-by-line compile, no classic linker lifestyle |
| **DolDoc** | Unified doc/UI (`$..$` markup) shared by editor, shell, source |
| **Graphics** | Fixed **640×480**, 16-color class stack |

Hard boundary for rewrites: stock sources compile under TempleOS’s own compiler; bootstrap is dual binary+source.

---

## Existing tech to lean on

| Need | Existing pieces |
|------|-----------------|
| Learn freestanding Rust | [Writing an OS in Rust](https://os.phil-opp.com/) (VGA → interrupts → heap → async cooperative tasks) |
| Target | `x86_64-unknown-none` (Tier 2 bare metal) |
| Run | QEMU / VirtualBox (stock TempleOS path too) |
| HolyC ecosystem (optional study) | Aiwnios, SchismC, HolyC-for-Linux — **not** required to invent rustyTempleLang |
| HolyC forks (C lineage) | ZealOS, TinkerOS — PD + mix of bootloaders (e.g. Limine) |

**Reuse infrastructure. Own:** shell culture, rustyTempleLang surface, size budget, RedSea-*lite* design.

---

## Student-doable vs lifetime

| Slice | Realistic |
|-------|-----------|
| Hosted shell + VFS (current tree) | Weeks |
| Bootable `no_std` hello + serial/VGA in QEMU | Weeks–months (follow phil-opp) |
| Cooperative tasks + heap | Months |
| RedSea-inspired FS **or** FAT bridge first | Months |
| rustyTempleLang subset on **hosted**, then kernel | Months |
| Full DolDoc + Adam + games + dual compiler bootstrap | **Multi-year / team** |

---

## Milestone map (aligns with `docs/ROADMAP.md`)

1. **M0** Freestanding scaffold + QEMU smoke  
2. **M1** Serial/VGA, memory, interrupts, heap  
3. **M2** Cooperative tasks (TempleOS-like voluntary yield)  
4. **M3** Storage (RedSea-inspired **or** host FAT/ISO first)  
5. **M4** HolyC-env / **rustyTempleLang** compile-run (subset)  
6. **M5** 640×480-class FB + DolDoc-lite  
7. **M6** Shell + few demos  
8. **M7** Optional hosted/WASM demo for BlkSpace *rail only* — not core identity  

---

## BlkSpace relationship

- BlkSpace **rejects** owning a custom OS product.  
- rustytempleOS = **your** systems app.  
- BlkSpace may later **showcase** demos (Hub/Play/tickets) — “his app, yard rail.”  
- Do not merge kernel into Tauri product scope.

---

## Uncertainties (research honesty)

- Full BIOS/El Torito boot path not line-audited.  
- Naming/trademark risk for “TempleOS”/“HolyC” labels not fully assessed — prefer **rustytempleOS** / **rustyTempleLang**.  
- LLM-on-OS ideas in weixinfo are aspirational; not a ship gate.  
- Local weixinfo “rebuild TempleOS in Rust” note is research export, not formal charter — **this tree + ROADMAP is charter**.
