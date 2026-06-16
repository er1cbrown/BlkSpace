# Bible NLP — Opt-In Spiritual Layer (Concept Draft)

**Status:** CONCEPT ONLY — off by default; no implementation without explicit product sign-off.

## Principles

1. **Opt-in only** — never injected into FYP or yards without user consent
2. **On-device inference** — leverage `myBibleNLP` patterns locally; no cloud scripture profiling
3. **No WB for religious content** — avoid perverse incentives on faith posts
4. **Separate graph** — scripture interests do not affect MIDF or karma

## User-facing toggles (future)

- Profile: "Scripture study" interest tags
- Feed: follow `#scripture` channel only if enabled
- Optional verse suggestion when composing (local model)

## Data

- KJV / study notes from existing `myBibleNLP` pre-work
- Nostr kind TBD for signed study milestones (not rewards)

## Out of scope

- Algorithmic scripture injection in Watch/Read FYP
- Mandatory religious fields on signup