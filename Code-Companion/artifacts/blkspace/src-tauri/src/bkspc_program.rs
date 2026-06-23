//! Anchor `bkspc` instruction builders for Tauri settlement (devnet).
use solana_sdk::{
  instruction::{AccountMeta, Instruction},
  pubkey::Pubkey,
};
use spl_token::ID as TOKEN_PROGRAM_ID;

pub const BKSPC_PROGRAM_ID: Pubkey =
  solana_sdk::pubkey!("7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs");

const CONFIG_SEED: &[u8] = b"config";
const MINT_AUTHORITY_SEED: &[u8] = b"mint_authority";

const IX_MINT_REWARDS: [u8; 8] = [88, 68, 37, 76, 94, 110, 224, 187];
const IX_BURN_TOKENS: [u8; 8] = [76, 15, 51, 254, 229, 215, 121, 66];

pub fn find_config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
  Pubkey::find_program_address(&[CONFIG_SEED], program_id)
}

pub fn find_mint_authority_pda(program_id: &Pubkey) -> (Pubkey, u8) {
  Pubkey::find_program_address(&[MINT_AUTHORITY_SEED], program_id)
}

pub fn mint_rewards_instruction(
  program_id: &Pubkey,
  treasury_a: &Pubkey,
  treasury_b: &Pubkey,
  config: &Pubkey,
  mint: &Pubkey,
  recipient_ata: &Pubkey,
  mint_authority: &Pubkey,
  amount: u64,
) -> Instruction {
  let mut data = Vec::with_capacity(16);
  data.extend_from_slice(&IX_MINT_REWARDS);
  data.extend_from_slice(&amount.to_le_bytes());
  Instruction {
    program_id: *program_id,
    accounts: vec![
      AccountMeta::new_readonly(*treasury_a, true),
      AccountMeta::new_readonly(*treasury_b, true),
      AccountMeta::new_readonly(*config, false),
      AccountMeta::new(*mint, false),
      AccountMeta::new(*recipient_ata, false),
      AccountMeta::new_readonly(*mint_authority, false),
      AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
    ],
    data,
  }
}

pub fn burn_tokens_instruction(
  program_id: &Pubkey,
  student_authority: &Pubkey,
  config: &Pubkey,
  mint: &Pubkey,
  student_ata: &Pubkey,
  amount: u64,
) -> Instruction {
  let mut data = Vec::with_capacity(16);
  data.extend_from_slice(&IX_BURN_TOKENS);
  data.extend_from_slice(&amount.to_le_bytes());
  Instruction {
    program_id: *program_id,
    accounts: vec![
      AccountMeta::new_readonly(*student_authority, true),
      AccountMeta::new_readonly(*config, false),
      AccountMeta::new(*mint, false),
      AccountMeta::new(*student_ata, false),
      AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
    ],
    data,
  }
}

pub fn parse_burn_tokens_amount(data: &[u8]) -> Option<u64> {
  if data.len() < 16 {
    return None;
  }
  if data[..8] != IX_BURN_TOKENS {
    return None;
  }
  Some(u64::from_le_bytes(data[8..16].try_into().ok()?))
}