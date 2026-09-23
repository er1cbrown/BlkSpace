# Three-laptop readiness — 2026-09-23

Reviewed commit: `4c49367` (`er1cbrown/BlkSpace`).

Goal: three laptops on Wi-Fi, a shared cloud-backed app at `bkspc.app`, and a credible route to native P2P and mobile.

## Verdict

The standalone cloud deployment is live at `https://bkspc.app` behind the VPS's existing Traefik proxy. DNS and TLS now point to the VPS. Three physical laptops have not yet been run through the complete post/media flow.

## Evidence

| Area | Verified state | Consequence |
| --- | --- | --- |
| Domain | `bkspc.app` and `www.bkspc.app` resolve to `2.25.137.34`; both return valid HTTPS | Production cutover is complete |
| Cloud web build | The VPS Docker build and focused server/frontend checks passed | A standalone server serves the built SPA and API; Vite is not the production runtime |
| Pages deployment | `actions/configure-pages` failed with site not found | Pages is not enabled/configured; it is not the current deployment path |
| CI | 147 unit tests passed; 2 failed; frontend/API TypeScript errors | Existing native build jobs remain blocked by prerequisites |
| Turso | Read-only `COUNT(*)` succeeded; the deployed API returns the existing portfolio row | Shared post storage is reachable through the cloud server |
| R2 | Authenticated R2 upload-target generation returned a presigned URL | Actual browser upload and cross-device playback still need a physical run |
| Stream | Authenticated target generation returns an actionable 403 | Replace the token with Account → Stream → Edit scoped to the configured account |
| Browser identity | Local password-encrypted key backup; writes use signed NIP-98 proofs | New-device login needs backup + password or recovery phrase; there is no central password login |
| Browser posts | Cloud acknowledgement precedes local success; active feeds refresh every five seconds | The three-laptop result is still not recorded |
| Likes/follows | Browser branches update local state | These interactions are not shared across laptops |
| Native Nostr | Signed publishing, relay manager, validated ingest, background polling exist | Candidate for desktop social sync; physical-device delivery still unverified |
| Native Iroh | Endpoint, blob protocol, persistent store, share/receive tickets exist in Full | Candidate for explicit desktop file-transfer demo; Yard omits Iroh |
| Reticulum | Binary discovery plus local `spool.jsonl` writes | No send/receive/drain transport is implemented in the reviewed bridge |
| Mobile | Tauri mobile entry point exists; no generated Android/iOS projects found | Reusable foundation, not a tested mobile release |

