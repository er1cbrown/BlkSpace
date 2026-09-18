# Hostinger Jellyfin scaffold (watch-party library)

**For:** a VPS you rent (Hostinger KVM / Ubuntu). **Not** for the Tier 0 laptop.  
**Pairs with:** [`../../features/yard-room-watch.md`](../../features/yard-room-watch.md)  
**AGENTS.md:** no Docker on the 4–8 GB Windows box — Docker lives on the VPS.

This is a **scaffold**, not a production hardening pass. It gives you a compose file, TLS reverse proxy, and the origin string to paste into BlkSpace.

```
Club files (you are allowed to host)
        │
        ▼
Hostinger Ubuntu + Docker
        │
        ├─ jellyfin   :8096 (internal)
        └─ caddy      :443  TLS  media.YOURDOMAIN
        │
        ▼
BlkSpace watch ticket  kind=jellyfin  origin=https://media.YOURDOMAIN
```

Reticulum is **not** in this compose. Chat stays in the app.

---

## What you need on Hostinger

- Ubuntu 22.04/24.04 VPS, 2 GB RAM min (4 GB if you transcode)
- A domain or subdomain (`media.example.com`) pointed at the VPS A record
- Docker Engine + Compose plugin
- Your media on a disk folder, e.g. `/data/media`

Do **not** scrape sites into `/data/media`. Library = files you own, student films, public domain, licensed club rips you have rights to.

---

## Bring-up (on the VPS)

```bash
# 1. Install docker (once)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in

# 2. Copy this folder to the VPS
#    /opt/blkspace-jellyfin/{docker-compose.yml,Caddyfile,.env}

# 3. Edit .env  (copy from .env.example)
cp .env.example .env
nano .env

# 4. Start
cd /opt/blkspace-jellyfin
docker compose up -d

# 5. First-run wizard
#    https://media.YOURDOMAIN
#    create admin, add library /data/media, disable anonymous access
```

Add the origin to the BlkSpace client later:

```
jellyfinOrigins: ["https://media.YOURDOMAIN"]
```

Until that config exists, only `http://127.0.0.1:8096` parses as a watch source (Device B).

---

## Files

| File | Role |
|------|------|
| `docker-compose.yml` | jellyfin + caddy |
| `Caddyfile` | HTTPS, no directory listing |
| `.env.example` | domain, media path, timezone |

Optional later: [Jellyfin SyncPlay](https://jellyfin.org/docs/general/clients/syncplay/) in-server, or a second container for [syncplay server](https://syncplay.pl). Do not add ani-cli to this stack.

---

## Firewall

- Open **80** and **443** only.
- Do **not** publish 8096 to the internet (Caddy proxies it).
- Fail2ban / Hostinger firewall: allow your campus IP range if you can.

---

## Device B check

1. Admin user can sign in on `https://media.YOURDOMAIN`.
2. One short **your** mp4 plays in the Jellyfin web client.
3. Copy the item URL. `parseWatchSource(url, { jellyfinOrigins: ["https://media.YOURDOMAIN"] })` returns `ok`.
4. Paste a HiAnime URL into the same parser — `ok: false`.

---

## Out of this scaffold

- Native BlkSpace player UI (P1 in the spec)
- Iroh pin of the same file (P4)
- Transcoding on Yard laptops
- Open registration on Jellyfin (invite club members as users)
