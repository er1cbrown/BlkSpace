# Campus account recovery

**Status:** Implemented 2026-08-26  
**Why:** Average HBCU users will not save a BIP39 phrase. Forcing a checkbox is theater.

## What users do

| Path | Who | How they get back in |
|---|---|---|
| **Native app, same device** (default) | Desktop users | Rust KeyStore re-signs the login challenge; no password or backup file |
| **Recovery phrase** | New device / advanced | 24 words on `/recover` |
| **Encrypted backup file** | Web or migrated account | Backup password + `blkspace-backup-*.json` |

BlkSpace **cannot** reset a forgotten password or recreate a lost Nostr key. The encrypted file and recovery phrase are user-held recovery material; the native same-device path does not require either one.

## What we will not ship as “forgot password”

An email magic link that recreates the nsec without a secret the user has. That is custodial Instagram, and it breaks the Nostr identity.

Later (mobile): **passkey / iCloud Keychain** can wrap the same nsec so Face ID on a new iPhone works — still the user’s Apple/Google account, not our reset desk.

## Code

- `src/lib/account-backup.ts` — PBKDF2 + AES-GCM
- `src/components/auth/RecoverySetup.tsx` — native same-device confirmation; web backup setup
- `/login` — native stored-key sign-in, with explicit recovery fallbacks
- `/recover` — recovery phrase or encrypted backup file
- Settings → Get back in — add a backup later

Tests: `src/test/account-backup.test.ts`. Device B e2e uses the password path.
