#!/usr/bin/env python3
"""WeixNet ingest sample — same ticket shape as BlkSpace sendme_share.rs.

Open source. Compatible with iroh-blobs 0.35 + blkspace1 tickets.
Does NOT pull sendme 0.36 / iroh 1.x (not wire-compatible with this app).

Add-only: hashing a file never deletes the source (phone/SD/Drive anti-pattern).
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import mimetypes
import sys
import time
from pathlib import Path

TICKET_PREFIX = "blkspace1."
CATALOG_NAME = "weixnet-catalog.jsonl"


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def encode_ticket(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    b64 = base64.urlsafe_b64encode(raw).rstrip(b"=")
    return TICKET_PREFIX + b64.decode("ascii")


def decode_ticket(ticket: str) -> dict:
    raw = ticket.strip()
    if not raw.startswith(TICKET_PREFIX):
        raise ValueError("not a blkspace1 ticket (sendme BlobTickets are a different stack)")
    rest = raw[len(TICKET_PREFIX) :]
    pad = "=" * ((4 - len(rest) % 4) % 4)
    payload = json.loads(base64.urlsafe_b64decode(rest + pad))
    if payload.get("v") != 1:
        raise ValueError(f"unsupported ticket version {payload.get('v')}")
    return payload


def payload_for_file(path: Path, data: bytes) -> dict:
    mime, _ = mimetypes.guess_type(path.name)
    now = int(time.time())
    return {
        "v": 1,
        "hash": sha256_hex(data),
        "name": path.name,
        "mime": mime or "application/octet-stream",
        "size": len(data),
        "src": "blkspace",
        "issued_at": now,
        "expires_at": 0,
    }


def ingest_file(src: Path, library: Path, catalog: Path) -> dict:
    data = src.read_bytes()
    payload = payload_for_file(src, data)
    dest_dir = library / payload["hash"][:2]
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / payload["hash"]
    if not dest.exists():
        dest.write_bytes(data)
    payload["ticket"] = encode_ticket(
        {k: v for k, v in payload.items() if k != "ticket"}
    )
    payload["library_path"] = str(dest)
    payload["source_path"] = str(src.resolve())
    payload["pinned"] = True
    payload["unpinned"] = False
    with catalog.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return payload


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("paths", nargs="+", help="files or folders to pin (add-only)")
    p.add_argument(
        "--library",
        default=str(Path.home() / ".blkspace" / "weixnet-library"),
        help="content-addressed pin dir (default ~/.blkspace/weixnet-library)",
    )
    p.add_argument(
        "--no-copy",
        action="store_true",
        help="hash + catalog only; do not copy bytes (still never deletes source)",
    )
    args = p.parse_args()

    library = Path(args.library)
    library.mkdir(parents=True, exist_ok=True)
    catalog = library / CATALOG_NAME

    files: list[Path] = []
    for raw in args.paths:
        path = Path(raw)
        if path.is_dir():
            files.extend(f for f in path.rglob("*") if f.is_file())
        elif path.is_file():
            files.append(path)
        else:
            print(f"skip missing: {path}", file=sys.stderr)

    if not files:
        print("no files", file=sys.stderr)
        return 1

    print("# WeixNet ingest — add-only pins. Source files are never deleted.")
    print(f"# library={library}")
    for src in files:
        if args.no_copy:
            data = src.read_bytes()
            payload = payload_for_file(src, data)
            payload["ticket"] = encode_ticket(payload)
            payload["library_path"] = None
            payload["source_path"] = str(src.resolve())
            with catalog.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
        else:
            payload = ingest_file(src, library, catalog)
        print(json.dumps({"name": payload["name"], "hash": payload["hash"], "ticket": payload["ticket"]}))

    print(
        "# Device B: copy the library folder, or paste a blkspace1. ticket into BlkSpace Drop.",
        file=sys.stderr,
    )
    print("# Do not format the SD card until this catalog lists every still you care about.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
