//! Closes a fully-settled [`Epoch`] PDA, reclaiming its rent-exempt balance.
//!
//! This is the primary rent-reclaim path. Each epoch account costs 0.004051 SOL at creation;
//! calling this instruction after all claims are settled returns that SOL to `receiver`.
//!
//! **Settled** means:
//! - Resolved path: `remaining_winning_stake == 0` (every winner claimed).
//! - Refund/cancel/void path: `claimed_total >= total_refund_liability` (every deposit refunded).
//! - Empty epoch: `total_pool == 0` (no deposits; nothing to settle).

use anchor_lang::prelude::*;
use crate::{errors::MarketError, events::EpochClosed, state::*};

/// **Signer:** `authority` ∈ {worker, admin}. `receiver` collects reclaimed lamports.
#[derive(Accounts)]
pub struct CloseEpoch<'info> {
    pub authority: Signer<'info>,

    /// CHECK: receives reclaimed epoch-account rent.
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,

    #[account(
        seeds = [Config::SEED],
        bump = config.bump,
        constraint = config.is_worker_or_admin(&authority.key()) @ MarketError::Unauthorized,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump)]
    pub template: Box<Account<'info, MarketTemplate>>,

    #[account(
        mut,
        close = receiver,
        seeds = [Epoch::SEED, template.key().as_ref(), &epoch.epoch_id.to_le_bytes()],
        bump = epoch.bump,
        constraint = epoch.is_fully_settled() @ MarketError::EpochNotSettled,
    )]
    pub epoch: Box<Account<'info, Epoch>>,
}

/// **Pre:** epoch is fully settled (all claims/refunds processed). **Post:** epoch account closed,
/// rent returned to `receiver`, [`EpochClosed`] emitted.
pub(crate) fn handler(ctx: Context<CloseEpoch>) -> Result<()> {
    emit!(EpochClosed {
        template: ctx.accounts.template.key(),
        epoch_id: ctx.accounts.epoch.epoch_id,
        receiver: ctx.accounts.receiver.key(),
    });
    Ok(())
}
