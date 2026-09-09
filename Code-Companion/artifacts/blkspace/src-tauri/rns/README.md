# Bundled native rns / rnsd (Full only)

Drop platform-native `rnsd` and `rns` binaries here (or next to the installed app).

- **Do not** `pip install rns` or ship a Python sidecar.
- **Do not** enable LXMF identity storage.
- **Do not** add RNode serial / BLE interfaces.
- RNS data lives under `{app_data}/rns/`. Nostr keys stay in `{app_data}/keys/`.

Yard builds omit these binaries (`--no-default-features`). Route B stays optional.

Operator override: `BLKSPACE_RNSD` / `BLKSPACE_RNS` pointing at native executables.
