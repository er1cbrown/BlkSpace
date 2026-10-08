//! BKSPC program — Token-2022 settlement, staking, and governance.
//!
//! Security model:
//!
//! - `convert_wb_to_bkspc` is **not** permissionless. It requires `convert_config.minter`
//!   to sign alongside the recipient, and enforces a hard `cap` on total supply. The prior
//!   implementation accepted any `Signer` as `user` while letting the `mint_authority` PDA
//!   sign the `mint_to` CPI, which let any third party mint an unlimited supply.
//! - The supply `cap` is a ceiling governance can only **lower**. No instruction raises it.
//! - Staking pays **no reward**. Staked BKSPC confers governance weight and nothing else.
//! - Voting weight is snapshotted into a `VoteRecord` and increments the voter's
//!   `Position.active_votes`, which blocks unstake until the proposal resolves and the
//!   voter releases. This blocks both flash-voting and stake-splitting across proposals.
//! - Every governance-executed change is an allowlisted action. There is no arbitrary-CPI
//!   governance instruction.
//!
//! Legacy SPL path (2-of-2 treasury `mint_rewards` / `burn_tokens`) is retained unchanged
//! for the marketplace burn flow.
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, SetAuthority, Token, TokenAccount};
use anchor_spl::token_2022::{self, Token2022};
use anchor_spl::token_interface::{
    Mint as InterfaceMint, TokenAccount as InterfaceTokenAccount,
};

declare_id!("7whUULzUwYkDRZkpuKRS6dFRR4eWfzQaXnS3mz5FbVXs");

pub const CONFIG_SEED: &[u8] = b"config";
pub const CONVERT_CONFIG_SEED: &[u8] = b"convert_config";
pub const MINT_AUTHORITY_SEED: &[u8] = b"mint_authority";
pub const STAKE_VAULT_SEED: &[u8] = b"stake_vault";
pub const POSITION_SEED: &[u8] = b"position";
pub const PROPOSAL_SEED: &[u8] = b"proposal";
pub const VOTE_RECORD_SEED: &[u8] = b"vote_record";

/// Governance delay floor. Mirrors `MIN_DELAY_FLOOR` in
/// `artifacts/hyperevm/src/TimelockAdmin.sol`. A proposal cannot execute faster than this,
/// and governance cannot lower `gov_delay` beneath it.
pub const MIN_GOV_DELAY: i64 = 2 * 24 * 60 * 60;

/// Upper bound on the unstake cooldown.
pub const MAX_UNSTAKE_DELAY: i64 = 365 * 24 * 60 * 60;

/// Upper bound on unresolved proposals a single position may commit its stake to.
/// Keeps `active_votes` inside `u8` and stops one position from becoming a vote lock.
pub const MAX_ACTIVE_VOTES: u8 = 16;

pub const ACTION_LOWER_CAP: u8 = 0;
pub const ACTION_SET_UNSTAKE_DELAY: u8 = 1;
pub const ACTION_SET_GOV_DELAY: u8 = 2;
pub const ACTION_ROTATE_MINTER: u8 = 3;

#[program]
pub mod bkspc {
    use super::*;

    // ------------------------------------------------------------------
    // Legacy SPL settlement path
    // ------------------------------------------------------------------

