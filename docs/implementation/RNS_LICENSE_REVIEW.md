# RNS dependency licence review

**Subject:** `rns-core` 0.1.17 / `rns-crypto` 0.1.10, from `lelloman/rns-rs`
**Purpose:** decide whether BlkSpace may ship the dependency, and record the reasoning
**Status:** engineering analysis only — **this is not legal advice and not a sign-off**

Reproduced here so the licence text stays with the dependency declaration and cannot
drift. Fetched 2026-09-25 from `raw.githubusercontent.com/lelloman/rns-rs/master/LICENSE`.

## The licence, verbatim

> **Reticulum License**
>
> Copyright (c) 2016-2026 Mark Qvist
> Copyright (c) 2025-2026 rns-rs contributors
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of
> this software and associated documentation files (the "Software"), to deal in the
> Software without restriction, including without limitation the rights to use,
> copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
> Software, and to permit persons to whom the Software is furnished to do so,
> subject to the following conditions:
>
> - The Software shall not be used in any kind of system which includes amongst its
>   functions the ability to purposefully do harm to human beings.
>
> - The Software shall not be used, directly or indirectly, in the creation of an
>   artificial intelligence, machine learning or language model training dataset,
>   including but not limited to any use that contributes to the training or
>   development of such a model or algorithm.
>
> - The above copyright notice and this permission notice shall be included in all
>   copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND…

### Structural notes

- The grant itself is **MIT**. The two restrictions are additive conditions on top
  of an otherwise standard permissive grant.
- Because it carries use restrictions, it is **not OSI-approved open source**. It is
  source-available / "copyleft-free but field-of-use restricted." Some tooling and
  institutional policies reject non-OSI licences outright.
- The crates.io metadata reports `"license": "non-standard"`, so automated licence
  scanners will not classify it either.
- The umbrella crate `reticulum-rs` advertises `EPL-2.0 OR GPL-2.0-or-later`, which
  **does not match** `rns-core`'s actual terms. The umbrella is stale and its licence
  metadata is unreliable. BlkSpace depends on `rns-core` directly, so the Reticulum
  License above is the one that governs.

## Clause-by-clause analysis against BlkSpace's actual use

### Restriction 1 — "purposefully do harm to human beings"

**Likely satisfied, but this is the clause that deserves real scrutiny.**

The drafting is awkward: "*includes amongst its functions the ability to purposefully
do harm*". Two readings:

- *Narrow (favourable):* the system's **purpose** is harm. BlkSpace's purpose is campus
  social networking, not harm, so it is outside the clause.
- *Broad (unfavourable):* the system merely needs to **have the ability** to facilitate
  harm, with "purposefully" describing the act rather than the system's intent. Under
  this reading, any platform with user-generated posts, direct messages, and image
  sharing arguably has that ability — as would email, or any forum.

BlkSpace has UGC, DMs (currently plaintext), and image upload, so the broad reading is
not comfortably dismissible. This is the clause most likely to cause friction in an
institutional or legal review, and it is **not** the clause one would expect to be
problematic. Do not let the AI clause distract from this one.

### Restriction 2 — AI/ML/LLM training

**Almost certainly satisfied for the shipped product, with one caveat about tooling.**

- BlkSpace is not an AI model, is not a training dataset, and is not used to train or
  develop one. Ordinary integration does not trigger this clause.
- The clause's own wording reaches "*any use that contributes to the training or
  development of such a model or algorithm*." BlkSpace's development workflow — humans
  and AI coding assistants building a social app — is not the development of an AI
  model, so it does not read as triggering.
- **Caveat:** the clause plausibly aims at dataset scraping and at AI tooling ingesting
  source. This project has read the upstream README and public API documentation to
  evaluate the dependency. Reading public documentation to assess licence terms is
  ordinary diligence and is not the creation of a training dataset. But if the source
  is ever **vendored** and then processed by AI tooling, that is a materially closer
  question and should be routed to whoever owns the decision rather than assumed.

