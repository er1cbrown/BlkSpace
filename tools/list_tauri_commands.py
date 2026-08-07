#!/usr/bin/env python3
"""Inventory Tauri #[tauri::command] handlers for review / authz audits.

Usage (from repo root):
  python3 tools/list_tauri_commands.py
  python3 tools/list_tauri_commands.py --csv
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIB_RS = (
    ROOT
    / "Code-Companion"
    / "artifacts"
    / "blkspace"
    / "src-tauri"
    / "src"
    / "lib.rs"
)

CMD_RE = re.compile(r"#\[tauri::command\]\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)", re.M)
# crude session-token detection in the following ~15 lines after the fn signature
SESSION_HINT = re.compile(
    r"session_token|get_handle_from_session|check_session_rate_limit", re.I
)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", action="store_true", help="CSV output")
    args = ap.parse_args()

    if not LIB_RS.is_file():
        print(f"missing {LIB_RS}", file=sys.stderr)
        return 1

    text = LIB_RS.read_text(encoding="utf-8", errors="replace")
    # Find commands and a small window of body for session hints
    rows: list[tuple[str, int, bool]] = []
    for m in re.finditer(r"#\[tauri::command\]", text):
        start = m.start()
        window = text[start : start + 800]
        name_m = re.search(r"fn\s+(\w+)\s*\(", window)
        if not name_m:
            continue
        name = name_m.group(1)
        line = text.count("\n", 0, start) + 1
        has_session = bool(SESSION_HINT.search(window))
        rows.append((name, line, has_session))

    if args.csv:
        print("name,line,session_hint")
        for name, line, sess in rows:
            print(f"{name},{line},{str(sess).lower()}")
    else:
        print(f"# Tauri commands in lib.rs ({len(rows)} total)\n")
        print("| # | Command | Line | Session hint |")
        print("|---|---------|------|--------------|")
        for i, (name, line, sess) in enumerate(rows, 1):
            mark = "yes" if sess else "**no**"
            print(f"| {i} | `{name}` | {line} | {mark} |")
        no_sess = sum(1 for _, _, s in rows if not s)
        print(f"\nCommands without obvious session check in first ~800 chars: **{no_sess}**")
        print("(Hint only — verify authz manually for public reads.)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