    /// One-time: store treasury signers and move SPL mint authority to the program PDA.
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

        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                    current_authority: ctx.accounts.current_mint_authority.to_account_info(),
                },
            ),
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            Some(ctx.accounts.mint_authority.key()),
        )?;
        Ok(())
    }

    /// Mint BKSPC to a student ATA. Requires both treasury signers.
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

        let seeds: &[&[&[u8]]] = &[&[
            MINT_AUTHORITY_SEED,
            &[ctx.accounts.config.mint_authority_bump],
        ]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.recipient_ata.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                seeds,
            ),
            amount,
        )?;
        Ok(())
    }

    /// Burn BKSPC from a student ATA (marketplace payment sink).
    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, BkspcError::InvalidAmount);
        require!(
            ctx.accounts.mint.key() == ctx.accounts.config.mint,
            BkspcError::InvalidMint
        );

        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.student_ata.to_account_info(),
                    authority: ctx.accounts.student_authority.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    // ------------------------------------------------------------------
    // Token-2022 settlement
    // ------------------------------------------------------------------

    /// One-time Token-2022 setup. Moves mint authority to the program PDA and pins the
    /// `minter` allowed to sign `convert_wb_to_bkspc`, plus the hard supply `cap`.
    ///
    /// A `cap` of 0 is rejected: it would brick settlement, and because governance may
    /// only lower the cap there would be no way to recover.
    pub fn initialize_convert(
        ctx: Context<InitializeConvert>,
        minter: Pubkey,
        admin: Pubkey,
        cap: u64,
        unstake_delay: i64,
        gov_delay: i64,
    ) -> Result<()> {
        require!(minter != Pubkey::default(), BkspcError::InvalidMinter);
        require!(admin != Pubkey::default(), BkspcError::InvalidAdmin);
        require!(cap > 0, BkspcError::InvalidCap);
        require!(
            unstake_delay >= MIN_GOV_DELAY && unstake_delay <= MAX_UNSTAKE_DELAY,
            BkspcError::DelayOutOfRange
        );
        require!(gov_delay >= MIN_GOV_DELAY, BkspcError::DelayTooShort);

        let cfg = &mut ctx.accounts.convert_config;
        cfg.mint = ctx.accounts.mint.key();
        cfg.minter = minter;
        cfg.admin = admin;
        cfg.cap = cap;
        cfg.unstake_delay = unstake_delay;
        cfg.gov_delay = gov_delay;
        cfg.bump = ctx.bumps.convert_config;
        cfg.mint_authority_bump = ctx.bumps.mint_authority;

        token_2022::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token_2022::SetAuthority {
                    current_authority: ctx.accounts.current_mint_authority.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            token_2022::spl_token_2022::instruction::AuthorityType::MintTokens,
            Some(ctx.accounts.mint_authority.key()),
        )?;

        emit!(MintAuthorityWired {
            mint: ctx.accounts.mint.key(),
            mint_authority: ctx.accounts.mint_authority.key(),
            minter,
            admin,
            cap,
        });
        Ok(())
    }

    /// Mint fee-adjusted BKSPC for a recipient who cleared the off-chain WeixBucks gates.
    ///
    /// Both `minter` (proves eligibility) and `user` (the recipient) must sign, and total
    /// supply is checked against the hard `cap`.
    pub fn convert_wb_to_bkspc(ctx: Context<ConvertWbToBkspc>, amount_bkspc: u64) -> Result<()> {
        require!(amount_bkspc > 0, BkspcError::InvalidAmount);
        require!(
            ctx.accounts.minter.key() == ctx.accounts.convert_config.minter,
            BkspcError::UnauthorizedMinter
        );
        require!(
            ctx.accounts.mint.key() == ctx.accounts.convert_config.mint,
            BkspcError::InvalidMint
        );
        require!(
            ctx.accounts.user_ata.owner == ctx.accounts.user.key(),
            BkspcError::InvalidAtaOwner
        );
        require!(
            ctx.accounts.user_ata.mint == ctx.accounts.mint.key(),
            BkspcError::InvalidMint
        );

        let cfg = &ctx.accounts.convert_config;
        let next_supply = ctx
            .accounts
            .mint
            .supply
            .checked_add(amount_bkspc)
            .ok_or(BkspcError::CapExceeded)?;
        require!(next_supply <= cfg.cap, BkspcError::CapExceeded);

        let seeds: &[&[&[u8]]] = &[&[MINT_AUTHORITY_SEED, &[cfg.mint_authority_bump]]];

        token_2022::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token_2022::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &seeds,
            ),
            amount_bkspc,
        )?;

        emit!(BkspcConverted {
            user: ctx.accounts.user.key(),
            minter: ctx.accounts.minter.key(),
            amount: amount_bkspc,
            mint: ctx.accounts.mint.key(),
            supply_after: next_supply,
        });
        Ok(())
    }

    /// Admin-only: rotate the backend `minter`. Rotating `admin` itself requires governance.
    pub fn rotate_minter(ctx: Context<RotateMinter>, new_minter: Pubkey) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.convert_config.admin,
            BkspcError::UnauthorizedAdmin
        );
        require!(new_minter != Pubkey::default(), BkspcError::InvalidMinter);

        let previous = ctx.accounts.convert_config.minter;
        ctx.accounts.convert_config.minter = new_minter;

        emit!(MinterRotated { previous, new_minter });
        Ok(())
    }

    // ------------------------------------------------------------------
    // Staking (no reward)
    // ------------------------------------------------------------------

    /// Open a stake position and move BKSPC into the vault. Pays no reward.
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, BkspcError::InvalidAmount);
        require!(
            ctx.accounts.convert_config.mint == ctx.accounts.mint.key(),
            BkspcError::InvalidMint
        );

        let pos = &mut ctx.accounts.position;
        pos.owner = ctx.accounts.user.key();
        pos.staked = amount;
        pos.unlock_at = 0;
        pos.active_votes = 0;
        pos.bump = ctx.bumps.position;

        cpi_transfer_in(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.user_ata.to_account_info(),
            ctx.accounts.vault_ata.to_account_info(),
            ctx.accounts.user.to_account_info(),
            amount,
        )?;

        emit!(Staked {
            owner: pos.owner,
            amount,
            total_staked: amount,
        });
        Ok(())
    }

    /// Add to an existing position. Blocked while an unstake is pending.
    pub fn stake_more(ctx: Context<StakeMore>, amount: u64) -> Result<()> {
        require!(amount > 0, BkspcError::InvalidAmount);
        require!(
            ctx.accounts.convert_config.mint == ctx.accounts.mint.key(),
            BkspcError::InvalidMint
        );

        let pos = &mut ctx.accounts.position;
        require!(pos.unlock_at == 0, BkspcError::UnstakePending);
        pos.staked = pos
            .staked
            .checked_add(amount)
            .ok_or(BkspcError::InvalidAmount)?;

        let total_staked = pos.staked;
        let owner = pos.owner;

        cpi_transfer_in(
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.user_ata.to_account_info(),
            ctx.accounts.vault_ata.to_account_info(),
            ctx.accounts.user.to_account_info(),
            amount,
        )?;

        emit!(Staked {
            owner,
            amount,
            total_staked,
        });
        Ok(())
    }

    /// Start the unstake cooldown. Requires no unresolved vote commitments.
    pub fn begin_unstake(ctx: Context<BeginUnstake>) -> Result<()> {
        let cfg = &ctx.accounts.convert_config;
        let now = Clock::get()?.unix_timestamp;
        let pos = &mut ctx.accounts.position;

        require!(pos.owner == ctx.accounts.user.key(), BkspcError::NotPositionOwner);
        require!(pos.staked > 0, BkspcError::NothingStaked);
        require!(pos.active_votes == 0, BkspcError::ActiveVotesOutstanding);

        pos.unlock_at = now + cfg.unstake_delay;

        emit!(UnstakeStarted {
            owner: pos.owner,
            amount: pos.staked,
            unlock_at: pos.unlock_at,
        });
        Ok(())
    }

    /// Abort a pending unstake and unlock the stake.
    pub fn cancel_unstake(ctx: Context<CancelUnstake>) -> Result<()> {
        let pos = &mut ctx.accounts.position;
        require!(pos.owner == ctx.accounts.user.key(), BkspcError::NotPositionOwner);
        require!(pos.unlock_at != 0, BkspcError::NoPendingUnstake);

        pos.unlock_at = 0;
        Ok(())
    }

    /// After the cooldown, return staked BKSPC to the owner.
    pub fn finish_unstake(ctx: Context<FinishUnstake>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let pos = &mut ctx.accounts.position;

        require!(pos.owner == ctx.accounts.user.key(), BkspcError::NotPositionOwner);
        require!(pos.unlock_at != 0, BkspcError::NoPendingUnstake);
        require!(pos.active_votes == 0, BkspcError::ActiveVotesOutstanding);
        require!(
            now >= pos.unlock_at,
            BkspcError::UnlockNotReady
        );

        let amount = pos.staked;
        pos.staked = 0;
        pos.unlock_at = 0;
        let owner = pos.owner;

        // The vault PDA signs the outbound transfer.
        let vault_seeds: &[&[&[u8]]] = &[&[STAKE_VAULT_SEED, &[ctx.bumps.stake_vault]]];

        token_2022::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token_2022::Transfer {
                    from: ctx.accounts.vault_ata.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: ctx.accounts.stake_vault.to_account_info(),
                },
                vault_seeds,
            ),
            amount,
        )?;

        emit!(UnstakeCompleted { owner, amount });
        Ok(())
    }

    /// Close an empty position and reclaim rent.
    pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
        let pos = &ctx.accounts.position;
        require!(pos.owner == ctx.accounts.user.key(), BkspcError::NotPositionOwner);
        require!(pos.staked == 0, BkspcError::PositionNotEmpty);
        require!(pos.unlock_at == 0, BkspcError::UnstakePending);
        require!(pos.active_votes == 0, BkspcError::ActiveVotesOutstanding);
        Ok(())
    }

    // ------------------------------------------------------------------
    // Governance
    // ------------------------------------------------------------------

    /// Open a proposal. Proposer must have stake. `action` is an allowlisted opcode.
    pub fn propose(
        ctx: Context<Propose>,
        nonce: u64,
        action: u8,
        arg: u64,
        target: Pubkey,
    ) -> Result<()> {
        require!(action <= ACTION_ROTATE_MINTER, BkspcError::InvalidAction);
        require!(
            ctx.accounts.position.owner == ctx.accounts.proposer.key(),
            BkspcError::NotPositionOwner
        );
        require!(ctx.accounts.position.staked > 0, BkspcError::NothingStaked);
        require!(
            ctx.accounts.position.active_votes < MAX_ACTIVE_VOTES,
            BkspcError::ActiveVotesOutstanding
        );

        validate_action_args(&ctx.accounts.convert_config, action, arg, target)?;

        let eta = Clock::get()?.unix_timestamp + ctx.accounts.convert_config.gov_delay;

        let proposer = ctx.accounts.proposer.key();
        let proposal_key = ctx.accounts.proposal.key();

        let p = &mut ctx.accounts.proposal;
        p.proposer = proposer;
        p.action = action;
        p.arg = arg;
        p.target = target;
        p.votes_for = 0;
        p.votes_against = 0;
        p.eta = eta;
        p.executed = false;
        p.canceled = false;
        p.bump = ctx.bumps.proposal;

        emit!(ProposalCreated {
            proposal: proposal_key,
            proposer,
            action,
            arg,
            target,
            eta,
        });
        Ok(())
    }

    /// Cast an initial vote. Weight is snapshotted from current stake into a `VoteRecord`
    /// and locks the position until the proposal resolves and the voter releases.
    pub fn cast_vote(ctx: Context<CastVote>, support: bool) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        let p = &ctx.accounts.proposal;
        require!(!p.executed, BkspcError::ProposalAlreadyResolved);
        require!(!p.canceled, BkspcError::ProposalAlreadyResolved);
        require!(now < p.eta, BkspcError::VotingClosed);

        let pos = &mut ctx.accounts.position;
        require!(pos.owner == ctx.accounts.voter.key(), BkspcError::NotPositionOwner);
        require!(pos.staked > 0, BkspcError::NothingStaked);
        require!(pos.unlock_at == 0, BkspcError::UnstakePending);
        require!(
            pos.active_votes < MAX_ACTIVE_VOTES,
            BkspcError::ActiveVotesOutstanding
        );

        let weight = pos.staked;

        let vr = &mut ctx.accounts.vote_record;
        vr.voter = ctx.accounts.voter.key();
        vr.proposal = ctx.accounts.proposal.key();
        vr.weight = weight;
        vr.support = support;
        vr.released = false;
        vr.bump = ctx.bumps.vote_record;

        pos.active_votes = pos
            .active_votes
            .checked_add(1)
            .ok_or(BkspcError::ActiveVotesOutstanding)?;

        let p = &mut ctx.accounts.proposal;
        if support {
            p.votes_for = p.votes_for.saturating_add(weight);
        } else {
            p.votes_against = p.votes_against.saturating_add(weight);
        }

        emit!(VoteCast {
            proposal: p.key(),
            voter: ctx.accounts.voter.key(),
            weight,
            support,
        });
        Ok(())
    }

    /// Switch an existing vote's direction. Weight is unchanged, so stake cannot be
    /// topped up mid-proposal to inflate a changed ballot.
    pub fn change_vote(ctx: Context<ChangeVote>, support: bool) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        let p = &ctx.accounts.proposal;
        require!(!p.executed, BkspcError::ProposalAlreadyResolved);
        require!(!p.canceled, BkspcError::ProposalAlreadyResolved);
        require!(now < p.eta, BkspcError::VotingClosed);

        let vr = &mut ctx.accounts.vote_record;
        require!(vr.voter == ctx.accounts.voter.key(), BkspcError::NotPositionOwner);
        require!(!vr.released, BkspcError::AlreadyReleased);
        require!(vr.support != support, BkspcError::VoteUnchanged);

        let weight = vr.weight;
        vr.support = support;

        let p = &mut ctx.accounts.proposal;
        if support {
            p.votes_for = p.votes_for.saturating_add(weight);
            p.votes_against = p.votes_against.saturating_sub(weight);
        } else {
            p.votes_against = p.votes_against.saturating_add(weight);
            p.votes_for = p.votes_for.saturating_sub(weight);
        }

        emit!(VoteCast {
            proposal: p.key(),
            voter: ctx.accounts.voter.key(),
            weight,
            support,
        });
        Ok(())
    }

    /// Execute an allowlisted action once its `eta` has passed and it has passed.
    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let p = &ctx.accounts.proposal;
        require!(!p.executed, BkspcError::ProposalAlreadyResolved);
        require!(!p.canceled, BkspcError::ProposalAlreadyResolved);
        require!(now >= p.eta, BkspcError::NotReady);
        require!(
            p.votes_for > p.votes_against,
            BkspcError::ProposalRejected
        );

        let (action, arg, target) = (p.action, p.arg, p.target);

        emit!(ProposalExecuted {
            proposal: ctx.accounts.proposal.key(),
            action,
            arg,
            target,
        });

        let cfg = &mut ctx.accounts.convert_config;
        match action {
            ACTION_LOWER_CAP => {
                require!(arg < cfg.cap, BkspcError::CapCannotIncrease);
                cfg.cap = arg;
            }
            ACTION_SET_UNSTAKE_DELAY => {
                require!(
                    arg >= MIN_GOV_DELAY as u64 && arg <= MAX_UNSTAKE_DELAY as u64,
                    BkspcError::DelayOutOfRange
                );
                cfg.unstake_delay = arg as i64;
            }
            ACTION_SET_GOV_DELAY => {
                require!(arg >= MIN_GOV_DELAY as u64, BkspcError::DelayTooShort);
                cfg.gov_delay = arg as i64;
            }
            ACTION_ROTATE_MINTER => {
                require!(target != Pubkey::default(), BkspcError::InvalidMinter);
                cfg.minter = target;
            }
            _ => return err!(BkspcError::InvalidAction),
        }

        ctx.accounts.proposal.executed = true;
        Ok(())
    }

    /// Cancel an unresolved proposal. Proposer or admin only.
    pub fn cancel_proposal(ctx: Context<CancelProposal>) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        require!(!p.executed, BkspcError::ProposalAlreadyResolved);
        require!(!p.canceled, BkspcError::ProposalAlreadyResolved);

        let is_proposer = p.proposer == ctx.accounts.canceller.key();
        let is_admin = ctx.accounts.convert_config.admin == ctx.accounts.canceller.key();
        require!(is_proposer || is_admin, BkspcError::UnauthorizedAdmin);

        p.canceled = true;

        emit!(ProposalCanceled {
            proposal: p.key(),
        });
        Ok(())
    }

    /// Release a resolved proposal's vote commitment so the stake can be unstaked.
    pub fn release_vote(ctx: Context<ReleaseVote>) -> Result<()> {
        let p = &ctx.accounts.proposal;
        require!(p.executed || p.canceled, BkspcError::ProposalNotResolved);

        let vr = &ctx.accounts.vote_record;
        require!(vr.voter == ctx.accounts.voter.key(), BkspcError::NotPositionOwner);
        require!(!vr.released, BkspcError::AlreadyReleased);

        let pos = &mut ctx.accounts.position;
        pos.active_votes = pos.active_votes.saturating_sub(1);
        Ok(())
    }
}

