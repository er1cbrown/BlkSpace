//! Metaplex-compatible NFT mint for mixes/media on devnet (SPL mint + metadata PDA).
//! Cargo feature: `bkspc-devnet`. Uses treasury signer A as devnet payer.

use crate::bkspc_settlement::load_config;
use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
  instruction::{AccountMeta, Instruction},
  pubkey::Pubkey,
  signature::{Keypair, Signer},
  system_instruction,
  system_program,
  transaction::Transaction,
};
use spl_associated_token_account::{
  get_associated_token_address,
  instruction::create_associated_token_account_idempotent,
};
use spl_token::instruction::{initialize_mint2, mint_to};
use std::str::FromStr;

const METAPLEX_PROGRAM_ID: Pubkey = solana_sdk::pubkey!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const TOKEN_PROGRAM_ID: Pubkey = spl_token::ID;
/// SPL mint account size (bytes).
const MINT_ACCOUNT_LEN: usize = 82;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NftMintResult {
  pub mint_address: String,
  pub metadata_address: String,
  pub tx_signature: String,
  pub metadata_uri: String,
  pub recipient: String,
}

fn metadata_pda(mint: &Pubkey) -> (Pubkey, u8) {
  Pubkey::find_program_address(
    &[
      b"metadata",
      METAPLEX_PROGRAM_ID.as_ref(),
      mint.as_ref(),
    ],
    &METAPLEX_PROGRAM_ID,
  )
}

fn master_edition_pda(mint: &Pubkey) -> (Pubkey, u8) {
  Pubkey::find_program_address(
    &[
      b"metadata",
      METAPLEX_PROGRAM_ID.as_ref(),
      mint.as_ref(),
      b"edition",
    ],
    &METAPLEX_PROGRAM_ID,
  )
}

fn build_metadata_uri(title: &str, item_type: &str, item_ref: &str, seller: &str) -> String {
  let json = serde_json::json!({
    "name": title,
    "symbol": if item_type == "mix" { "MIX" } else { "MEDIA" },
    "description": format!("BlkSpace {item_type} NFT — Iroh CID access ticket"),
    "image": "",
    "external_url": "https://weixblack.net",
    "attributes": [
      {"trait_type": "item_type", "value": item_type},
      {"trait_type": "iroh_cid", "value": item_ref},
      {"trait_type": "creator", "value": seller},
      {"trait_type": "platform", "value": "BlkSpace"},
    ],
    "properties": {
      "files": [{"uri": item_ref, "type": "audio/mpeg"}],
      "category": "audio",
    }
  });
  // Compact URI — full JSON is stored in SQLite + Nostr 30080 tags.
  let _ = json;
  format!("blkspace://nft/{item_type}/{item_ref}")
}

/// Borsh-encode a string for Metaplex DataV2 name/symbol/uri fields.
fn borsh_string(s: &str) -> Vec<u8> {
  let bytes = s.as_bytes();
  let mut out = Vec::with_capacity(4 + bytes.len());
  out.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
  out.extend_from_slice(bytes);
  out
}

fn build_create_metadata_v3_ix(
  metadata: &Pubkey,
  mint: &Pubkey,
  mint_authority: &Pubkey,
  payer: &Pubkey,
  update_authority: &Pubkey,
  name: &str,
  symbol: &str,
  uri: &str,
) -> Instruction {
  let mut data = vec![33u8]; // CreateMetadataAccountV3
  data.extend(borsh_string(name));
  data.extend(borsh_string(symbol));
  data.extend(borsh_string(uri));
  data.extend_from_slice(&0u16.to_le_bytes()); // seller_fee_basis_points
  data.push(0); // creators: None
  data.push(0); // collection: None
  data.push(0); // uses: None
  data.push(0); // is_mutable: false

  Instruction {
    program_id: METAPLEX_PROGRAM_ID,
    accounts: vec![
      AccountMeta::new(*metadata, false),
      AccountMeta::new_readonly(*mint, false),
      AccountMeta::new_readonly(*mint_authority, true),
      AccountMeta::new(*payer, true),
      AccountMeta::new_readonly(*update_authority, false),
      AccountMeta::new_readonly(system_program::ID, false),
      AccountMeta::new_readonly(solana_sdk::sysvar::rent::ID, false),
    ],
    data,
  }
}

fn build_create_master_edition_v3_ix(
  edition: &Pubkey,
  mint: &Pubkey,
  update_authority: &Pubkey,
  mint_authority: &Pubkey,
  metadata: &Pubkey,
  payer: &Pubkey,
  max_supply: Option<u64>,
) -> Instruction {
  let mut data = vec![17u8]; // CreateMasterEditionV3
  data.push(if max_supply.is_some() { 1 } else { 0 });
  if let Some(s) = max_supply {
    data.extend_from_slice(&s.to_le_bytes());
  }

  Instruction {
    program_id: METAPLEX_PROGRAM_ID,
    accounts: vec![
      AccountMeta::new(*edition, false),
      AccountMeta::new(*mint, false),
      AccountMeta::new_readonly(*update_authority, true),
      AccountMeta::new_readonly(*mint_authority, true),
      AccountMeta::new(*payer, true),
      AccountMeta::new_readonly(*metadata, false),
      AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
      AccountMeta::new_readonly(system_program::ID, false),
      AccountMeta::new_readonly(solana_sdk::sysvar::rent::ID, false),
    ],
    data,
  }
}

