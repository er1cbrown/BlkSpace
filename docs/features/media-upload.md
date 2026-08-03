# Social media uploads (BlkSpace)

## How it works

```
User picks files (composer / Create)
        │
        ▼
  Validate type + size (media-upload.ts)
        │
        ▼
  Base64 → Tauri `upload_blob`
        │
        ├─► Local blob_store (sha256 file on disk)
        ├─► SQLite `blobs` row (mime, size, filename, cid)
        └─► Optional Iroh CID (Full build)
        │
        ▼
  Post with `media_blobs` JSON array of hashes
        │
        ▼
  Feed `MediaDisplay` → get_blob_metadata / get_blob_bytes → render
```

## Supported types

| Kind | Extensions | Max size |
|------|------------|----------|
| Image | jpg, png, gif, webp, svg, heic, avif, bmp | 15 MB |
| Video | mp4, webm, mov, m4v, avi, mkv | 50 MB |
| Audio | mp3, m4a, aac, ogg, wav, flac | 25 MB |
| PDF | pdf | 20 MB |
| Docs | doc, docx, txt, md, csv, json, zip, rtf | 15 MB |

Absolute ceiling: **50 MB** (`MAX_UPLOAD_SIZE` in Rust).

## UI

- **Attach** in post composer: multi-select, drag-and-drop, previews
- Up to **6 files** per post
- Caption optional if at least one file is attached
- Large video/PDF: tap-to-load / open in feed (keeps scroll light)

## Requirements

- **Desktop (Tauri)** for real uploads
- Web preview can compose text only; attach shows “open desktop app”

## Code map

| File | Role |
|------|------|
| `src/lib/media-upload.ts` | Types, limits, validation |
| `src/components/social/PostComposer.tsx` | Attach UI |
| `src/components/ui/media-display.tsx` | Render image/video/audio/pdf/file |
| `src-tauri/src/lib.rs` | `upload_blob`, mime map, size cap |
| `src-tauri/src/blob_store.rs` | On-disk content-addressed store |
| [sendme-iroh-transfer.md](./sendme-iroh-transfer.md) | Share/receive tickets (sendme-style drop) |
