#!/usr/bin/env python3
"""Turn a digiKam pick into a BKSPC-sized photo.

digiKam chooses the set (star rating, Accepted pick label, or a tag you
created). A RAW is published only from a JPEG or TIFF exported beside it,
which is where a Darktable develop lands. pyvips writes a 1600px JPEG that
fits BKSPC's browser-local 8 MiB cap and the 15 MiB hosted image cap.

The originals in ~/Pictures are not modified. Output goes to
~/.local/share/blkspace/yard-photos/manifest.json.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

WEB_LOCAL_MAX_BYTES = 8 * 1024 * 1024
DEFAULT_DB = Path.home() / "Pictures" / "photos3" / "digikam4.db"
DEFAULT_OUT = Path.home() / ".local" / "share" / "blkspace" / "yard-photos"
DEFAULT_EDGE = 1600
DEFAULT_QUALITY = 80
DEFAULT_LIMIT = 12

RAW_EXTENSIONS = {
    ".cr2",
    ".cr3",
    ".nef",
    ".nrw",
    ".arw",
    ".srf",
    ".sr2",
    ".dng",
    ".raf",
    ".orf",
    ".rw2",
    ".pef",
    ".raw",
    ".3fr",
    ".fff",
    ".iiq",
    ".mef",
    ".mos",
    ".x3f",
}
DEVELOPED_EXTENSIONS = (".jpg", ".jpeg", ".tif", ".tiff", ".png", ".webp")
PUBLISH_SUFFIX = {".jpg": ".jpg", ".jpeg": ".jpg", ".webp": ".webp"}


def image_path(specific: str, relative: str, name: str) -> Path:
    rel = (relative or "").strip().strip("/")
    base = Path(specific)
    return base / rel / name if rel else base / name


def is_raw(path: Path) -> bool:
    return path.suffix.lower() in RAW_EXTENSIONS


def find_developed(raw_path: Path) -> Path | None:
    """A Darktable (or camera) JPEG/TIFF sitting next to the RAW."""
    parents = (
        raw_path.parent,
        raw_path.parent / "darktable_exported",
        raw_path.parent / "exported",
    )
    stem = raw_path.stem
    for parent in parents:
        for ext in DEVELOPED_EXTENSIONS:
            for candidate in (parent / f"{stem}{ext}", parent / f"{stem}{ext.upper()}"):
                if candidate.is_file():
                    return candidate
    return None


def open_db(path: Path) -> sqlite3.Connection:
    uri = f"file:{path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


def select_picks(
    conn: sqlite3.Connection,
    *,
    min_rating: int = 1,
    album: str | None = None,
    tag: str | None = None,
    include_unpicked: bool = False,
    limit: int = DEFAULT_LIMIT,
) -> list[sqlite3.Row]:
    clauses = ["i.status = 1"]
    params: list[object] = []
    if not include_unpicked:
        clauses.append(
            """(
                COALESCE(ii.rating, 0) >= ?
                OR EXISTS (
                    SELECT 1 FROM ImageTags it
                    JOIN Tags t ON t.id = it.tagid
                    WHERE it.imageid = i.id AND t.name = 'Pick Label Accepted'
                )
                OR EXISTS (
                    SELECT 1 FROM ImageTags it
                    WHERE it.imageid = i.id
                      AND it.tagid NOT IN (SELECT id FROM internal)
                )
            )"""
        )
        params.append(min_rating)
    if tag:
        clauses.append(
            """EXISTS (
                SELECT 1 FROM ImageTags it
                JOIN Tags t ON t.id = it.tagid
                WHERE it.imageid = i.id AND t.name = ?
            )"""
        )
        params.append(tag)
    if album:
        clauses.append(
            "(a.relativePath = ? OR a.relativePath = ? OR a.relativePath LIKE ?)"
        )
        album_clean = album.strip().strip("/")
        params.extend([f"/{album_clean}", album_clean, f"%/{album_clean}"])
    sql = f"""
        WITH RECURSIVE internal(id) AS (
            SELECT id FROM Tags WHERE name = '_Digikam_Internal_Tags_'
            UNION
            SELECT t.id FROM Tags t JOIN internal i ON t.pid = i.id
        )
        SELECT
            i.id AS id,
            i.name AS name,
            a.relativePath AS relativePath,
            r.specificPath AS specificPath,
            COALESCE(ii.rating, 0) AS rating
        FROM Images i
        JOIN Albums a ON a.id = i.album
        JOIN AlbumRoots r ON r.id = a.albumRoot
        LEFT JOIN ImageInformation ii ON ii.imageid = i.id
        WHERE {' AND '.join(clauses)}
        ORDER BY COALESCE(ii.rating, 0) DESC, i.id DESC
        LIMIT ?
    """
    params.append(limit)
    return list(conn.execute(sql, params))


def tags_for(conn: sqlite3.Connection, image_id: int) -> list[str]:
    rows = conn.execute(
        """
        SELECT t.name FROM ImageTags it
        JOIN Tags t ON t.id = it.tagid
        WHERE it.imageid = ?
        ORDER BY t.name
        """,
        (image_id,),
    )
    return [row["name"] for row in rows]


def comment_for(conn: sqlite3.Connection, image_id: int) -> str:
    row = conn.execute(
        """
        SELECT comment FROM ImageComments
        WHERE imageid = ? AND comment IS NOT NULL AND comment != ''
        ORDER BY id
        LIMIT 1
        """,
        (image_id,),
    ).fetchone()
    return (row["comment"] or "").strip() if row else ""


def classify(row: sqlite3.Row, tags: list[str], comment: str) -> dict:
    source = image_path(row["specificPath"], row["relativePath"], row["name"])
    album = (row["relativePath"] or "").strip("/") or "Pictures"
    item = {
        "id": int(row["id"]),
        "name": row["name"],
        "album": album,
        "rating": int(row["rating"] or 0),
        "tags": tags,
        "source": str(source),
        "status": "ready",
        "detail": "",
        "file": "",
        "bytes": 0,
        "mime": "image/jpeg",
        "width": 0,
        "height": 0,
        "caption": comment or f"{album} · {Path(row['name']).stem}",
    }
    if not source.is_file():
        item["status"] = "missing"
        item["detail"] = "File is not on disk."
        return item
    publish_from = source
    if is_raw(source):
        sibling = find_developed(source)
        if sibling is None:
            item["status"] = "needs-darktable"
            item["detail"] = "Export a JPEG or TIFF from Darktable next to this RAW."
            return item
        publish_from = sibling
        item["source"] = str(sibling)
        item["detail"] = f"Using the Darktable export {sibling.name}."
    item["publishFrom"] = str(publish_from)
    return item


def encode_publish(src: Path, dest: Path, *, edge: int, quality: int) -> tuple[int, int, int]:
    os.environ.setdefault("VIPS_CONCURRENCY", "1")
    import pyvips

    pyvips.cache_set_max(0)
    dest.parent.mkdir(parents=True, exist_ok=True)
    current_edge = edge
    current_quality = quality
    width = height = 0
    for _ in range(3):
        image = pyvips.Image.thumbnail(str(src), current_edge)
        width, height = image.width, image.height
        image.write_to_file(str(dest), Q=current_quality, strip=True)
        size = dest.stat().st_size
        if size <= WEB_LOCAL_MAX_BYTES:
            return size, width, height
        current_edge = max(800, current_edge - 320)
        current_quality = max(60, current_quality - 10)
    return dest.stat().st_size, width, height


def build_manifest(
    conn: sqlite3.Connection,
    out_dir: Path,
    *,
    min_rating: int = 1,
    album: str | None = None,
    tag: str | None = None,
    include_unpicked: bool = False,
    limit: int = DEFAULT_LIMIT,
    edge: int = DEFAULT_EDGE,
    quality: int = DEFAULT_QUALITY,
    encode: bool = True,
) -> dict:
    rows = select_picks(
        conn,
        min_rating=min_rating,
        album=album,
        tag=tag,
        include_unpicked=include_unpicked,
        limit=limit,
    )
    items: list[dict] = []
    seen_sources: set[str] = set()
    out_dir.mkdir(parents=True, exist_ok=True)
    for row in rows:
        tags = tags_for(conn, int(row["id"]))
        item = classify(row, tags, comment_for(conn, int(row["id"])))
        publish_from = item.get("publishFrom")
        if item["status"] == "ready" and publish_from in seen_sources:
            continue
        if publish_from:
            seen_sources.add(publish_from)
        if item["status"] == "ready" and encode:
            dest = out_dir / f"{item['id']}.jpg"
            size, width, height = encode_publish(
                Path(publish_from), dest, edge=edge, quality=quality
            )
            item["file"] = dest.name
            item["bytes"] = size
            item["width"] = width
            item["height"] = height
            item["mime"] = "image/jpeg"
            if size > WEB_LOCAL_MAX_BYTES:
                item["status"] = "too-big"
                item["detail"] = "The 1600px JPEG is still over the 8 MiB browser cap."
        items.append({key: value for key, value in item.items() if key != "publishFrom"})
    manifest = {
        "ok": True,
        "database": "",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "edge": edge,
        "quality": quality,
        "items": items,
    }
    return manifest


def write_manifest(manifest: dict, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / "manifest.json"
    tmp = dest.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    tmp.replace(dest)
    return dest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prepare digiKam picks for a BKSPC pic post.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--min-rating", type=int, default=1)
    parser.add_argument("--album", default="")
    parser.add_argument("--tag", default="")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Include photos that are not rated or tagged. Still obeys --limit.",
    )
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    parser.add_argument("--edge", type=int, default=DEFAULT_EDGE)
    parser.add_argument("--quality", type=int, default=DEFAULT_QUALITY)
    args = parser.parse_args(argv)
    if not args.db.is_file():
        print(f"digiKam database not found: {args.db}", file=sys.stderr)
        return 1
    limit = args.limit if args.limit > 0 else DEFAULT_LIMIT
    os.environ.setdefault("VIPS_CONCURRENCY", "1")
    conn = open_db(args.db)
    try:
        manifest = build_manifest(
            conn,
            args.out,
            min_rating=args.min_rating,
            album=args.album or None,
            tag=args.tag or None,
            include_unpicked=args.all,
            limit=limit,
            edge=args.edge,
            quality=args.quality,
        )
    finally:
        conn.close()
    manifest["database"] = str(args.db)
    path = write_manifest(manifest, args.out)
    counts: dict[str, int] = {}
    for item in manifest["items"]:
        counts[item["status"]] = counts.get(item["status"], 0) + 1
    summary = ", ".join(f"{count} {status}" for status, count in sorted(counts.items()))
    print(f"Wrote {path}")
    print(summary or "0 picks. Star a photo in digiKam, or mark it Accepted, then run this again.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