/// CPI helper: user -> vault. The user's signature authorizes it, so no PDA is needed.
fn cpi_transfer_in<'info>(
    token_program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    token_2022::transfer(
        CpiContext::new(
            token_program.clone(),
            token_2022::Transfer {
                from,
                to,
                authority,
            },
        ),
        amount,
    )
}

/// Reject governance actions whose arguments are invalid at proposal time, so an
/// obviously-dead proposal cannot be created and grief a timelock slot.
fn validate_action_args(
    cfg: &ConvertConfig,
    action: u8,
    arg: u64,
    target: Pubkey,
) -> Result<()> {
    match action {
        ACTION_LOWER_CAP => {
            require!(arg > 0, BkspcError::InvalidCap);
            require!(arg < cfg.cap, BkspcError::CapCannotIncrease);
        }
        ACTION_SET_UNSTAKE_DELAY => {
            require!(
                arg >= MIN_GOV_DELAY as u64 && arg <= MAX_UNSTAKE_DELAY as u64,
                BkspcError::DelayOutOfRange
            );
        }
        ACTION_SET_GOV_DELAY => {
            require!(arg >= MIN_GOV_DELAY as u64, BkspcError::DelayTooShort);
        }
        ACTION_ROTATE_MINTER => {
            require!(target != Pubkey::default(), BkspcError::InvalidMinter);
        }
        _ => return err!(BkspcError::InvalidAction),
    }
    Ok(())
}

