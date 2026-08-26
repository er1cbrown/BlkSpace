# BKSPC Implementation Tickets
## Phase 0 + Phase 1 — Get Real Devnet Mint Live

**Goal:** Complete one successful end-to-end WB → BKSPC conversion on Solana Devnet as fast as possible while staying inside the locked tokenomics policy.

**Related Policy:** [`bkspc-tokenomics-policy.md`](bkspc-tokenomics-policy.md)  
**Existing runbook:** [`bkspc-devnet-runbook.md`](bkspc-devnet-runbook.md)  
**Workspace:** `Code-Companion/artifacts/solana` (`programs/bkspc`)

---

## Repo status (2026-08-26)

Do not recreate the Solana workspace. Gap is **Token-2022 convert path + documented e2e**, not “start from zero.”

| Ticket | Status | What already exists |
|--------|--------|---------------------|
| **0.1** Mint | **Done** | Token-2022 mint `HBcTHr2LEC7wb1Y5Sni8pgBp8ChduHuf4sk2tLgykZPx` on Devnet (decimals 6, BKSPC Coin). Record: [`bkspc-devnet-mint.md`](bkspc-devnet-mint.md). |
| **0.2** Convert ix | **Code complete, not deployed** | `initialize_convert` + `convert_wb_to_bkspc` in `programs/bkspc` (`cargo check` clean). Tests: `tests/bkspc-convert.ts`. Wire: `bun run wire-bkspc-token2022-convert`. **Blocked:** this PC has no `cargo-build-sbf` / `solana` CLI, so the upgraded `.so` is not on Devnet. **Do not** move mint authority until that deploy. PDA will be `55hw5PBVtYCxqgE6rjQrPuAXLtLhpYDxYyPT26bd8gcw`. |
| **0.3** Client helper | **Partial** | `setup-bkspc-devnet`, `init-bkspc-devnet-mint.ts`, `wire-bkspc-program-devnet.ts`. **Missing:** convert-tx helper + “mint X to this wallet” against Token-2022. |
| **1.1** Eligibility | **Mostly done** | `evaluate_withdraw_eligibility` in `db.rs` (age, karma, posts, weekly cap, cooldown, Yard Cred). UI: `WithdrawEligibilityPanel`. **Tighten:** abuse/MIDF flag in the same result; expose `maxConvertibleWb` / `cooldownEndsAt` as the ticket shape. |
| **1.2** Conversion UI | **Partial** | Wallet withdraw panel + `withdraw_to_solana`. Optimistic `EconomicAction` just landed. **Missing:** required disclaimer set, Devnet explorer link, rollback wired to convert ix. |
| **1.3** Accounting | **Partial** | `wallet_tx` + history. **Missing:** `BkspcConversion` status machine + policy version on each attempt. |
| **1.4** E2E proof | **Not done** | `record-devnet-e2e.ts` is a template. No documented signature in `docs/bkspc-devnet-proof.md`. |

**Decimals:** existing example mint is **9**. New Token-2022 mint should use **6** per policy. Do not mix.

**Metadata name:** **BKSPC Coin** / symbol **BKSPC** (not “BlkSpace” in chrome).

---

## Phase 0 — Foundation (On-Chain + Infra)

### Ticket 0.1 — Solana Workspace & Mint Creation
**Priority:** P0  
**Goal:** Have a live Token-2022 mint on Devnet.

**Tasks:**
- [x] Create or restore Solana/Anchor workspace (suggested path: `programs/bkspc` or `artifacts/solana`) — **restore/extend existing**
- [x] Initialize Token-2022 mint on **Devnet** — `HBcTHr2LEC7wb1Y5Sni8pgBp8ChduHuf4sk2tLgykZPx`
- [x] Set decimals (recommend 6) — script uses 6
- [x] Add on-chain metadata (Name: “BKSPC Coin”, Symbol: “BKSPC”, URI) — wired in script + `metadata/bkspc-token.json`
- [x] Set mint authority to a PDA or temporary controlled keypair/multisig — deployer keypair pending convert PDA
- [x] Record mint address, authority, and metadata URI in project config
- [x] Verify mint on Solana Explorer (Devnet)

**Acceptance Criteria:**
- Mint address is public and verifiable on Devnet
- Metadata resolves correctly
- Only the designated authority can mint

---

### Ticket 0.2 — Convert Instruction
**Priority:** P0  
**Goal:** Safe on-chain mint instruction that only the protocol can call.

**Tasks:**
- [x] Write `convert_wb_to_bkspc` (or equivalent) instruction
- [x] Validate amount > 0
- [x] Mint exact BKSPC amount to user’s Associated Token Account
- [x] Ensure ATA is owned by the signing user
- [x] Emit event / log for indexing (`BkspcConverted`)
- [x] Basic unit tests (`tests/bkspc-convert.ts`) — needs local validator
- [ ] Deploy upgraded program to Devnet + `initialize_convert` (moves authority to PDA)

**Instruction Sketch:**
```text
convert_wb_to_bkspc(
  user: Signer,
  amount_bkspc: u64,          // already fee-adjusted
  user_ata: AccountInfo,
  mint: AccountInfo,
  mint_authority: AccountInfo, // PDA
  token_program: AccountInfo,
  ...
)
```

