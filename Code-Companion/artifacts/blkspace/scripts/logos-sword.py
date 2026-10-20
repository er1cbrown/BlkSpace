#!/usr/bin/env python3
"""Read verses from the four typeverse SWORD modules in ~/.sword.

Modules, same list as ~/Desktop/typeverse/typeverse.py: KJV, GNT, RVG, SpaRV.
GNT (SBL Greek New Testament) and the RVG module are not public-domain
redistributions. This script prints only the verses it was asked for. It does
not write module text into the BlkSpace repo.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

MODULES = ("KJV", "GNT", "RVG", "SpaRV")
SWORD_HOME = Path(os.environ.get("SWORD_HOME", Path.home() / ".sword"))


def clean_text(raw: str) -> str:
    text = re.sub(r"<[^>]+>", "", raw or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def book_index(bible):
    index = {}
    books = bible.get_structure().get_books()
    roman = {"i": "1", "ii": "2", "iii": "3"}
    for testament in ("ot", "nt"):
        for book in books.get(testament, []):
            name = book.name or ""
            osis = book.osis_name or ""
            keys = {
                name.lower(),
                name.lower().replace(" ", ""),
                osis.lower(),
            }
            parts = name.lower().split()
            if parts and parts[0] in roman:
                numbered = " ".join([roman[parts[0]], *parts[1:]])
                keys.add(numbered)
                keys.add(numbered.replace(" ", ""))
            if name.lower() == "psalms":
                keys.update({"psalm", "ps"})
            if "revelation" in name.lower():
                keys.update({"revelation", "rev"})
            if name.lower() == "song of solomon":
                keys.update({"song of songs", "canticles", "song"})
            for key in keys:
                if key:
                    index[key] = book
    return index


def sword_key(book) -> str:
    key = (book.osis_name or book.name or "").lower().replace(" ", "")
    return {
        "songofsolomon": "song",
        "psalms": "ps",
        "revelation": "rev",
        "revelationofjohn": "rev",
    }.get(key, key)


def parse_ref(raw: str):
    match = re.match(r"^(.+?)\s+(\d+)\s*:\s*(\d+)\s*$", raw.strip())
    if not match:
        return None
    chapter = int(match.group(2))
    verse = int(match.group(3))
    if chapter < 1 or verse < 1:
        return None
    return match.group(1).strip(), chapter, verse


def lookup(bible, index, raw: str):
    parsed = parse_ref(raw)
    if not parsed:
        return None
    book_raw, chapter, verse = parsed
    key = re.sub(r"\s+", " ", book_raw.lower().replace(".", ""))
    book = index.get(key) or index.get(key.replace(" ", ""))
    if book is None:
        return None
    try:
        found = bible.get(books=[sword_key(book)], chapters=[chapter], verses=[verse])
    except Exception:
        return None
    if isinstance(found, (list, tuple)):
        found = " ".join(str(part) for part in found)
    text = clean_text(str(found))
    if not text or text.lower() in {"none", "null"}:
        return None
    return {"reference": f"{book.name} {chapter}:{verse}", "text": text}


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: logos-sword.py MODULE REF [REF...]", file=sys.stderr)
        return 2
    module = sys.argv[1]
    if module not in MODULES:
        print("module is not a typeverse SWORD module", file=sys.stderr)
        return 2
    refs = [ref for ref in sys.argv[2:10] if ref.strip()]
    try:
        from pysword.modules import SwordModules
    except Exception:
        print("pysword is not installed", file=sys.stderr)
        return 2
    if not SWORD_HOME.is_dir():
        print("SWORD library is not on this host", file=sys.stderr)
        return 2
    try:
        mgr = SwordModules(str(SWORD_HOME))
        mgr.parse_modules()
        bible = mgr.get_bible_from_module(module)
        index = book_index(bible)
    except Exception as err:
        print(f"could not open {module}: {err}", file=sys.stderr)
        return 2
    verses = []
    seen = set()
    for ref in refs:
        row = lookup(bible, index, ref)
        if not row or row["reference"] in seen:
            continue
        seen.add(row["reference"])
        verses.append(row)
    json.dump(
        {"ok": True, "module": module, "verses": verses},
        sys.stdout,
        ensure_ascii=False,
    )
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