// ---------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------

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

/// Token-2022 settlement + staking + governance config.
#[account]
pub struct ConvertConfig {
    /// Token-2022 mint whose authority this program holds.
    pub mint: Pubkey,
    /// Backend signer permitted to mint via `convert_wb_to_bkspc`.
    pub minter: Pubkey,
    /// May rotate `minter`. Rotating `admin` requires governance.
    pub admin: Pubkey,
    /// Hard supply ceiling in raw units. Governance may only lower it.
    pub cap: u64,
    /// Unstake cooldown, seconds.
    pub unstake_delay: i64,
    /// Proposal timelock, seconds. Never below `MIN_GOV_DELAY`.
    pub gov_delay: i64,
    pub bump: u8,
    pub mint_authority_bump: u8,
}

impl ConvertConfig {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1;
}

/// A user's stake. Pays no reward; confers governance weight only.
#[account]
pub struct Position {
    pub owner: Pubkey,
    pub staked: u64,
    /// 0 when idle. Otherwise the unix time the cooldown ends.
    pub unlock_at: i64,
    /// Unresolved proposals this stake is committed to. Blocks unstake while > 0.
    pub active_votes: u8,
    pub bump: u8,
}

impl Position {
    pub const INIT_SPACE: usize = 32 + 8 + 8 + 1 + 1;
}

