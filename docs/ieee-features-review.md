# BlkSpace — Streamlined Features Review (IEEE)

**Document type:** Feature capability review for technical program / peer discussion  
**Product:** **BlkSpace** (campus social application)  
**Settlement ticker:** **BKSPC** (BlkSpace Coin — optional, gated)  
**Soft credits:** WeixBucks (WB)  
**Repo:** [github.com/er1cbrown/BlkSpace](https://github.com/er1cbrown/BlkSpace)  
**Revision:** 2026-08-03 · HEAD ≈ `4611cbe`  
**Companion brief:** [`ieee-review-brief.md`](ieee-review-brief.md)

---

## 1. Abstract

BlkSpace is a **federated college-campus social system** for HBCU communities. It prioritizes **Tier 0 student hardware**, **account ownership** (cryptographic identity, no vendor lock-in narrative), and a **hybrid stack**: local persistence + Nostr social events + optional content-addressed media (Iroh) + optional Solana settlement (BKSPC).  

This review **streamlines** the feature surface into IEEE-relevant layers: *what is implemented*, *what is partial*, *what is deliberately out of scope*, and *how to evaluate* without marketing inflation.

---

## 2. Problem statement (reviewable)

| Failure of status quo | BlkSpace response |
|----------------------|-------------------|
| Central platforms extract attention; accounts are revocable | Local-first identity + recovery phrase path |
| Campus culture is multi-school, not one global feed | **Yards** (campus places) + intranet tags on shared relays |
| Creators cannot monetize without ads/data sale | Soft **WeixBucks** economy; **Cred** before settlement |
| Student laptops cannot run full mesh stacks | **Yard** build (no Iroh default) vs **Full** lab build |

**Claim under review:** A hybrid federated campus mesh can support real HBCU social + creator workflows on low-end devices without requiring full on-chain settlement for day-one use.

---

## 3. System layers (IEEE mapping)

| Layer | Role | Implementation status |
|-------|------|------------------------|
| **Application** | Social UX, economy, campus modules | **Shipped** (Yard MVP + campus amalgamation) |
| **Identity** | Handle + Nostr keys | **Shipped** (desktop key store; web session preview) |
| **Data plane (local)** | Posts, blobs, catalog | **Shipped** Turso/SQLite desktop; web userspace for preview |
| **Event plane** | Posts / tags / mesh | **Partial** — Nostr relays deferred on Yard boot |
| **Content plane** | Media CIDs | **Partial** — local store + optional Iroh 0.35 store; P2P provider not default |
| **Settlement** | Soft WB → BKSPC | **Partial** — policy + UI; mainnet rights not public |
| **Transport** | Relays / hole-punch | **Partial** — shared-relay model; sendme CLI for true P2P drops |

Detail: [`TOP_DOWN_APPROACH.md`](TOP_DOWN_APPROACH.md), [`architecture-blueprint.md`](architecture-blueprint.md).

---

## 4. Feature matrix (streamlined)

Statuses: **I** implemented · **P** partial · **N** not in product · **O** out of scope  

### 4.1 Core social (student day path)

| Feature | Status | Notes for reviewers |
|---------|--------|---------------------|
| Welcome / guest browse | **I** | Browse-first; write gated |
| Home feed (My Yard / Watch / Read) | **I** | Town-scoped + seed/demo content |
| Multi-type media posts | **I** | Desktop upload; web attach limited |
| Communities (**Yards**) · 100+ HBCUs | **I** | DB catalog v8; catalog seed optimized on warm boot |
| Yard channels / wall / members | **I** / **P** | Desktop primary; web interactive userspace for join/post/like |
| First-user orientation UX | **I** | Plain-language guide; power features deferred |
| Secure handle DMs | **P** | Experimental; ethical/No-PHI framing |

### 4.2 Personalization & multimedia (MyYard)

| Feature | Status | Notes |
|---------|--------|-------|
| Profile themes | **I** | Classic / Pro / Vibrant / MyYard classic |
| **Customize station** | **I** | Banner, gallery, music, mood/about, fonts, safe CSS |
| Profile song | **I** | Content-addressed audio when uploaded |
| Top friends | **I** | Editable strip |

**Distinction for review:** **Yard** = campus place; **MyYard** = personal page (visitor-visible aesthetics).

### 4.3 Campus amalgamation modules

| Feature | Status | Notes |
|---------|--------|-------|
| ProjectConnect (opps, orgs, Cred) | **I** | Credibility before finance |
| Faculty Desk / Focus (med) | **I** | Optional onboarding paths |
| Events / tickets / RSVP | **I** | Capacity, club-only, check-in |
| Clubs (reading / tournaments) | **I** / **P** | Brackets + external play links |
| Content Hub | **I** | Topic shelves |
| Studio (portfolio / client delivery) | **I** | WB unlock / free grant |
| Yard Sale + escrow | **I** / **P** | Soft WB; mainnet BKSPC not required for list |

### 4.4 Economy & settlement

| Feature | Status | Notes |
|---------|--------|-------|
| WeixBucks earn/spend ledger | **I** | Soft credits |
| Marketplace fees / tips | **I** | Policy-driven |
| Yard Cred → withdraw gate | **I** | Threshold before settlement UI |
| BKSPC mainnet panel | **P** | Honest cluster/mint status; no auto-mint claim |
| Guaranteed token returns | **O** | Must not be claimed |

### 4.5 Networking & media distribution

| Feature | Status | Notes |
|---------|--------|-------|
| Shared Nostr relays + town tags | **P** | Avoids N² campus mesh |
| Offline queue / device sync | **P** | Desktop; Device B M0 incomplete |
| Iroh blob store | **P** | Full build; Yard omits by default |
| Content share tickets (`blkspace1.`) | **I** | Metadata + local/Iroh materialize |
| Live P2P hole-punch in-app | **N** | Documented: **sendme** CLI / future `iroh-net` |
| Live rooms (Stage/Voice) | **P** | External Jitsi/link-out — not RTMP ingest |
| Native live streaming platform | **N** / **O** | Explicit non-goal for current phase |

### 4.6 Delivery & operations

| Feature | Status | Notes |
|---------|--------|-------|
| Yard MSI / multi-OS CI | **I** / **P** | Student Yard vs Full lab artifacts |
| Web preview (interactive) | **I** | Userspace localStorage for demo |
| Tier 0 boot optimizations | **P** | Deferred seed/relays; skip full HBCU re-seed when loaded |
| Device B student smoke | **P** | Checklist; install PASS; full path in progress |

---

## 5. Build flavors (evaluation constraint)

| Flavor | Features | Audience |
|--------|----------|----------|
| **Yard** (`--no-default-features`) | Social + economy + campus modules; no Iroh in binary | Students, 4–8 GB laptops |
| **Full** (`feature = iroh`) | + content store / CID path | Lab, power users |

Reviewers should **not** evaluate Yard installs against full P2P media claims.

---

## 6. Explicit non-claims (integrity)

Do **not** present as complete:

1. Native live video ingest / TikTok-class streaming  
2. Public mainnet BKSPC rights without Cred + counsel + mint ops  
3. Official university SSO / SIS / legal ID  
4. Full replacement of Eventbrite, Twitch, LinkedIn, Netflix-class media  
5. In-app sendme-equivalent hole-punch on default Yard binary  

---

## 7. Suggested evaluation criteria

| Criterion | How to probe | Pass bar (MVP) |
|-----------|--------------|----------------|
| **Usability (campus day-one)** | Welcome → TSU → post → yard → Live | Completes without developer tools |
| **Personalization** | Customize station → visitor reload | Distinct profile aesthetics |
| **Economy honesty** | WB earn + BKSPC panel | Soft vs settlement clearly separated |
| **Decentralization honesty** | Relays + tickets vs P2P CLI | Claims match Yard vs Full |
| **Tier 0 fitness** | Memory & feed targets | See `tier0_benchmark`; &lt;500 MB smoke |
| **Security framing** | DMs, recovery phrase, No-PHI | Documented threat posture |
| **Reproducibility** | Tag / MSI / docs | Install path + open source |

**Student smoke form:** [`device-b-student-smoke.md`](device-b-student-smoke.md)  
**Capability log (detail):** [`features/use-case-capability-log.md`](features/use-case-capability-log.md)

---

## 8. Open questions for IEEE discussion

1. **Mesh sufficiency:** Is shared-relay + town tags an acceptable federation model for campus threat models (vs full DHT / per-campus relays)?  
2. **Economy:** Is earn-only soft currency + gated settlement appropriate for student populations under financial regulation caution?  
3. **Metadata privacy:** How should Nostr relay metadata leakage be bounded for sensitive coordination (clubs, research)?  
4. **Media plane:** Should content-addressed P2P (Iroh 1.x) enter the default Yard binary, or remain lab-only given link size and Windows constraints?  
5. **Evaluation methodology:** What is a fair multi-device M0 protocol for hybrid offline + relay sync on Tier 0 hardware?

---

## 9. One-page summary table

| Domain | Grade | One line |
|--------|-------|----------|
| Campus social core | **Strong** | Feed, yards, posts, guest, multi-HBCU catalog |
| MyYard / multimedia identity | **Strong** | Customize station visitor-visible |
| Campus modules (Connect, events, clubs, studio) | **Strong / Partial** | Amalgamation MVP; not category clones |
| Soft economy | **Moderate** | WB + Cred; settlement UI honest |
| Decentralized media / P2P | **Partial** | Store + tickets; live P2P external/lab |
| Live hangout | **Light** | Link/Jitsi rooms |
| Mainnet settlement | **Not ready** | By design until gates + ops |
| Empirical Device B sign-off | **In progress** | Process + checklist |

---

## 10. Pointers (deeper reading)

| Topic | Document |
|-------|----------|
| Networking top-down | [`TOP_DOWN_APPROACH.md`](TOP_DOWN_APPROACH.md) |
| Architecture | [`architecture-blueprint.md`](architecture-blueprint.md) |
| Security | [`security-considerations.md`](security-considerations.md) |
| HBCU intranet mesh | [`features/hbcu-intranet-mesh.md`](features/hbcu-intranet-mesh.md) |
| Sendme / tickets | [`features/sendme-iroh-transfer.md`](features/sendme-iroh-transfer.md) |
| MyYard customize | [`features/myyard-customize-station.md`](features/myyard-customize-station.md) |
| BKSPC rights path | [`features/bkspc-rights-path.md`](features/bkspc-rights-path.md) |
| Theory baseline | [`../FLESHTHEORY.md`](../FLESHTHEORY.md) |

---

*This document is a feature review aid, not a legal or financial opinion. Brand: product **BlkSpace**; ticker **BKSPC**.*