### Attribution condition

Straightforward and already satisfiable: include the copyright notice and permission
notice with all copies. This is what `NOTICE`-style handling is for, and it is the one
condition that is unambiguously our responsibility.

## Three ways to actually clear this

### Path A — Ask upstream (recommended first step; cheap, and the only definitive fix)

Open an issue or discussion on `lelloman/rns-rs` asking:

1. Whether integrating `rns-core` into a non-AI social-networking application
   conflicts with either restriction.
2. Whether the maintainer would consider a carve-out, or an additional MIT/Apache-2.0
   grant for uses that satisfy both conditions.

Rationale: the AI restriction is almost certainly aimed at dataset extraction, not at
ordinary application development, and a maintainer who wrote it may not have considered
a Tauri campus social app. The harm clause may likewise be boilerplate intent. A single
clear question often resolves this in an afternoon, and a written "yes" is worth more
than any amount of our own interpretation.

Draft text is in the next section.

### Path B — Human sign-off on the analysis above

If the answer from upstream is ambiguous or slow, someone with actual authority needs
to accept the risk. For an academic project that is usually the university: tech
transfer / IP office, research office, or the supervising faculty member. They will also
care about Path C's implication.

### Path C — Drop the dependency

Removing it is deliberately cheap: `rns-core` is optional and gated behind the `rns-t3`
feature, which is **not** in `default`. Deleting the feature and one Cargo.toml line
removes it from every build. No Yard build and no ordinary Full build links it today.

Cost of dropping: Phase 2 and Phase 3 of
[`DELIVERY_TIER_CONCEPT.md`](DELIVERY_TIER_CONCEPT.md) become unbuildable, and the
delivery tier stays at two live transports plus an honest offline state. Phase 0
(bounded spool) and Phase 1 (tier detector) are unaffected either way, because neither
depends on this crate.

## Engineering recommendation while this resolves

- Keep the dependency **optional, pinned, and out of `default`** (already done). This
  keeps the decision reversible at zero cost.
- Do **not** enable `rns-t3` in any shipped build until Path A or B lands. The feature
  currently reports capability only and sends nothing, so leaving it off costs nothing.
- Keep doing the transport-independent work: Phase 0 and Phase 1 are done, and the tier
  detector, envelope validation, and signing logic do not need this crate.
- Preserve this file alongside the dependency so the terms and the reasoning travel
  together.

## Draft upstream inquiry

> **Subject:** Licensing question for `rns-core` integration
>
> Hi — I'm evaluating `rns-core` 0.1.17 as a dependency for BlkSpace, a Tauri 2 +
> React campus social-networking app (Nostr for identity/social, Iroh for content
> transfer, Reticulum as an optional offline fallback transport). Full build only,
> opt-in Cargo feature, not in our default feature set.
>
> Two questions about the Reticulum License:
>
> 1. Does integrating `rns-core` into a non-AI social-networking application conflict
>    with the restriction on systems that "include amongst its functions the ability to
>    purposefully do harm to human beings"? Our read is that the clause is aimed at a
>    system's purpose rather than at incidental capability, so a social app with
>    user-generated posts and messaging should be outside it — but the application does
>    have user-generated content, so we'd rather ask than assume.
>
> 2. Does the AI/ML restriction affect ordinary integration? We are not building or
>    training a model and the dependency is not a dataset. We have read your public
>    README and API documentation to evaluate the dependency, and we understand that to
>    be ordinary diligence rather than dataset creation. We'd like to confirm that.
>
> If you are open to it, would you consider granting an additional MIT or Apache-2.0
> licence for uses that satisfy both conditions? We would happily carry the attribution
> notice and contribute back.
>
> Thanks — the crate looks like an excellent fit, and the dependency surface
> (`libm`, `log`, `rns-crypto`) is a real advantage over Iroh's tree.
