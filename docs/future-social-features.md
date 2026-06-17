# Future Social Media Features — BlkSpace / WeixNet

**Source**: Synthesized from `plan.md`, `hub-theory.md`, `stack-reconciliation.md`, `features/*.md`, `nft-dj-mixes.md`, `creative-pipeline.md`, and related vision docs (2026).

**Status**: Phase 0–1 reference. These features realize the "amalgamation social platform" vision.

---

## Core Philosophy (from plan.md + hub-theory)

BlkSpace is **not** just another app. It is a **culturally grounded, hardware-aware, economically incentivized amalgamation** of the best social experiences:

- **Facebook / Instagram**: Social feeds, profiles, following, walls, activity.
- **Twitter (X)**: Fast, public, chronological + discovery feeds, reposts, quick posting.
- **Instagram / TikTok FYP**: Algorithmic "For You" discovery that surfaces great content across towns.
- **Discord**: Structured yet casual communities ("Yards") with channels, roles, focused chat + professional networking.
- **MySpace**: Deep profile customization (themes, layouts, music embeds, creative self-expression).
- **Newgrounds / YouTube**: Rich creative uploads (art, long video, music, DJ mixes).
- **Marketplace + NFTs**: Real economic loops via WeixBucks / BlkCoin.

Everything runs on the **WeixNet decentralized hub** (Nostr events + Iroh blobs + economy engine) so students on low-end hardware can participate and earn.

---

## Implemented / In Progress (Phase 1)

- Basic feed with town tags and cross-town bridging.
- Communities ("Yards") list + simple community pages.
- Profiles with stats, posts list, bio.
- Media uploads (images, video, **audio** supported).
- Wallet / WeixBucks economy (simulated).
- Nostr identity + BIP39 recovery.

---

## Priority Future Social Features (Roadmap)

### 1. Feeds — Twitter + Instagram Hybrid (High Priority)
- **Following tab** (pure Twitter): Chronological posts from accounts + towns you explicitly follow.
- **For You (FYP)**: Smart mix — high-engagement, content from your interests + "viral in other yards", serendipity. Use engagement quality + simple signals (no heavy ML at first).
- **Local Yard** (core identity): Your college town's primary feed.
- **Trending / Bridge** (existing): Cross-town summaries + discovery.
- **Topics / Hashtags** + saved feeds.
- Infinite scroll + real-time updates via Nostr subscriptions.

### 2. Communities — Discord-like Yards (High Priority)
- **Channels** per Yard: #general, #events, #music, #study-hall, #networking, #market, #voice-lounge (future).
- Channel-scoped posts + lightweight threaded replies.
- **Roles & moderation**: Student / Alum / Mod / Creator. Town-specific badges.
- Member directory with filters (year, major, online status).
- Pinned announcements + events calendar.
- **Voice / Stage** (Phase 3+): Lightweight voice rooms powered by future mesh or WebRTC bridge.
- Private / invite-only sub-yards for orgs, study groups, crews.

### 3. Profiles — MySpace + Facebook Depth (High Priority)
- **Highly customizable pages**:
  - Theme presets + user CSS / background images (WeixBucks spend).
  - Layout sections: About, Wall, Music, Creations, Portfolio.
  - **Profile Music Embed** (MySpace killer feature): Featured song or full DJ mix that auto-plays (with volume control + tip button). Powered by Iroh audio blobs.
- **Wall** (Facebook): Visitors can post on your profile (with your approval settings). Public conversations.
- **Rich media sections**: Gallery, mixes, videos, scripture decks (LogosDecks tie-in).
- Follow / Friend mechanics with mutuals and "close friends" lists.
- Professional mode toggle (clean layout for recruiters vs. full expressive mode).
- Exportable portfolio (PDF + web link) for internships.

### 4. Content & Discovery
- **Full Twitter-like interactions**: Repost with comment, quote posts, bookmark collections.
- **Instagram-style discovery**: Explore page, FYP algorithm, "Similar to what you liked".
- **Creative uploads first-class**: Short video (TikTok), long-form (YouTube), music + stems (Newgrounds + DJ), photo essays.
- **Audio everywhere**: Profile songs, in-feed players, community mixes, scripture audio (Bible NLP pipeline).
- Rich link previews (carefully — security first, no auto unfurl for untrusted).

### 5. Social Graph & Activity (Facebook DNA)
- Following + "Close Friends" circles.
- Notifications center with rich activity (likes, reposts, mentions, town events, payments received).
- Activity feed / "On This Day" cultural memories.
- Mutual connections and "People you may know from [other HBCU]".
- Groups / Clubs (beyond Yards): Fraternities, majors, causes, creative collectives.

### 6. Professional + Casual Balance (Discord Superpower)
- Every Yard supports both vibes:
  - Casual: Memes, vibes, quick check-ins, music.
  - Professional: Networking channels, portfolio showcases, mentorship requests, resume drops, career fair coordination.
- Verified alum / faculty badges.
- Private DMs (Nostr — with strong warnings; sensitive stuff discouraged).
- Calendar + event RSVPs with token-gated access (future BlkCoin / NFT tickets).

### 7. Economic & Creative Loops (Core Differentiator)
- Earn WeixBucks / BlkCoin for engagement, creation, node running.
- **Spend on customization**: Profile themes, featured music slots, boosts, custom badges.
- Tip creators directly while listening to their profile song or reading their wall.
- Marketplace integration: Sell merch, digital goods, services inside Yards.
- NFT DJ mixes & creative drops that double as profile flexes.

### 8. Later / Phase 4+
- Voice & live stages.
- Collaborative creative tools (shared docs, remix stems, LogosDecks builder).
- Advanced FYP with real signals + on-device models (privacy-first).
- Cross-app federation (Nostr makes this natural).
- Mobile clients + PWA.
- Full Iroh pinning rewards visible in UI.
- Solana on-chain prestige items (custom skins, verified creator status).

---

## How This Matches the Reference Vision

- plan.md explicitly calls for the Facebook/Instagram + Discord + MySpace + Newgrounds + YouTube amalgamation.
- hub-theory.md lists the exact capabilities the decentralized hub must support (social feeds, communities/chat, custom profile themes + music, music/creative uploads).
- nft-dj-mixes.md and creative-pipeline.md call out profile music embeds + audio as first-class.
- stack-reconciliation.md confirms "customizable profiles (MySpace) + music embeds".
- All of this must stay **low-end hardware friendly** and economically real (WeixBucks today, BlkCoin later).

The current Phase 1 foundation (Nostr auth, local SQLite, town-tagged feeds, basic communities, media blobs, wallet) is the right base. These features are natural extensions that make the platform feel like **the** digital yard — casual enough to scroll between classes, professional enough to network for the internship, expressive enough to make it yours with a banging profile song.

---

*Document created 2026-06-15 based on existing reference materials. Update as vision evolves.*