/// A governance proposal. Executes one allowlisted action after `eta`.
#[account]
pub struct Proposal {
    pub proposer: Pubkey,
    pub action: u8,
    pub arg: u64,
    pub target: Pubkey,
    pub votes_for: u64,
    pub votes_against: u64,
    pub eta: i64,
    pub executed: bool,
    pub canceled: bool,
    pub bump: u8,
}

impl Proposal {
    pub const INIT_SPACE: usize = 32 + 1 + 8 + 32 + 8 + 8 + 8 + 1 + 1 + 1;
}

/// A voter's snapshotted weight on one proposal.
#[account]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub weight: u64,
    pub support: bool,
    pub released: bool,
    pub bump: u8,
}

impl VoteRecord {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 1 + 1 + 1;
}

#[event]
pub struct BkspcConverted {
    pub user: Pubkey,
    pub minter: Pubkey,
    pub amount: u64,
    pub mint: Pubkey,
    pub supply_after: u64,
}

#[event]
pub struct MintAuthorityWired {
    pub mint: Pubkey,
    pub mint_authority: Pubkey,
    pub minter: Pubkey,
    pub admin: Pubkey,
    pub cap: u64,
}

#[event]
pub struct MinterRotated {
    pub previous: Pubkey,
    pub new_minter: Pubkey,
}