/// Mint a Metaplex NFT (master edition, supply 1) to recipient on devnet.
pub fn mint_media_nft(
  recipient_address: &str,
  title: &str,
  item_type: &str,
  item_ref: &str,
  seller_handle: &str,
) -> Result<NftMintResult, String> {
  let config = load_config()?;
  let recipient = Pubkey::from_str(recipient_address)
    .map_err(|_| "Invalid recipient Solana address".to_string())?;
  let payer = &config.signer_a;
  let mint_kp = Keypair::new();
  let mint = mint_kp.pubkey();
  let (metadata, _) = metadata_pda(&mint);
  let (edition, _) = master_edition_pda(&mint);
  let uri = build_metadata_uri(title, item_type, item_ref, seller_handle);
  let symbol = if item_type == "mix" { "MIX" } else { "MEDIA" };

  let client = RpcClient::new(config.rpc_url.clone());
  let mint_rent = client
    .get_minimum_balance_for_rent_exemption(MINT_ACCOUNT_LEN)
    .map_err(|e| format!("mint rent: {e}"))?;

  let create_mint_ix = system_instruction::create_account(
    &payer.pubkey(),
    &mint,
    mint_rent,
    MINT_ACCOUNT_LEN as u64,
    &TOKEN_PROGRAM_ID,
  );

  let init_mint_ix = initialize_mint2(
    &TOKEN_PROGRAM_ID,
    &mint,
    &payer.pubkey(),
    Some(&payer.pubkey()),
    0,
  )
  .map_err(|e| format!("init mint: {e}"))?;

  let ata = get_associated_token_address(&recipient, &mint);
  let create_ata_ix = create_associated_token_account_idempotent(
    &payer.pubkey(),
    &recipient,
    &mint,
    &TOKEN_PROGRAM_ID,
  );

  let metadata_ix = build_create_metadata_v3_ix(
    &metadata,
    &mint,
    &payer.pubkey(),
    &payer.pubkey(),
    &payer.pubkey(),
    title,
    symbol,
    &uri,
  );

  let edition_ix = build_create_master_edition_v3_ix(
    &edition,
    &mint,
    &payer.pubkey(),
    &payer.pubkey(),
    &metadata,
    &payer.pubkey(),
    Some(1),
  );

  let mint_to_ix = mint_to(
    &TOKEN_PROGRAM_ID,
    &mint,
    &ata,
    &payer.pubkey(),
    &[],
    1,
  )
  .map_err(|e| format!("mint_to: {e}"))?;

  let blockhash = client
    .get_latest_blockhash()
    .map_err(|e| format!("blockhash: {e}"))?;

  let tx = Transaction::new_signed_with_payer(
    &[
      create_mint_ix,
      init_mint_ix,
      create_ata_ix,
      metadata_ix,
      edition_ix,
      mint_to_ix,
    ],
    Some(&payer.pubkey()),
    &[payer, &mint_kp],
    blockhash,
  );

  let signature = client
    .send_and_confirm_transaction(&tx)
    .map_err(|e| format!("devnet NFT mint failed: {e}"))?;

  Ok(NftMintResult {
    mint_address: mint.to_string(),
    metadata_address: metadata.to_string(),
    tx_signature: signature.to_string(),
    metadata_uri: uri,
    recipient: recipient.to_string(),
  })
}

/// Transfer SPL NFT from treasury custodial ATA to buyer (devnet demo path).
/// Returns `None` when the treasury does not hold the token (seller-wallet mints).
pub fn transfer_nft_custodial_to_buyer(
  buyer_address: &str,
  mint_address: &str,
) -> Result<Option<String>, String> {
  let config = load_config()?;
  let buyer = Pubkey::from_str(buyer_address)
    .map_err(|_| "Invalid buyer Solana address".to_string())?;
  let mint = Pubkey::from_str(mint_address).map_err(|_| "Invalid mint address".to_string())?;
  let treasury = config.signer_a.pubkey();
  let treasury_ata = get_associated_token_address(&treasury, &mint);
  let buyer_ata = get_associated_token_address(&buyer, &mint);

  let client = RpcClient::new(config.rpc_url.clone());
  let balance = match client.get_token_account_balance(&treasury_ata) {
    Ok(b) if b.ui_amount.unwrap_or(0.0) >= 1.0 => b,
    _ => return Ok(None),
  };
  let _ = balance;

  let create_buyer_ata_ix = create_associated_token_account_idempotent(
    &treasury,
    &buyer,
    &mint,
    &TOKEN_PROGRAM_ID,
  );

  let transfer_ix = spl_token::instruction::transfer(
    &TOKEN_PROGRAM_ID,
    &treasury_ata,
    &buyer_ata,
    &treasury,
    &[],
    1,
  )
  .map_err(|e| format!("transfer ix: {e}"))?;

  let blockhash = client
    .get_latest_blockhash()
    .map_err(|e| format!("blockhash: {e}"))?;

  let tx = Transaction::new_signed_with_payer(
    &[create_buyer_ata_ix, transfer_ix],
    Some(&treasury),
    &[&config.signer_a],
    blockhash,
  );

  let signature = client
    .send_and_confirm_transaction(&tx)
    .map_err(|e| format!("devnet NFT transfer failed: {e}"))?;

  Ok(Some(signature.to_string()))
}

