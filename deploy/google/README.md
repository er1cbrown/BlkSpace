# BlkSpace on Google Cloud (compute + media)

Use this when you want Google as the primary host. The same image as
`deploy/hostinger` runs here; only the reverse proxy and DNS differ.

## Option A: Cloud Run (managed)
1. Build and push the image:
   `docker build -f deploy/hostinger/Dockerfile -t gcr.io/PROJECT/blkspace .`
   `docker push gcr.io/PROJECT/blkspace`
2. Deploy:
   `gcloud run deploy blkspace --image gcr.io/PROJECT/blkspace --region us-central1 --allow-unauthenticated --port 3000`
3. Set env vars in Cloud Run (Turso + Cloudflare/GCS keys) via `--set-env-vars` or Secret Manager.
4. Point `bkspc.app` DNS to the Cloud Run URL.

## Option B: Compute Engine VM (Docker)
1. Create an Ubuntu VM, install Docker.
2. Copy `deploy/hostinger` files; use the same compose, but replace Traefik labels with Caddy/Nginx or Cloud Load Balancer.
3. Run `docker compose -p blkspace up -d`.
4. Point DNS to the VM IP.

## Notes
- Keep `PUBLIC_ORIGINS` set to your production origins.
- Media can use GCS (preferred) with Cloudflare fallback.
- Turso remains the database unless you migrate it.
