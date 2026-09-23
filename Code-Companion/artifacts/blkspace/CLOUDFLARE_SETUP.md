# Cloudflare setup for BlkSpace media

Wrangler login is not required. Create the keys in the Cloudflare dashboard, then put them in `.env` in this folder. Do not commit `.env`. Do not paste the secret values into chat.

Turso is already in `.env`. These lines are the Cloudflare ones:

```bash
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=blkspace-media
R2_PUBLIC_BASE_URL=https://pub-your-id.r2.dev
CLOUDFLARE_API_TOKEN=
```

## 1. Account ID

On the dashboard home, copy **Account ID** into `CLOUDFLARE_ACCOUNT_ID`.

## 2. R2 bucket

1. Open **R2**.
2. Create a bucket named `blkspace-media`.
3. Turn on the public `r2.dev` URL.
4. Put that URL in `R2_PUBLIC_BASE_URL`.
5. On the bucket, allow `PUT` and `GET` from the site origin so the browser can upload.

## 3. R2 API token

1. In R2, open **Manage API tokens**.
2. Create an **Object Read & Write** token.
3. Put the Access Key ID in `R2_ACCESS_KEY_ID`.
4. Put the Secret in `R2_SECRET_ACCESS_KEY`.

## 4. Stream API token

1. Open **My Profile → API Tokens → Create Token**.
2. Permission: **Account → Stream → Edit** for this account.
3. Put the token in `CLOUDFLARE_API_TOKEN`.

## After the file is saved

From this folder:

```bash
bun run dev
```

A photo or PDF uploads to R2. A video uploads to Cloudflare Stream. The post stores the public `https://` link.

## If video does not save

- **Stream authorization failed (401/403):** create or edit the API token with **Account → Stream → Edit** and include the account matching `CLOUDFLARE_ACCOUNT_ID` under **Account Resources**. A token being active does not mean it has access to Stream. R2 keys do not grant Stream access. Ensure Stream is enabled on that account.
- Replace `CLOUDFLARE_API_TOKEN` in this folder's `.env`, then restart the running server (Bun can retain environment values from startup).
- **Saved on this browser** means local browser storage, not a Cloudflare upload. Videos saved this way are not shared with other devices; the Turso fallback only stores metadata for large files. Reattach the original video after fixing Stream access.
- The media upload route runs in `bun run dev` and Vite preview (`bun run serve`). Preview currently does not run the Turso post-saving plugin; use development mode to test the full upload-and-save flow.
- Static hosting of `dist/public`, `scripts/spa-server.mjs`, and packaged desktop builds do not run these Vite API plugins. A deployed site needs a server-side `/api/media/upload-target` route and the portfolio API, with credentials configured on that server. A build-time `.env` alone cannot provide those APIs. Desktop attachments use the native blob store instead of Stream.