#[event]
pub struct Staked {
    pub owner: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
}

#[event]
pub struct UnstakeStarted {
    pub owner: Pubkey,
    pub amount: u64,
    pub unlock_at: i64,
}

#[event]
pub struct UnstakeCompleted {
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ProposalCreated {
    pub proposal: Pubkey,
    pub proposer: Pubkey,
    pub action: u8,
    pub arg: u64,
    pub target: Pubkey,
    pub eta: i64,
}

#[event]
pub struct VoteCast {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub weight: u64,
    pub support: bool,
}

#[event]
pub struct ProposalExecuted {
    pub proposal: Pubkey,
    pub action: u8,
    pub arg: u64,
    pub target: Pubkey,
}

#[event]
pub struct ProposalCanceled {
    pub proposal: Pubkey,
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

    /// Current SPL mint authority (deployer before handoff).
    pub current_mint_authority: Signer<'info>,

    /// CHECK: PDA that becomes mint authority via `set_authority`.
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

    /// CHECK: PDA signs the `mint_to` CPI.
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
        constraint = student_ata.mint == mint.key() @ BkspcError::InvalidMint,
        constraint = student_ata.owner == student_authority.key() @ BkspcError::InvalidAtaOwner
    )]
    pub student_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitializeConvert<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ConvertConfig::INIT_SPACE,
        seeds = [CONVERT_CONFIG_SEED],
        bump
    )]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, InterfaceMint>,

    /// Current Token-2022 mint authority (deployer before handoff).
    pub current_mint_authority: Signer<'info>,

    /// CHECK: PDA that becomes mint authority via `set_authority`.
    #[account(seeds = [MINT_AUTHORITY_SEED], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

