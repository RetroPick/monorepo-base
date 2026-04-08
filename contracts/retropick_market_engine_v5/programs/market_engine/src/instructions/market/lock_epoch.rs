use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use crate::{errors::MarketError, events::EpochLocked, oracle, state::*};

#[derive(Accounts)]
pub struct LockEpoch<'info> {
    pub authority: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump, constraint = config.is_worker_or_admin(&authority.key()) @ MarketError::Unauthorized, constraint = !config.paused @ MarketError::ProtocolPaused)] pub config: Box<Account<'info, Config>>,
    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump)] pub template: Box<Account<'info, MarketTemplate>>,
    #[account(seeds = [MarketLedger::SEED, template.key().as_ref()], bump = ledger.bump)] pub ledger: Box<Account<'info, MarketLedger>>,
    #[account(mut, seeds = [Epoch::SEED, template.key().as_ref(), &epoch.epoch_id.to_le_bytes()], bump = epoch.bump)] pub epoch: Box<Account<'info, Epoch>>,
    pub price_update: Box<Account<'info, PriceUpdateV2>>,
}

pub fn handler(ctx: Context<LockEpoch>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.ledger.require_active_epoch(ctx.accounts.epoch.epoch_id)?;
    require!(ctx.accounts.epoch.is_lockable(now), MarketError::TooEarlyToLock);
    if ctx.accounts.epoch.requires_checkpoint_a_on_lock() {
        require!(!ctx.accounts.epoch.checkpoint_a.written, MarketError::CheckpointAlreadyWritten);
        let normalized = oracle::read_price_no_older_than(&ctx.accounts.price_update, &ctx.accounts.epoch.oracle_feed_id, ctx.accounts.config.oracle_config.max_delay_seconds, now)?;
        let confidence_limit = (normalized.value_e8.unsigned_abs() as u128).checked_mul(ctx.accounts.config.oracle_config.max_confidence_bps as u128).ok_or(MarketError::MathOverflow)? / 10_000u128;
        require!(u128::from(normalized.confidence_e8) <= confidence_limit, MarketError::OracleConfidenceTooWide);
        ctx.accounts.epoch.validate_checkpoint_a_publish_time(normalized.publish_time)?;
        ctx.accounts.epoch.checkpoint_a = oracle::to_checkpoint(&normalized);
    }
    ctx.accounts.epoch.status = EpochStatus::Locked; ctx.accounts.epoch.locked_at = now;
    emit!(EpochLocked { epoch: ctx.accounts.epoch.key(), epoch_id: ctx.accounts.epoch.epoch_id, checkpoint_a_value_e8: ctx.accounts.epoch.checkpoint_a.value_e8, publish_time: ctx.accounts.epoch.checkpoint_a.publish_time });
    Ok(())
}
