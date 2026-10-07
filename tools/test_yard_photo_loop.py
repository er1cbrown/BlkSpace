"""Selection and publish rules for the digiKam → BKSPC loop."""

from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

import yard_photo_loop as loop


def memory_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE AlbumRoots (
            id INTEGER PRIMARY KEY, label TEXT, status INTEGER, type INTEGER,
            identifier TEXT, specificPath TEXT, caseSensitivity INTEGER
        );
        CREATE TABLE Albums (
            id INTEGER PRIMARY KEY, albumRoot INTEGER, relativePath TEXT
        );
        CREATE TABLE Images (
            id INTEGER PRIMARY KEY, album INTEGER, name TEXT, status INTEGER
        );
        CREATE TABLE ImageInformation (
            imageid INTEGER PRIMARY KEY, rating INTEGER, format TEXT
        );
        CREATE TABLE Tags (
            id INTEGER PRIMARY KEY, pid INTEGER, name TEXT
        );
        CREATE TABLE ImageTags (
            imageid INTEGER, tagid INTEGER
        );
        CREATE TABLE ImageComments (
            id INTEGER PRIMARY KEY, imageid INTEGER, comment TEXT
        );
        INSERT INTO AlbumRoots VALUES (1, 'Pictures', 0, 1, '', '', 2);
        INSERT INTO Albums VALUES (1, 1, '/photos');
        INSERT INTO Tags VALUES (1, 0, '_Digikam_Internal_Tags_');
        INSERT INTO Tags VALUES (21, 1, 'Pick Label Accepted');
        INSERT INTO Tags VALUES (4, 0, 'People');
        """
    )
    return conn


class SelectTests(unittest.TestCase):
    def test_star_rating_is_a_pick_and_unrated_is_not(self) -> None:
        conn = memory_db()
        conn.execute("INSERT INTO Images VALUES (1, 1, 'a.jpg', 1)")
        conn.execute("INSERT INTO Images VALUES (2, 1, 'b.jpg', 1)")
        conn.execute("INSERT INTO ImageInformation VALUES (1, 3, 'JPEG')")
        conn.execute("INSERT INTO ImageInformation VALUES (2, 0, 'JPEG')")
        picks = loop.select_picks(conn)
        conn.close()
        self.assertEqual([row["id"] for row in picks], [1])

    def test_accepted_label_and_user_tag_count_internal_labels_do_not(self) -> None:
        conn = memory_db()
        conn.execute("INSERT INTO Images VALUES (1, 1, 'raw.CR2', 1)")
        conn.execute("INSERT INTO Images VALUES (2, 1, 'friend.jpg', 1)")
        conn.execute("INSERT INTO Images VALUES (3, 1, 'plain.jpg', 1)")
        conn.execute("INSERT INTO ImageInformation VALUES (1, 0, 'RAW-CR2')")
        conn.execute("INSERT INTO ImageInformation VALUES (2, 0, 'JPEG')")
        conn.execute("INSERT INTO ImageInformation VALUES (3, 0, 'JPEG')")
        conn.execute("INSERT INTO ImageTags VALUES (1, 21)")
        conn.execute("INSERT INTO ImageTags VALUES (2, 4)")
        conn.execute("INSERT INTO Tags VALUES (9, 1, 'Color Label Red')")
        conn.execute("INSERT INTO ImageTags VALUES (3, 9)")
        picks = {row["id"] for row in loop.select_picks(conn)}
        conn.close()
        self.assertEqual(picks, {1, 2})

    def test_album_filter(self) -> None:
        conn = memory_db()
        conn.execute("INSERT INTO Albums VALUES (2, 1, '/photos3')")
        conn.execute("INSERT INTO Images VALUES (1, 1, 'a.jpg', 1)")
        conn.execute("INSERT INTO Images VALUES (2, 2, 'b.jpg', 1)")
        conn.execute("INSERT INTO ImageInformation VALUES (1, 5, 'JPEG')")
        conn.execute("INSERT INTO ImageInformation VALUES (2, 5, 'JPEG')")
        picks = loop.select_picks(conn, album="photos3")
        conn.close()
        self.assertEqual([row["name"] for row in picks], ["b.jpg"])


class ClassifyTests(unittest.TestCase):
    def test_raw_without_an_export_needs_darktable(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = root / "photos" / "shot.CR2"
            raw.parent.mkdir()
            raw.write_bytes(b"raw")
            conn = memory_db()
            conn.execute("UPDATE AlbumRoots SET specificPath = ?", (str(root),))
            conn.execute("INSERT INTO Images VALUES (7, 1, 'shot.CR2', 1)")
            conn.execute("INSERT INTO ImageInformation VALUES (7, 4, 'RAW-CR2')")
            row = loop.select_picks(conn)[0]
            item = loop.classify(row, ["Pick Label Accepted"], "")
            conn.close()
            self.assertEqual(item["status"], "needs-darktable")

    def test_raw_uses_the_sibling_jpeg(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / "photos"
            folder.mkdir()
            (folder / "shot.CR2").write_bytes(b"raw")
            (folder / "shot.jpg").write_bytes(b"jpeg")
            conn = memory_db()
            conn.execute("UPDATE AlbumRoots SET specificPath = ?", (str(root),))
            conn.execute("INSERT INTO Images VALUES (7, 1, 'shot.CR2', 1)")
            conn.execute("INSERT INTO ImageInformation VALUES (7, 4, 'RAW-CR2')")
            row = loop.select_picks(conn)[0]
            item = loop.classify(row, [], "")
            conn.close()
            self.assertEqual(item["status"], "ready")
            self.assertTrue(item["source"].endswith("shot.jpg"))

    def test_missing_file(self) -> None:
        conn = memory_db()
        conn.execute(
            "UPDATE AlbumRoots SET specificPath = ?", ("/tmp/yard-photo-missing",)
        )
        conn.execute("INSERT INTO Images VALUES (3, 1, 'gone.jpg', 1)")
        conn.execute("INSERT INTO ImageInformation VALUES (3, 2, 'JPEG')")
        row = loop.select_picks(conn)[0]
        item = loop.classify(row, [], "hello")
        conn.close()
        self.assertEqual(item["status"], "missing")
        self.assertEqual(item["caption"], "hello")


class PublishTests(unittest.TestCase):
    def test_pyvips_writes_a_small_jpeg_and_manifest(self) -> None:
        import pyvips

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / "photos"
            folder.mkdir()
            src = folder / "frame.jpg"
            image = pyvips.Image.black(40, 30) + [20, 40, 80]
            image.write_to_file(str(src))
            conn = memory_db()
            conn.execute("UPDATE AlbumRoots SET specificPath = ?", (str(root),))
            conn.execute("INSERT INTO Images VALUES (9, 1, 'frame.jpg', 1)")
            conn.execute("INSERT INTO ImageInformation VALUES (9, 5, 'JPEG')")
            out = root / "out"
            manifest = loop.build_manifest(conn, out, edge=32, quality=80)
            conn.close()
            item = manifest["items"][0]
            self.assertEqual(item["status"], "ready")
            self.assertLessEqual(item["bytes"], loop.WEB_LOCAL_MAX_BYTES)
            self.assertTrue((out / "9.jpg").is_file())
            self.assertLessEqual(item["width"], 32)


if __name__ == "__main__":
    unittest.main()