/// `minter` is the authority that proves off-chain WeixBucks eligibility. Requiring it to
/// sign is what closes the permissionless-mint hole: a third party can no longer mint
/// supply for themselves, and cannot redirect a mint to someone else's ATA because
/// `user` must sign as well.
#[derive(Accounts)]
pub struct ConvertWbToBkspc<'info> {
    /// Backend signer. Must equal `convert_config.minter`.
    pub minter: Signer<'info>,

    /// Recipient. Must sign so the mint cannot be redirected to a third party.
    pub user: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(mut, address = convert_config.mint)]
    pub mint: InterfaceAccount<'info, InterfaceMint>,

    #[account(
        mut,
        constraint = user_ata.mint == mint.key() @ BkspcError::InvalidMint,
        constraint = user_ata.owner == user.key() @ BkspcError::InvalidAtaOwner
    )]
    pub user_ata: InterfaceAccount<'info, InterfaceTokenAccount>,

    /// CHECK: PDA signs the `mint_to` CPI.
    #[account(
        seeds = [MINT_AUTHORITY_SEED],
        bump = convert_config.mint_authority_bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct RotateMinter<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,
}

/// Shared account shape for `stake` / `stake_more`.
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(mut, address = convert_config.mint)]
    pub mint: InterfaceAccount<'info, InterfaceMint>,

    #[account(
        init,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [POSITION_SEED, user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        constraint = user_ata.mint == mint.key() @ BkspcError::InvalidMint,
        constraint = user_ata.owner == user.key() @ BkspcError::InvalidAtaOwner
    )]
    pub user_ata: InterfaceAccount<'info, InterfaceTokenAccount>,

    /// CHECK: vault PDA. Signs the outbound transfer on `finish_unstake`.
    #[account(mut, seeds = [STAKE_VAULT_SEED], bump)]
    pub stake_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = vault_ata.mint == mint.key() @ BkspcError::InvalidMint,
        constraint = vault_ata.owner == stake_vault.key() @ BkspcError::InvalidAtaOwner
    )]
    pub vault_ata: InterfaceAccount<'info, InterfaceTokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeMore<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(mut, address = convert_config.mint)]
    pub mint: InterfaceAccount<'info, InterfaceMint>,

    #[account(
        mut,
        seeds = [POSITION_SEED, user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        constraint = user_ata.mint == mint.key() @ BkspcError::InvalidMint,
        constraint = user_ata.owner == user.key() @ BkspcError::InvalidAtaOwner
    )]
    pub user_ata: InterfaceAccount<'info, InterfaceTokenAccount>,

    /// CHECK: vault PDA. Not used to sign in this instruction.
    #[account(mut, seeds = [STAKE_VAULT_SEED], bump)]
    pub stake_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = vault_ata.mint == mint.key() @ BkspcError::InvalidMint,
        constraint = vault_ata.owner == stake_vault.key() @ BkspcError::InvalidAtaOwner
    )]
    pub vault_ata: InterfaceAccount<'info, InterfaceTokenAccount>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct BeginUnstake<'info> {
    pub user: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(
        mut,
        seeds = [POSITION_SEED, user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,
}

#[derive(Accounts)]
pub struct CancelUnstake<'info> {
    pub user: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(
        mut,
        seeds = [POSITION_SEED, user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,
}

#[derive(Accounts)]
pub struct FinishUnstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(mut, address = convert_config.mint)]
    pub mint: InterfaceAccount<'info, InterfaceMint>,

    #[account(
        mut,
        seeds = [POSITION_SEED, user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        constraint = user_ata.mint == mint.key() @ BkspcError::InvalidMint,
        constraint = user_ata.owner == user.key() @ BkspcError::InvalidAtaOwner
    )]
    pub user_ata: InterfaceAccount<'info, InterfaceTokenAccount>,

    /// CHECK: vault PDA. Signs the outbound transfer.
    #[account(mut, seeds = [STAKE_VAULT_SEED], bump)]
    pub stake_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = vault_ata.mint == mint.key() @ BkspcError::InvalidMint,
        constraint = vault_ata.owner == stake_vault.key() @ BkspcError::InvalidAtaOwner
    )]
    pub vault_ata: InterfaceAccount<'info, InterfaceTokenAccount>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        close = user,
        seeds = [POSITION_SEED, user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,
}

