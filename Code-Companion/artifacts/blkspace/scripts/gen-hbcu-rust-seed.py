#!/usr/bin/env python3
"""Generate Rust seed data from hbcu-catalog.ts for SQLite hbcus table."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG_TS = ROOT / "src" / "lib" / "hbcu-catalog.ts"
OUT_RS = ROOT / "src-tauri" / "src" / "hbcu_catalog_seed.rs"


def main() -> None:
    text = CATALOG_TS.read_text(encoding="utf-8")
    pat = re.compile(
        r'id:\s*"([^"]+)",\s*'
        r'school:\s*"((?:\\.|[^"\\])*)",\s*'
        r'shortName:\s*"((?:\\.|[^"\\])*)",\s*'
        r'city:\s*"((?:\\.|[^"\\])*)",\s*'
        r'state:\s*"([^"]+)",\s*'
        r"founded:\s*(\d+),\s*"
        r'control:\s*"(public|private)",\s*'
        r'yardLabel:\s*"((?:\\.|[^"\\])*)"'
    )
    rows = pat.findall(text)
    if len(rows) < 90:
        raise SystemExit(f"Expected ~103 HBCUs, got {len(rows)}")

    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace('"', '\\"')

    lines: list[str] = []
    lines.append("//! Auto-generated from src/lib/hbcu-catalog.ts — do not edit by hand.")
    lines.append("//! Regenerate: python scripts/gen-hbcu-rust-seed.py")
    lines.append("")
    lines.append("/// One HBCU institution for SQLite seed / directory.")
    lines.append("#[derive(Debug, Clone, Copy)]")
    lines.append("pub struct HbcuSeed {")
    lines.append("  pub id: &'static str,")
    lines.append("  pub school: &'static str,")
    lines.append("  pub short_name: &'static str,")
    lines.append("  pub city: &'static str,")
    lines.append("  pub state: &'static str,")
    lines.append("  pub founded: i32,")
    lines.append("  pub control: &'static str, // public | private")
    lines.append("  pub yard_label: &'static str,")
    lines.append("}")
    lines.append("")
    lines.append(f"/// Full catalog ({len(rows)} institutions).")
    lines.append("pub const HBCU_SEED: &[HbcuSeed] = &[")
    for sid, school, short, city, state, founded, control, yard in rows:
        lines.append("  HbcuSeed {")
        lines.append(f'    id: "{esc(sid)}",')
        lines.append(f'    school: "{esc(school)}",')
        lines.append(f'    short_name: "{esc(short)}",')
        lines.append(f'    city: "{esc(city)}",')
        lines.append(f'    state: "{esc(state)}",')
        lines.append(f"    founded: {founded},")
        lines.append(f'    control: "{esc(control)}",')
        lines.append(f'    yard_label: "{esc(yard)}",')
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("pub fn hbcu_seed_count() -> usize {")
    lines.append("  HBCU_SEED.len()")
    lines.append("}")
    lines.append("")

    OUT_RS.parent.mkdir(parents=True, exist_ok=True)
    OUT_RS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    max_id = max(len(r[0]) for r in rows)
    print(f"wrote {OUT_RS} ({len(rows)} rows, max id len={max_id})")


if __name__ == "__main__":
    main()
