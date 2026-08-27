# Campus account recovery (no 24-word default)

**Status:** Implemented 2026-08-26  
**Why:** Average HBCU users will not save a BIP39 phrase. Forcing a checkbox is theater.

## What users do

| Path | Who | How they get back in |
|---|---|---|
| **Recovery password** (default) | Almost everyone | Password + `blkspace-backup-*.json` (Drive / iCloud / email-to-self) |
| **24 words** | Optional / advanced | Paper phrase on `/recover` |
| **This device only** | Skip (warned) | Lose the laptop → handle is gone |

BlkSpace **cannot** reset a forgotten password. The file is ciphertext. That is the honest trade for not holding keys.

## What we will not ship as “forgot password”

An email magic link that recreates the nsec without a secret the user has. That is custodial Instagram, and it breaks the Nostr identity.

Later (mobile): **passkey / iCloud Keychain** can wrap the same nsec so Face ID on a new iPhone works — still the user’s Apple/Google account, not our reset desk.

## Code

- `src/lib/account-backup.ts` — PBKDF2 + AES-GCM
- `src/components/auth/RecoverySetup.tsx` — welcome + signup
- `/recover` — password file or 24 words
- Settings → Get back in — add a backup later

Tests: `src/test/account-backup.test.ts`. Device B e2e uses the password path.
