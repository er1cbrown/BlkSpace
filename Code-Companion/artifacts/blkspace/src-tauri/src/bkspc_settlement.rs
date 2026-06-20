//! Devnet BKSPC settlement via SPL `mint_to` + 2-of-2 treasury multisig.
//! Cargo feature: `bkspc-devnet`. Mainnet value requires counsel + audit (see docs).

use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
  pubkey::Pubkey,
  signature::{Keypair, Signer},
  transaction::Transaction,
};
use spl_associated_token_account::{
  get_associated_token_address,
  instruction::create_associated_token_account_idempotent,
};
use spl_token::instruction::mint_to;
use std::fs;
use std::path::Path;
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BkspcSettlementStatus {
  pub wired: bool,
  pub cluster: Option<String>,
  pub mint: Option<String>,
  pub mint_authority: Option<String>,
  pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BkspcMintManifest {
  cluster: String,
  rpc_url: String,
  mint: String,
  mint_authority: String,
  treasury_signer_paths: Option<Vec<String>>,
  wb_to_bkspc_ratio: i64,
  decimals: u8,
  on_chain_ready: Option<bool>,
}

struct DevnetSettlementConfig {
  rpc_url: String,
  mint: Pubkey,
  multisig_authority: Pubkey,
  signer_a: Keypair,
  signer_b: Keypair,
  wb_to_bkspc_ratio: i64,
  decimals: u8,
}

fn load_keypair(path: &Path) -> Result<Keypair, String> {
  let bytes: Vec<u8> = serde_json::from_str(
    &fs::read_to_string(path).map_err(|e| format!("read keypair {path:?}: {e}"))?,
  )
  .map_err(|e| format!("parse keypair {path:?}: {e}"))?;
  Keypair::from_bytes(&bytes).map_err(|e| format!("invalid keypair {path:?}: {e}"))
}

fn manifest_path() -> Option<String> {
  if let Ok(path) = std::env::var("BKSPC_DEVNET_MANIFEST") {
    return Some(path);
  }
  None
}

fn load_config() -> Result<DevnetSettlementConfig, String> {
  let path = manifest_path().ok_or_else(|| {
    "BKSPC_DEVNET_MANIFEST not set (path to devnet/bkspc-mint.json)".to_string()
  })?;
  let raw = fs::read_to_string(&path)
    .map_err(|e| format!("read manifest {path}: {e}"))?;
  let manifest: BkspcMintManifest = serde_json::from_str(&raw)
    .map_err(|e| format!("parse manifest {path}: {e}"))?;

  if manifest.cluster != "devnet" {
    return Err(format!(
      "Refusing settlement on cluster '{}' (devnet only)",
      manifest.cluster
    ));
  }
  if !manifest.rpc_url.contains("devnet") && std::env::var("BKSPC_ALLOW_NON_DEVNET").is_err() {
    return Err("Refusing non-devnet RPC in manifest".into());
  }
  if manifest.on_chain_ready == Some(false) {
    return Err("Manifest marks onChainReady=false".into());
  }

  let signer_paths = manifest
    .treasury_signer_paths
    .ok_or_else(|| "treasurySignerPaths missing from manifest".to_string())?;
  if signer_paths.len() < 2 {
    return Err("Need two treasury signer keypair paths".into());
  }

  let signer_a = load_keypair(Path::new(&signer_paths[0]))?;
  let signer_b = load_keypair(Path::new(&signer_paths[1]))?;

  Ok(DevnetSettlementConfig {
    rpc_url: manifest.rpc_url,
    mint: Pubkey::from_str(&manifest.mint).map_err(|e| e.to_string())?,
    multisig_authority: Pubkey::from_str(&manifest.mint_authority).map_err(|e| e.to_string())?,
    signer_a,
    signer_b,
    wb_to_bkspc_ratio: manifest.wb_to_bkspc_ratio,
    decimals: manifest.decimals,
  })
}

fn wb_to_raw_amount(amount_wb: i64, ratio: i64, decimals: u8) -> Result<u64, String> {
  if amount_wb <= 0 || ratio <= 0 {
    return Err("Invalid withdrawal amount".into());
  }
  let scale = 10u64
    .checked_pow(decimals as u32)
    .ok_or_else(|| "Invalid token decimals".to_string())?;
  let num = (amount_wb as u128)
    .checked_mul(scale as u128)
    .ok_or_else(|| "Amount overflow".to_string())?;
  let raw = num / ratio as u128;
  if raw == 0 {
    return Err(format!(
      "Withdrawal too small for on-chain mint (min {ratio} WB = 1 BKSPC)"
    ));
  }
  u64::try_from(raw).map_err(|_| "Mint amount overflow".to_string())
}

pub fn settlement_status() -> BkspcSettlementStatus {
  match load_config() {
    Ok(cfg) => BkspcSettlementStatus {
      wired: true,
      cluster: Some("devnet".into()),
      mint: Some(cfg.mint.to_string()),
      mint_authority: Some(cfg.multisig_authority.to_string()),
      reason: None,
    },
    Err(reason) => BkspcSettlementStatus {
      wired: false,
      cluster: None,
      mint: None,
      mint_authority: None,
      reason: Some(reason),
    },
  }
}

/// Mint BKSPC to recipient ATA after off-chain WB debit. Treasury 2-of-2 must sign.
pub fn mint_settlement_to_recipient(
  recipient_address: &str,
  amount_wb: i64,
) -> Result<String, String> {
  let config = load_config()?;
  let recipient = Pubkey::from_str(recipient_address)
    .map_err(|_| "Invalid Solana recipient address".to_string())?;
  let raw_amount = wb_to_raw_amount(amount_wb, config.wb_to_bkspc_ratio, config.decimals)?;

  let client = RpcClient::new(config.rpc_url.clone());
  let ata = get_associated_token_address(&recipient, &config.mint);

  let create_ata_ix = create_associated_token_account_idempotent(
    &config.signer_a.pubkey(),
    &recipient,
    &config.mint,
    &spl_token::ID,
  );

  let mint_ix = mint_to(
    &spl_token::ID,
    &config.mint,
    &ata,
    &config.multisig_authority,
    &[&config.signer_a.pubkey(), &config.signer_b.pubkey()],
    raw_amount,
  )
  .map_err(|e| format!("build mint_to ix: {e}"))?;

  let blockhash = client
    .get_latest_blockhash()
    .map_err(|e| format!("RPC blockhash: {e}"))?;

  let tx = Transaction::new_signed_with_payer(
    &[create_ata_ix, mint_ix],
    Some(&config.signer_a.pubkey()),
    &[&config.signer_a, &config.signer_b],
    blockhash,
  );

  let signature = client
    .send_and_confirm_transaction(&tx)
    .map_err(|e| format!("devnet mint_to failed: {e}"))?;

  Ok(signature.to_string())
}