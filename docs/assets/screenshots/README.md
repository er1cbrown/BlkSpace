# Docs screenshots

Docs-only screenshots live here. These are **not** application assets.

Images the running app serves (landing page hero art, etc.) live in
`Code-Companion/artifacts/blkspace/public/images/` and are referenced from the
app as `/images/<name>` (see `src/pages/landing.tsx`).

**Do not copy app assets into this directory.** They were previously duplicated
here, which added ~4.4 MB of byte-identical PNGs to the repository. If you need
to show an app asset in a doc, link to the canonical file instead:

```markdown
![Hero](../Code-Companion/artifacts/blkspace/public/images/hero-yard.webp)
```

When adding a genuinely new screenshot, prefer `.webp` over `.png` — a few of
the older PNGs here are 25–130 KB where WebP would be a fraction of that.
