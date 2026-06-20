use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("BkSpC111111111111111111111111111111111111");

#[program]
pub mod bkspc {
    use super::*;

    /// Initialize the BKSPC (BlkSpace Settlement) mint with B.L.A.C.K. Treasury as authority
    pub fn initialize_mint(ctx: Context<InitializeMint>, decimals: u8) -> Result<()> {
        msg!("BKSPC (BlkSpace Settlement) mint initialized with {} decimals", decimals);
        Ok(())
    }

    /// Mint BKSPC to a student's ATA after off-chain WB withdrawal + eligibility
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

    /// Burn BKSPC (marketplace fees, premium sinks)
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
    pub treasury_authority: Signer<'info>,
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