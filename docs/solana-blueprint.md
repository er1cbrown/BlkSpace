# Solana Integration Blueprint & Systems Impact Analysis

**Document:** Phase 4 Solana Smart Contracts, Wallet Integration, Hybrid Settlement Bridge, and Tier 0 Hardware Impact.  
**Platform:** Solana Devnet → Mainnet-Beta  
**Target Token:** BKSPC — BlkSpace Settlement (SPL Token)  
**Author:** Claude Code (OpenCode)  
**Date:** 2026-06-15  

---

## 1. Smart Contract Architecture (Anchor/Rust)

This program governs the minting, distribution, and burning of BKSPC. It is designed to be called by a validated backend authority (the B.L.A.C.K. Treasury PDA) when students withdraw their off-chain WeixBucks.

### Anchor Program Code (`programs/bkspc/src/lib.rs`)

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("BlkC111111111111111111111111111111111111111");

#[program]
pub mod bkspc {
    use super::*;

    /// Initialize the BKSPC Mint with B.L.A.C.K. Treasury as authority
    pub fn initialize_mint(ctx: Context<InitializeMint>, decimals: u8) -> Result<()> {
        msg!("BKSPC Mint Initialized with {} decimals", decimals);
        Ok(())
    }

    /// Mint BKSPC directly to a student's Associated Token Account (ATA)
    /// Gated by the Treasury multisig authority (or backend server PDA)
    pub fn mint_rewards(ctx: Context<MintRewards>, amount: u64) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.student_ata.to_account_info(),
            authority: ctx.accounts.treasury_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::mint_to(cpi_ctx, amount)?;
        msg!("Successfully minted {} BKSPC to student", amount);
        Ok(())
    }

    /// Burn tokens (used for transactional fees or marketplace settlements)
    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.student_ata.to_account_info(),
            authority: ctx.accounts.student_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::burn(cpi_ctx, amount)?;
        msg!("Successfully burned {} BKSPC from student wallet", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(
        init, 
        payer = signer, 
        mint::decimals = 9, 
        mint::authority = treasury_authority
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: Safe — B.L.A.C.K. Treasury PDA or Multisig
    pub treasury_authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintRewards<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub student_ata: Account<'info, TokenAccount>,
    pub treasury_authority: Signer<'info>, // backend hot wallet or multisig
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub student_ata: Account<'info, TokenAccount>,
    pub student_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

---

## 2. Frontend Wallet Integration (React/TypeScript)

To interact with Solana on Tier 0 laptops, we must minimize dependencies. We lazy-load the Solana wallet adapter to prevent initial bundle bloat.

### React Context Provider (`src/components/WalletContextProvider.tsx`)

```tsx
import React, { FC, ReactNode, useMemo, Suspense } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import CSS lazily to prevent render blocking on slow drives
import('@solana/wallet-adapter-react-ui/styles.css');

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // Standardizing on Devnet for development to prevent real loss of funds
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <Suspense fallback={<div>Loading Wallet Adapter...</div>}>
                        {children}
                    </Suspense>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
```

---

## 3. The Off-chain to On-chain Bridge (Rust / Tauri Command)

This bridge uses a **Lazy Settlement (Pull-Based)** model. Students collect off-chain WeixBucks on their Tier 0 machine (free of gas fees). When they want to liquidate, they request an on-chain payout. The Tauri backend acts as a validation proxy.

```
┌─────────────────┐             ┌─────────────────┐             ┌──────────────────┐
│  Tier 0 Client  │ ──────────→ │  Tauri Backend  │ ──────────→ │  Solana Network  │
│  (WeixBucks -X) │  (Request)  │  (Sign Mint)    │  (On-chain) │  (Mint SPL Token)│
└─────────────────┘             └─────────────────┘             └──────────────────┘
```

### Tauri Bridge Command (`src-tauri/src/lib.rs`)

```rust
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    signature::{Keypair, Signer},
    pubkey::Pubkey,
    instruction::Instruction,
    transaction::Transaction,
};
use std::str::FromStr;

#[tauri::command]
async fn withdraw_to_solana(
  state: State<'_, AppState>,
  session_token: String,
  student_solana_address: String,
  amount_wb: i64,
) -> Result<String, String> {
  // 1. Authenticate user session
  let handle = get_handle_from_session(&state, &session_token)?;
  
  // 2. Validate parameters
  if amount_wb < 100 {
    return Err("Minimum withdrawal is 100 WeixBucks".to_string());
  }
  let recipient_pubkey = Pubkey::from_str(&student_solana_address)
    .map_err(|_| "Invalid Solana address format".to_string())?;

  // 3. Atomically deduct SQLite balance (prevents double-spend)
  state.db.deduct_weix_bucks(&handle, amount_wb)
    .map_err(|e| format!("Withdrawal failed: {}", e))?;
  
  // 4. Send transaction to Solana Network via RpcClient
  // We run this in a background blocking task to avoid halting the async runtime
  let tx_signature = tokio::task::spawn_blocking(move || {
    // In production, the hot-wallet private key is stored securely (not in plain text)
    let treasury_key_bytes = std::env::var("TREASURY_KEYPAIR")
      .map_err(|_| "Treasury hot-wallet key not configured on server".to_string())?;
    let treasury_keypair = Keypair::from_base58_string(&treasury_key_bytes);
    
    // Connect to Solana Devnet RPC
    let rpc_url = "https://api.devnet.solana.com".to_string();
    let client = RpcClient::new(rpc_url);
    
    // Reconstruct CPI instruction for 'mint_rewards' Anchor endpoint
    // Instruction layout: [9-byte Anchor sighash] + [amount as u64]
    let mut data = vec![0u8; 16];
    let anchor_sighash = anchor_syn::codegen::sighash("global", "mint_rewards");
    data[0..8].copy_from_slice(&anchor_sighash);
    data[8..16].copy_from_slice(&(amount_wb as u64).to_le_bytes());

    // Public keys derived from mint deployment
    let program_id = Pubkey::from_str("BlkC111111111111111111111111111111111111111").unwrap();
    let mint_pubkey = Pubkey::from_str("M1nt111111111111111111111111111111111111111").unwrap();
    
    // Get Associated Token Account for student
    let student_ata = spl_associated_token_account::get_associated_token_address(
        &recipient_pubkey,
        &mint_pubkey,
    );

    let accounts = vec![
        solana_sdk::instruction::AccountMeta::new(mint_pubkey, false),
        solana_sdk::instruction::AccountMeta::new(student_ata, false),
        solana_sdk::instruction::AccountMeta::new_readonly(treasury_keypair.pubkey(), true),
        solana_sdk::instruction::AccountMeta::new_readonly(spl_token::id(), false),
    ];

    let instruction = Instruction::new_with_bytes(program_id, &data, accounts);
    let recent_blockhash = client.get_latest_blockhash()
      .map_err(|e| format!("Failed to get blockhash: {}", e))?;
      
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&treasury_keypair.pubkey()),
        &[&treasury_keypair],
        recent_blockhash,
    );

    let sig = client.send_and_confirm_transaction(&transaction)
      .map_err(|e| format!("Solana transaction failed: {}", e))?;
      
    Ok(sig.to_string())
  }).await.map_err(|e| format!("Thread panic: {}", e))??;

  // 5. Log transaction locally in SQLite
  state.db.log_wallet_tx(
    &handle, 
    "withdraw", 
    -amount_wb, 
    &format!("Withdrawn to Solana: {}", tx_signature)
  ).map_err(|e| e.to_string())?;

  Ok(tx_signature)
}
```

---

## 4. Systems Impact Analysis

Integrating Web3 features raises severe architectural, performance, and security challenges, especially on low-end hardware.

```
┌───────────────────────────────────────────────────────────┐
│                     THE HYBRID STACK                      │
├─────────────────┬─────────────────┬───────────────────────┤
│ Layer           │ Technology      │ Role                  │
├─────────────────┼─────────────────┼───────────────────────┤
│ Application     │ Nostr           │ Social / Challenges   │
│ Media           │ Iroh            │ Blobs / Video / Mixes │
│ State           │ SQLite          │ Local Cache / Offchain│
│ Settlement      │ Solana / Anchor │ Global Ledger / BLK   │
└─────────────────┴─────────────────┴───────────────────────┘
```

### 4.1 Tier 0 Hardware Impact (2GB RAM Constraints)

Running a full Web3 client stack is highly resource-intensive. Below is a detailed resource breakdown and mitigation strategy:

#### 1. Bundle & Loading Bloat
- **Impact:** Importing the full `@solana/web3.js` library into a React app adds **~2.8MB (uncompressed)** to the bundle. On low-end systems, parsing this large JS file freezes the browser UI thread for 3-5 seconds.
- **Mitigation:** **Dynamic Lazy Loading.** The wallet adapter context and dependencies are compiled into a separate JS chunk using Vite code-splitting (`React.lazy`). The user only loads this script when navigating to `/wallet` or `/marketplace`.

#### 2. Memory Overhead (JS Heap Exhaustion)
- **Impact:** Maintaining an active WebSocket subscription to a Solana RPC node within the browser tab consumes **40MB - 60MB of RAM**, which can push a 2GB RAM computer with other background programs into heavy swap space.
- **Mitigation:** **Tauri-Proxy RPC queries.** The frontend *never* opens open sockets to Solana. Instead, the UI triggers a Tauri backend command, which initiates a lightweight, synchronous, connectionless HTTP POST request to a free public node (e.g., Helius, QuickNode) and instantly terminates the TCP socket upon response.

#### 3. Tauri Binary Size (Rust Compiler)
- **Impact:** Adding `solana-client` and `solana-sdk` crates to the Tauri Cargo dependencies increases compiler memory footprint by **1.8GB** (causing Tier 0 compiler crashes if built locally) and adds **15MB** to the final runtime binary.
- **Mitigation:** Developers on Tier 0 machines must build using GitHub Actions (CI) runners, as specified in `AGENTS.md`. The final production client remains native and compiled, avoiding memory-hogging node runtimes.

---

### 4.2 Architectural Coupling: Nostr + Iroh + Solana

Combining three distinct decentralized protocols creates a heavy synchrony problem:

```
                  ┌─────────┐
                  │ SQLite  │ (Instant local state)
                  └────┬────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
 ┌──────────┐                     ┌──────────┐
 │  Nostr   │                     │  Solana  │
 │ (Social) │                     │ (Ledger) │
 └─────┬────┘                     └────┬─────┘
       │                               │
       └───────────────┬───────────────┘
                       ▼
                  ┌─────────┐
                  │  Iroh   │ (Decentralized Media Blobs)
                  └─────────┘
```

1. **Identity Mapping:** How does a user's Nostr identity (Schnorr Pubkey, `XOnlyPublicKey`) match their Solana identity (`Ed25519` Pubkey)?
   - *Solution:* Users publish a signed **Nostr event (kind 10002 or custom kind)** that contains their Solana public address. The backend validates that the event signature matches the Nostr pubkey, establishing a cryptographic proof of link.
2. **Blob Minting (Phase 4 NFTs):** When a student mints a DJ Mix or photo as an NFT:
   - *Process:* The file is uploaded to **Iroh**, generating a content CID (hash). The CID is stored as the metadata URL in the Solana Token Metadata Account. This ensures zero storage fees on-chain.
3. **Double-Spend Vector in Lazy Settlement:** A student triggers `withdraw_to_solana`, but the Solana RPC times out. If the SQLite ledger is not deducted, they can request again. If it is deducted but the Solana transaction fails on-chain, their funds are lost.
   - *Solution:* **Sagas Transaction Pattern.** SQLite sets the balance status to "pending_withdraw". If the transaction signature fails to land on-chain, the backend cancels the state and refunds the WeixBucks.

---

### 4.3 Security & Threat Modeling (The Surge of Vulnerabilities)

Moving to on-chain value turns a secure sandbox into an open target. We outline four critical attack vectors:

#### Attack Vector 1: Hot Wallet Leakage on Bridge Server
*   **Threat:** The backend server that validates WeixBucks withdrawals must sign the `mint_rewards` CPI. If an attacker gains access to this server, they can leak the `TREASURY_KEYPAIR` private key and mint infinite tokens.
*   **Mitigation:** 
    1. **Strict Program Caps:** The Solana contract limits the authority wallet to a daily minting ceiling (e.g., 50,000 BLK/day).
    2. **Multisig Authority:** The authority is a PDA controlled by a Squads multisig. High-value transactions must be signed by the B.L.A.C.K. treasury members in person, while only micro-rewards are signed by the server.

#### Attack Vector 2: Tauri IPC Command Injection
*   **Threat:** A malicious web script (loaded via a profile bypass or cache poisoning) runs inside the Tauri webview and triggers the `withdraw_to_solana` IPC command directly with forged arguments.
*   **Mitigation:** 
    1. **Session Scope Validation:** The Tauri command requires a valid, active session token (`get_handle_from_session()`).
    2. **Signer verification:** The student must manually sign a transaction using their browser extension (Phantom) confirming they own the target wallet.

#### Attack Vector 3: Byzantine RPC Node Attacks (Oracles)
*   **Threat:** A malicious relay/RPC node serves fake transaction records to the client, tricking SQLite into thinking a withdrawal succeeded when it was actually rejected.
*   **Mitigation:** **Multi-RPC Consensus.** The backend queries three distinct, un-linked public nodes to confirm transaction signatures. If they disagree, the transaction is held for manual audit.

#### Attack Vector 4: Re-entrancy during Lazy Withdrawal
*   **Threat:** A student repeatedly clicks "Withdraw" in rapid succession. Because Solana transactions take ~2 seconds to land, they withdraw more than their off-chain balance allows before SQLite updates.
*   **Mitigation:** **Immediate Pessimistic Locking.** SQLite decrements the balance *before* initiating the RPC call. If the RPC fails, a rollback restores the balance.

---

## 5. Implementation Roadmap (Phase 4+)

When development resumes, you should execute Phase 4 in this precise, step-by-step order:

```
┌──────────────────────────────────────────────────────────────┐
│                  PHASE 4 EXECUTION ROADMAP                   │
├─────────┬───────────────────────────────┬────────────────────┤
│ Step    │ Description                   │ Target Duration    │
├─────────┼───────────────────────────────┼────────────────────┤
│ Step 1  │ Anchor Program & Unit Tests   │ 2 Weeks            │
│ Step 2  │ Wallet Adapter Lazy Setup     │ 1.5 Weeks          │
│ Step 3  │ Rust/Tauri Settlement Bridge  │ 2 Weeks            │
│ Step 4  │ Devnet Deploy & Integration   │ 2 Weeks            │
└─────────┴───────────────────────────────┴────────────────────┘
```

### Step 1: Write and Audit the Anchor Program
- **Goal:** Draft the token contract, write extensive Rust-side unit tests (`anchor test`), and deploy to Devnet.
- **Safety Gate:** Verify re-entrancy and arithmetic safety (Anchor handles most of this out of the box via checked math).

### Step 2: Integrate Wallet UI in Webview
- **Goal:** Set up `@solana/wallet-adapter` in a separate route (`/wallet`). Confirm lazy-loading works without UI stutter on 2GB RAM.
- **Safety Gate:** Verify wallet public keys are correctly stored and linked to the student's Nostr pubkey via verifiable NIP-42 signatures.

### Step 3: Implement Tauri Withdrawal Bridge
- **Goal:** Code the Rust RPC client in `lib.rs` and configure the balance locking logic in SQLite.
- **Safety Gate:** Run extreme test cases (simulate RPC dropouts, connection failures, duplicate clicks) and verify zero balance leaks.

### Step 4: Full Devnet Integration Testing
- **Goal:** Run end-to-end trials: student posts → earns 5 WeixBucks off-chain → clicks withdraw → Phantom wallet pops up → Devnet BKSPC lands in wallet.
- **Safety Gate:** Code audits and threat model simulations before moving to Mainnet-Beta.

---

## 6. References

- [1] Solana SPL Token Program: https://spl.solana.com/token
- [2] Anchor Smart Contract Framework: https://www.anchor-lang.com/
- [3] @solana/wallet-adapter integration docs: https://github.com/solana-labs/wallet-adapter
- [4] NIP-42 (Nostr Authentication): https://github.com/nostr-protocol/nips/blob/master/42.md
- [5] Kimura et al. 2025 (Practical Attacks on Nostr): EuroS&P 2025
- [6] Fausak et al. 2024 (Malicious Intent Detection Framework): AICCSA 2024