CI evidence:
- [Web build / Pages run](https://github.com/er1cbrown/BlkSpace/actions/runs/35915631578)
- [CI run](https://github.com/er1cbrown/BlkSpace/actions/runs/35915631510)

## Hosting decision

The running deployment uses the Hostinger KVM 2 VPS. Bun builds inside Docker, the final container serves the standalone app and APIs, and the existing host-network Traefik terminates HTTPS. The application binds to `127.0.0.1:3000`; it does not publish a new public port. Cloudflare supplies R2 and Stream, while Turso supplies shared post records.

The remaining hosting work is Cloudflare Stream authorization and the physical three-device test. Do not remove the existing Traefik or Hermes containers.

## Recommended use of the existing stack

```text
Browser / future mobile UI
       │ HTTPS
       ▼
Application backend ─── Turso: shared application records
       │
       ├── R2: images / documents
       └── Stream: hosted video upload / playback

Native Tauri clients
       ├── Nostr: signed social events through shared relays
       ├── Iroh: explicit blob transfer, direct when possible, relay fallback
       └── Reticulum: optional future resilient note transport
```

- Web and desktop need a defined shared event/data contract. A browser portfolio table and desktop Nostr events do not automatically become the same feed.
- A Nostr relay carries signed events. An Iroh relay forwards encrypted traffic. Neither is automatically durable video storage.
- Normal desktop posts currently publish `blob://` / CID metadata. This is not enough by itself to guarantee that another device can find a provider and fetch bytes. Test explicit Share/Receive tickets before claiming automatic media synchronization.
- Iroh's current browser implementation requires a separate WASM integration and uses relay connections; BlkSpace's Rust dependency does not turn it on in the React browser app.
- Reticulum needs a selected native implementation, daemon lifecycle/IPC, outbound spool draining, inbound handling, delivery acknowledgements, and cross-device tests. Merely placing a binary next to the app does not implement those functions. Preserve the repository's native-only, no-Python/no-LXMF/no-RNode policy.

## Tonight: a narrow three-laptop proof

### Preparation

1. Open the temporary HTTPS deployment on all three laptops: `https://blkspace.srv1946189.hstgr.cloud`.
2. Use the browser path for the shared cloud demo. Keep native P2P as a separately verified demonstration.
3. Correct Stream permission and recreate the container so it loads the new token.
4. Create three distinct demo identities. If testing the same account on another laptop, transfer the encrypted backup and unlock it there.

### Temporary LAN rehearsal

The VPS deployment removes the need to host from a laptop. All three browsers can use the temporary HTTPS URL. The temporary host is not the production domain until DNS is changed.

### Acceptance run — record actual results

| Check | Required evidence | Result |
| --- | --- | --- |
| Same application | A/B/C open the same deployed URL and revision | Not run |
| Independent identities | Distinct handles on each laptop; recovery tested if needed | Not run |
| A → B/C text | One unique post visible on B/C; record latency and any refresh | Not run |
| B → A/C text | Reverse direction works without duplicates | Not run |
| Image | Upload once; other two devices load the hosted URL | Not run |
| Video | Upload; wait for Stream processing; other devices play it | Blocked by Stream access |
| Persistence | Reload each browser; posts/media remain | Not run |
| Cloud independence | Close the uploader laptop; other two still read hosted content | Not run |
| Honest failures | A failed write/upload shows failure rather than a success toast | Automated API coverage passes; physical browser run not run |

Do not include cross-device likes, DMs, balances, marketplace settlement, offline mesh, or mobile-native claims in this proof until each has its own passing test.

## After the three-device proof

1. **Shared product state:** unify identity/author ownership and records across web/native, implement durable retries and observable delivery, and finish shared interactions.
2. **Measured scaling:** paginate feeds instead of reloading the latest 100 globally; partition subscriptions by yard; measure request latency, failed writes, media playback, and relay traffic with 10–30 testers before increasing load. Move from polling to event delivery where measurements justify it.
3. **Native P2P:** match Full builds across devices; verify Nostr delivery, Iroh ticket transfers, direct versus relayed paths, and behavior when the source laptop closes. Add deliberate durable replication for files that must stay available.
4. **Mobile:** stabilize responsive web first; add and test PWA packaging if desired. Then generate the Tauri Android project and validate storage, keys, media pickers, permissions, and background/resume behavior. Follow with iOS on macOS/Xcode. Keep desktop daemon assumptions out of mobile until separately implemented.

## Primary code references

Paths relative to `Code-Companion/artifacts/blkspace/`:
- `server/`: standalone cloud API, Turso portfolio store, Cloudflare media target, and NIP-98 authentication.
- `scripts/cloud-api-plugin.mjs`: development/preview bridge to the same API.
- `deploy/hostinger/`: Docker Compose deployment for the existing Hostinger VPS and Traefik.
- `src/lib/web-posts.ts`: cloud-acknowledged post persistence and local feed merge.
- `src/hooks/use-app-data.ts`: browser/native branches, feed refresh, and local interactions.
- `src/components/auth/SignInForm.tsx`, `src/lib/auth.ts`: backup-based login and browser session behavior.
- `src-tauri/src/reticulum_bridge.rs`: discovery and spool-only operations.
- `src-tauri/src/iroh_node.rs`, `src-tauri/src/lib.rs`: native endpoint, ticket commands, Nostr publishing and ingest.
- `src-tauri/Cargo.toml`: Full/Yard feature differences.

## Upstream references checked

- [Hostinger build settings](https://docs.hostinger.com/node.js/build-settings.md): runtimes, package managers, artifacts/entry points.
- [Hostinger process handling](https://docs.hostinger.com/node.js/overview.md): managed apps stop when idle.
- [Hostinger hosting options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/): managed versus VPS.
- [Iroh browser limitations](https://docs.iroh.computer/languages/wasm-browser): separate WASM build, relay-only browser connections.
- [Iroh relays](https://docs.iroh.computer/concepts/relays): direct-path negotiation and encrypted fallback.
- [Reticulum interfaces](https://reticulum.network/manual/interfaces.html): LAN discovery and TCP transport capabilities of the upstream stack, not proof of BlkSpace integration.
- [Tauri mobile prerequisites](https://v2.tauri.app/start/prerequisites/): Android SDK/NDK and macOS/Xcode for iOS.
