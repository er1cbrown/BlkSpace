# Social media uploads (BlkSpace)

## How it works

```text
User picks files (composer / Create)
        │
        ▼
  Validate type + size (media-upload.ts)
        │
        ├─► Tauri: base64 → local upload_blob → SQLite/blob_store
        │                         (optional Iroh CID in Full)
        └─► Browser: hosted upload-target → R2/Stream → HTTPS URL
        │
        ▼
  Post keeps local hashes for native/local rendering
        │
        ▼
  Hosted sync promotes native media to R2 URLs or Stream video URLs
        │
        ▼
  Other devices cache the HTTPS media reference and render it
```

## Supported types

| Kind | Extensions | Max size |
|------|------------|----------|
| Image | jpg, jpeg, png, gif, webp, heic, heif, avif, bmp | 15 MB |
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

- **Desktop (Tauri)** keeps a local copy and promotes supported media during hosted sync
- **Web preview** uploads configured media to R2/Stream and caches the returned HTTPS URL
- Stream video remains dependent on a correctly scoped Cloudflare token

## Code map

| File | Role |
|------|------|
| `src/lib/media-upload.ts` | Types, limits, validation |
| `src/components/social/PostComposer.tsx` | Attach UI |
| `src/components/ui/media-display.tsx` | Render image/video/audio/pdf/file |
| `src-tauri/src/lib.rs` | `upload_blob`, mime map, size cap |
| `src-tauri/src/portfolio_sync.rs` | Rust NIP-98 media target, R2 PUT, Stream multipart, outbox URL promotion |
| `server/media.mjs` | Hosted R2/Stream target generation and MIME/size validation |
| `src/lib/web-posts.ts` | Hosted media array/string normalization |
| `src-tauri/src/blob_store.rs` | On-disk content-addressed store |
| [sendme-iroh-transfer.md](./sendme-iroh-transfer.md) | Share/receive tickets (sendme-style drop) |
