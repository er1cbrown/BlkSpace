//! Devnet BKSPC settlement via SPL `mint_to` + 2-of-2 treasury multisig.
//! Cargo feature: `bkspc-devnet`. Mainnet value requires counsel + audit (see docs).

use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcTransactionConfig;
use solana_sdk::{
  commitment_config::CommitmentConfig,
  pubkey::Pubkey,
  signature::{Keypair, Signature, Signer},
  transaction::Transaction,
};
use solana_transaction_status::{
  option_serializer::OptionSerializer,
  EncodedTransaction,
  ParsedInstruction,
  UiInstruction,
  UiMessage,
  UiTransactionEncoding,
};
use spl_associated_token_account::{
  get_associated_token_address,
  instruction::create_associated_token_account_idempotent,
};
use spl_token::instruction::{burn, mint_to};
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
  pub rpc_url: Option<String>,
  pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BkspcBurnPrepare {
  pub transaction_base64: String,
  pub blockhash: String,
  pub last_valid_block_height: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BkspcPurchaseQuote {
  pub listing_price_wb: i64,
  pub platform_fee_wb: i64,
  pub total_wb: i64,
  pub burn_raw_amount: u64,
  pub burn_bkspc_display: String,
  pub mint: String,
  pub wb_to_bkspc_ratio: i64,
  pub decimals: u8,
  pub marketplace_fee_bps: i64,
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

pub(crate) struct DevnetSettlementConfig {
  pub rpc_url: String,
  pub mint: Pubkey,
  pub multisig_authority: Pubkey,
  pub signer_a: Keypair,
  pub signer_b: Keypair,
  pub wb_to_bkspc_ratio: i64,
  pub decimals: u8,
}

fn load_keypair(path: &Path) -> Result<Keypair, String> {
  let bytes: Vec<u8> = serde_json::from_str(
    &fs::read_to_string(path).map_err(|e| format!("read keypair {path:?}: {e}"))?,
  )
  .map_err(|e| format!("parse keypair {path:?}: {e}"))?;
  Keypair::try_from(&bytes[..]).map_err(|e| format!("invalid keypair {path:?}: {e}"))
}

fn manifest_path() -> Option<String> {
  if let Ok(path) = std::env::var("BKSPC_DEVNET_MANIFEST") {
    return Some(path);
  }
  let candidates = [
    "Code-Companion/artifacts/solana/devnet/bkspc-mint.json",
    "artifacts/solana/devnet/bkspc-mint.json",
  ];
  for c in &candidates {
    if Path::new(c).is_file() {
      return Some(c.to_string());
    }
  }
  None
}

pub(crate) fn load_config() -> Result<DevnetSettlementConfig, String> {
  let path = manifest_path().ok_or_else(|| {
    "BKSPC devnet manifest not found. Set BKSPC_DEVNET_MANIFEST or place manifest at Code-Companion/artifacts/solana/devnet/bkspc-mint.json".to_string()
  })?;
  let raw = fs::read_to_string(&path).map_err(|e| format!("read manifest {path}: {e}"))?;
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

pub fn wb_to_raw_amount(amount_wb: i64, ratio: i64, decimals: u8) -> Result<u64, String> {
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

fn calc_platform_fee(amount: i64, fee_bps: i64) -> i64 {
  (amount * fee_bps + 9999) / 10000
}

pub fn marketplace_purchase_quote(price_wb: i64, marketplace_fee_bps: i64) -> Result<BkspcPurchaseQuote, String> {
  if price_wb <= 0 {
    return Err("Listing price must be positive".into());
  }
  let config = load_config()?;
  let platform_fee_wb = calc_platform_fee(price_wb, marketplace_fee_bps);
  // Buyer burns listing price only; platform fee is deducted from seller net (same as WB rail).
  let total_wb = price_wb;
  let burn_raw = wb_to_raw_amount(price_wb, config.wb_to_bkspc_ratio, config.decimals)?;
  let scale = 10f64.powi(config.decimals as i32);
  let display = (burn_raw as f64) / scale;

  Ok(BkspcPurchaseQuote {
    listing_price_wb: price_wb,
    platform_fee_wb,
    total_wb,
    burn_raw_amount: burn_raw,
    burn_bkspc_display: format!("{display:.9}").trim_end_matches('0').trim_end_matches('.').to_string(),
    mint: config.mint.to_string(),
    wb_to_bkspc_ratio: config.wb_to_bkspc_ratio,
    decimals: config.decimals,
    marketplace_fee_bps,
  })
}

pub fn settlement_status() -> BkspcSettlementStatus {
  match load_config() {
    Ok(cfg) => BkspcSettlementStatus {
      wired: true,
      cluster: Some("devnet".into()),
      mint: Some(cfg.mint.to_string()),
      mint_authority: Some(cfg.multisig_authority.to_string()),
      rpc_url: Some(cfg.rpc_url.clone()),
      reason: None,
    },
    Err(reason) => BkspcSettlementStatus {
      wired: false,
      cluster: None,
      mint: None,
      mint_authority: None,
      rpc_url: None,
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

fn spl_burn_amount_from_instructions(
  instructions: &[UiInstruction],
  mint: &str,
  authority: &str,
) -> Result<u64, String> {
  let mut total = 0u64;
  for ix in instructions {
    let UiInstruction::Parsed(parsed) = ix else {
      continue;
    };
    if parsed.program_id != spl_token::ID.to_string() {
      continue;
    }
    let ParsedInstruction::Parsed(info) = &parsed.parsed else {
      continue;
    };
    if info.type_ != "burn" {
      continue;
    }
    let Some(info_mint) = info.info.get("mint").and_then(|v| v.as_str()) else {
      continue;
    };
    let Some(info_auth) = info.info.get("authority").and_then(|v| v.as_str()) else {
      continue;
    };
    if info_mint != mint || info_auth != authority {
      continue;
    }
    let amount_str = info
      .info
      .get("amount")
      .and_then(|v| v.as_str())
      .ok_or_else(|| "Burn instruction missing amount".to_string())?;
    let amount: u64 = amount_str
      .parse()
      .map_err(|_| format!("Invalid burn amount: {amount_str}"))?;
    total = total
      .checked_add(amount)
      .ok_or_else(|| "Burn amount overflow".to_string())?;
  }
  Ok(total)
}

/// Verify a confirmed devnet SPL **burn** (not transfer) from the buyer for marketplace payment.
pub fn verify_bkspc_burn_transaction(
  signature: &str,
  buyer_wallet: &str,
  min_raw_burn: u64,
) -> Result<u64, String> {
  let config = load_config()?;
  let buyer = Pubkey::from_str(buyer_wallet).map_err(|_| "Invalid buyer wallet".to_string())?;
  let client = RpcClient::new(config.rpc_url);

  let tx_config = RpcTransactionConfig {
    encoding: Some(UiTransactionEncoding::JsonParsed),
    commitment: Some(CommitmentConfig::confirmed()),
    max_supported_transaction_version: Some(0),
  };

  let sig = Signature::from_str(signature).map_err(|_| "Invalid burn tx signature".to_string())?;
  let confirmed = client
    .get_transaction_with_config(&sig, tx_config)
    .map_err(|e| format!("fetch burn tx: {e}"))?;

  let meta = confirmed
    .transaction
    .meta
    .as_ref()
    .ok_or_else(|| "Burn tx missing metadata".to_string())?;
  if meta.err.is_some() {
    return Err("Burn transaction failed on-chain".into());
  }

  let mint_str = config.mint.to_string();
  let buyer_str = buyer.to_string();
  let mut burned = 0u64;

  let EncodedTransaction::Json(ui_tx) = &confirmed.transaction.transaction else {
    return Err("Expected JSON-encoded transaction for burn verification".into());
  };
  if let UiMessage::Parsed(parsed_msg) = &ui_tx.message {
    burned = burned.saturating_add(spl_burn_amount_from_instructions(
      &parsed_msg.instructions,
      &mint_str,
      &buyer_str,
    )?);
  }

  if let OptionSerializer::Some(inner) = &meta.inner_instructions {
    for group in inner {
      burned = burned.saturating_add(spl_burn_amount_from_instructions(
        &group.instructions,
        &mint_str,
        &buyer_str,
      )?);
    }
  }

  if burned == 0 {
    return Err(
      "No SPL burn instruction found for buyer BKSPC ATA (transfers are not accepted)".into(),
    );
  }

  if burned < min_raw_burn {
    return Err(format!(
      "Burn amount {burned} raw is less than required {min_raw_burn} raw BKSPC"
    ));
  }

  Ok(burned)
}

/// Build an unsigned SPL burn tx via Tauri RPC (no browser WebSocket).
pub fn prepare_bkspc_burn_transaction(
  buyer_wallet: &str,
  burn_raw_amount: u64,
) -> Result<BkspcBurnPrepare, String> {
  if burn_raw_amount == 0 {
    return Err("Burn amount must be positive".into());
  }
  let config = load_config()?;
  let buyer = Pubkey::from_str(buyer_wallet).map_err(|_| "Invalid buyer wallet".to_string())?;
  let client = RpcClient::new(config.rpc_url.clone());
  let ata = get_associated_token_address(&buyer, &config.mint);

  let burn_ix = burn(
    &spl_token::ID,
    &ata,
    &config.mint,
    &buyer,
    &[],
    burn_raw_amount,
  )
  .map_err(|e| format!("build burn ix: {e}"))?;

  let blockhash = client
    .get_latest_blockhash()
    .map_err(|e| format!("RPC blockhash: {e}"))?;
  let last_valid_block_height = client
    .get_block_height()
    .map_err(|e| format!("RPC block height: {e}"))?;

  let mut tx = Transaction::new_with_payer(&[burn_ix], Some(&buyer));
  tx.message.recent_blockhash = blockhash;

  let bytes = bincode::serialize(&tx).map_err(|e| format!("serialize tx: {e}"))?;
  let transaction_base64 =
    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);

  Ok(BkspcBurnPrepare {
    transaction_base64,
    blockhash: blockhash.to_string(),
    last_valid_block_height,
  })
}

/// Submit a wallet-signed burn tx via Tauri RPC proxy.
pub fn submit_bkspc_burn_transaction(signed_tx_base64: &str) -> Result<String, String> {
  let config = load_config()?;
  let client = RpcClient::new(config.rpc_url);
  let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, signed_tx_base64)
    .map_err(|e| format!("decode signed tx: {e}"))?;
  let tx: Transaction =
    bincode::deserialize(&bytes).map_err(|e| format!("deserialize signed tx: {e}"))?;

  let signature = client
    .send_and_confirm_transaction(&tx)
    .map_err(|e| format!("submit burn tx: {e}"))?;

  Ok(signature.to_string())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn wb_to_raw_amount_converts_ratio() {
    let raw = wb_to_raw_amount(1000, 1000, 9).expect("convert");
    assert_eq!(raw, 1_000_000_000);
  }

  #[test]
  fn wb_to_raw_amount_rejects_tiny() {
    assert!(wb_to_raw_amount(1, 1000, 9).is_err());
  }

  #[test]
  fn marketplace_platform_fee_math() {
    let fee = (100 * 500 + 9999) / 10000;
    assert_eq!(fee, 5);
  }
}