#[derive(Accounts)]
#[instruction(nonce: u64, action: u8, arg: u64, target: Pubkey)]
pub struct Propose<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(
        seeds = [POSITION_SEED, proposer.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        init,
        payer = proposer,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [PROPOSAL_SEED, convert_config.mint.as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED, convert_config.mint.as_ref(), &nonce.to_le_bytes()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [VOTE_RECORD_SEED, voter.key().as_ref(), proposal.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(
        mut,
        seeds = [POSITION_SEED, voter.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,


    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct ChangeVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED, convert_config.mint.as_ref(), &nonce.to_le_bytes()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        mut,
        seeds = [VOTE_RECORD_SEED, voter.key().as_ref(), proposal.key().as_ref()],
        bump = vote_record.bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(
        seeds = [POSITION_SEED, voter.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,

}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct Execute<'info> {
    pub executor: Signer<'info>,

    #[account(mut, seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED, convert_config.mint.as_ref(), &nonce.to_le_bytes()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,

}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct CancelProposal<'info> {
    pub canceller: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED, convert_config.mint.as_ref(), &nonce.to_le_bytes()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,

}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct ReleaseVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(seeds = [CONVERT_CONFIG_SEED], bump = convert_config.bump)]
    pub convert_config: Account<'info, ConvertConfig>,

    #[account(
        seeds = [PROPOSAL_SEED, convert_config.mint.as_ref(), &nonce.to_le_bytes()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        mut,
        close = voter,
        seeds = [VOTE_RECORD_SEED, voter.key().as_ref(), proposal.key().as_ref()],
        bump = vote_record.bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(
        mut,
        seeds = [POSITION_SEED, voter.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,

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
    #[msg("ATA owner must be the signing user")]
    InvalidAtaOwner,

    #[msg("Minter pubkey cannot be the default address")]
    InvalidMinter,
    #[msg("Admin pubkey cannot be the default address")]
    InvalidAdmin,
    #[msg("Caller is not the authorized minter")]
    UnauthorizedMinter,
    #[msg("Caller is not the authorized admin")]
    UnauthorizedAdmin,
    #[msg("Supply cap must be greater than zero at init")]
    InvalidCap,
    #[msg("Mint would exceed the supply cap")]
    CapExceeded,

    #[msg("Position owner mismatch")]
    NotPositionOwner,
    #[msg("Position has nothing staked")]
    NothingStaked,
    #[msg("An unstake is already pending")]
    UnstakePending,
    #[msg("No unstake is pending")]
    NoPendingUnstake,
    #[msg("Unstake cooldown has not elapsed")]
    UnlockNotReady,
    #[msg("Outstanding votes must be released before unstaking")]
    ActiveVotesOutstanding,
    #[msg("Position must be empty before closing")]
    PositionNotEmpty,

    #[msg("Unknown governance action")]
    InvalidAction,
    #[msg("Delay outside the permitted range")]
    DelayOutOfRange,
    #[msg("Delay may not be shorter than the governance floor")]
    DelayTooShort,
    #[msg("Governance may only lower the supply cap")]
    CapCannotIncrease,
    #[msg("Proposal is already resolved")]
    ProposalAlreadyResolved,
    #[msg("Proposal has not reached its eta")]
    NotReady,
    #[msg("Proposal did not pass")]
    ProposalRejected,
    #[msg("Voting is closed for this proposal")]
    VotingClosed,
    #[msg("Proposal is not resolved yet")]
    ProposalNotResolved,
    #[msg("Vote was already released")]
    AlreadyReleased,
    #[msg("Vote is already in that direction")]
    VoteUnchanged,
}