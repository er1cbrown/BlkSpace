//! BKSPC settlement program — mint authority held by program PDA; treasury 2-of-2 signs mints.
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, SetAuthority, Token, TokenAccount};

declare_id!("7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs");

pub const CONFIG_SEED: &[u8] = b"config";
pub const MINT_AUTHORITY_SEED: &[u8] = b"mint_authority";

#[program]
pub mod bkspc {
    use super::*;

    /// One-time: store treasury signers and move SPL mint authority to program PDA.
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        treasury_signer_a: Pubkey,
        treasury_signer_b: Pubkey,
    ) -> Result<()> {
        require!(
            treasury_signer_a != Pubkey::default() && treasury_signer_b != Pubkey::default(),
            BkspcError::InvalidTreasurySigner
        );
        require!(
            treasury_signer_a != treasury_signer_b,
            BkspcError::InvalidTreasurySigner
        );

        let cfg = &mut ctx.accounts.config;
        cfg.mint = ctx.accounts.mint.key();
        cfg.treasury_signer_a = treasury_signer_a;
        cfg.treasury_signer_b = treasury_signer_b;
        cfg.bump = ctx.bumps.config;
        cfg.mint_authority_bump = ctx.bumps.mint_authority;

        let cpi_accounts = SetAuthority {
            account_or_mint: ctx.accounts.mint.to_account_info(),
            current_authority: ctx.accounts.current_mint_authority.to_account_info(),
        };
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            Some(ctx.accounts.mint_authority.key()),
        )?;
        Ok(())
    }

    /// Mint BKSPC to student ATA — requires both treasury signers.
    pub fn mint_rewards(ctx: Context<MintRewards>, amount: u64) -> Result<()> {
        require!(amount > 0, BkspcError::InvalidAmount);
        require!(
            ctx.accounts.treasury_signer_a.key() == ctx.accounts.config.treasury_signer_a,
            BkspcError::UnauthorizedTreasurySigner
        );
        require!(
            ctx.accounts.treasury_signer_b.key() == ctx.accounts.config.treasury_signer_b,
            BkspcError::UnauthorizedTreasurySigner
        );

        let seeds = &[
            MINT_AUTHORITY_SEED,
            &[ctx.accounts.config.mint_authority_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_ata.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            ),
            amount,
        )?;
        Ok(())
    }

    /// Burn BKSPC from student ATA (marketplace payment sink).
    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, BkspcError::InvalidAmount);
        require!(
            ctx.accounts.mint.key() == ctx.accounts.config.mint,
            BkspcError::InvalidMint
        );

        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.student_ata.to_account_info(),
            authority: ctx.accounts.student_authority.to_account_info(),
        };
        token::burn(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            amount,
        )?;
        Ok(())
    }
}

#[account]
pub struct GlobalConfig {
    pub mint: Pubkey,
    pub treasury_signer_a: Pubkey,
    pub treasury_signer_b: Pubkey,
    pub bump: u8,
    pub mint_authority_bump: u8,
}

impl GlobalConfig {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 1 + 1;
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// Current SPL mint authority (deployer wallet before handoff).
    pub current_mint_authority: Signer<'info>,

    /// CHECK: PDA becomes mint authority via set_authority CPI.
    #[account(seeds = [MINT_AUTHORITY_SEED], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintRewards<'info> {
    pub treasury_signer_a: Signer<'info>,
    pub treasury_signer_b: Signer<'info>,

    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut, address = config.mint)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub recipient_ata: Account<'info, TokenAccount>,

    /// CHECK: PDA signs mint_to CPI.
    #[account(
        seeds = [MINT_AUTHORITY_SEED],
        bump = config.mint_authority_bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    pub student_authority: Signer<'info>,

    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut, address = config.mint)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = student_ata.mint == mint.key(),
        constraint = student_ata.owner == student_authority.key()
    )]
    pub student_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum BkspcError {
    #[msg("Treasury signer pubkey invalid or duplicate")]
    InvalidTreasurySigner,
    #[msg("Caller is not an authorized treasury signer")]
    UnauthorizedTreasurySigner,
    #[msg("Amount must be positive")]
    InvalidAmount,
    #[msg("Mint does not match program config")]
    InvalidMint,
}