**Acceptance Criteria:**
- Only authority can mint
- Tokens land in the correct user ATA
- Instruction fails cleanly on bad accounts

---

### Ticket 0.3 — Client / SDK Helper
**Priority:** P0  

**Tasks:**
- [ ] TypeScript helper to build the convert transaction
- [ ] Helper to create/get user ATA if missing
- [ ] Devnet RPC configuration
- [ ] Simple script: “mint X BKSPC to this wallet” for testing

**Acceptance Criteria:**
- Can successfully mint to a test wallet from a script

---

## Phase 1 — End-to-End Application Path

### Ticket 1.1 — Eligibility Service
**Priority:** P0  
**Goal:** Single source of truth for “can this user convert right now?”

**Tasks:**
- [x] Implement or harden `evaluate_withdraw_eligibility(user)` — exists in `db.rs`
- [ ] Checks: Yard Cred, account age, activity/posts, weekly cap remaining, cooldown, abuse flags
- [ ] Return clear structured result:
  ```ts
  {
    eligible: boolean
    reason?: string
    maxConvertibleWb?: number
    cooldownEndsAt?: number
    credScore?: number
  }
  ```
- [x] Make thresholds configurable via TokenomicsPolicy — `TokenomicsPolicy::published()`

**Acceptance Criteria:**
- UI can show exactly why a user is blocked
- Weekly cap and cooldown are enforced

---

### Ticket 1.2 — Conversion UI + Optimistic Flow
**Priority:** P0  

**Tasks:**
- [ ] Conversion screen / modal
- [ ] Input WB amount
- [ ] Live preview: WB to debit, fee (1%), BKSPC to receive (1000:1 after fee)
- [ ] Strong required disclaimers:
  - “Optional settlement”
  - “Devnet only”
  - “No guaranteed value or price”
  - “Not investment advice”
- [ ] Optimistic UI: show pending state immediately
- [ ] Background: debit WB → call convert instruction → update status
- [ ] Rollback on failure
- [ ] Success state shows Solana explorer link (Devnet)

**Acceptance Criteria:**
- Full flow works for an eligible test user
- Failure cases roll back cleanly
- Disclaimers are impossible to miss

---

### Ticket 1.3 — Local Accounting + Audit Trail
**Priority:** P0  

**Tasks:**
- [ ] Debit WB only after eligibility passes
- [ ] Write conversion record to local DB with status machine:
  `eligible → pending → submitted → confirmed | failed`
- [ ] Store: amounts, fee, mint tx signature, timestamps, policy version
- [ ] Mirror key events to Nostr (audit)
- [ ] Appear in Transaction History as “BKSPC Settlement (Devnet)”

**Data Shape (minimum):**
```ts
interface BkspcConversion {
  id: string
  userPubkey: string
  wbAmount: number
  feeWb: number
  bkspcAmount: number
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txSignature?: string
  createdAt: number
  confirmedAt?: number
  policyVersion: string
}
```

**Acceptance Criteria:**
- Every attempt is recorded
- History is accurate and filterable

---

### Ticket 1.4 — End-to-End Proof
**Priority:** P0 (Gate)

**Tasks:**
- [ ] Run one complete successful conversion on Devnet with a real test account
- [ ] Document:
  - Wallet addresses
  - WB debited
  - BKSPC received
  - Transaction signature
  - Explorer links
- [ ] Store proof in repo (`docs/releases/` or `docs/bkspc-devnet-proof.md`)

**Acceptance Criteria:**
- Documented, repeatable, successful Devnet conversion exists
- This satisfies the project’s “devnet BKSPC withdrawal proof” gate

---

## Shared Infrastructure (Do Alongside)

| Item | Notes |
|------|-------|
| Reuse `EconomicAction` pattern | Optimistic update → local write → background chain call → status |
| Status badges | Pending / Submitted / Confirmed / Failed |
| Feature flag | `BKSPC_DEVNET_ENABLED` so it can be turned off instantly |
| Error messages | Human-readable (insufficient WB, cooldown, Cred too low, etc.) |

---

## Suggested Execution Order

1. Ticket 0.1 – Mint on Devnet (Token-2022, decimals 6)  
2. Ticket 0.2 – Convert instruction  
3. Ticket 0.3 – Client helper + test mint  
4. Ticket 1.1 – Eligibility service (harden existing)  
5. Ticket 1.2 – Conversion UI  
6. Ticket 1.3 – Accounting + History  
7. Ticket 1.4 – Documented end-to-end proof  

---

## Definition of Done (Phase 0 + 1)

- [x] Live Token-2022 BKSPC mint on Solana Devnet (`HBcTHr2LEC7wb1Y5Sni8pgBp8ChduHuf4sk2tLgykZPx`)
- [ ] Controlled mint authority
- [ ] Eligibility gates enforced in app
- [ ] Full conversion UI with required disclaimers
- [ ] Optimistic + background settlement flow
- [ ] Local + Nostr audit trail
- [ ] At least one successful documented end-to-end conversion
- [ ] Transaction History shows the settlement clearly

Once the above is complete, the project has a **real on-chain settlement path** and has satisfied the next technical gate in the official roadmap.

---

**Next after this:**  
Counsel review of copy + real-user / Cred gates → Mainnet preparation.
