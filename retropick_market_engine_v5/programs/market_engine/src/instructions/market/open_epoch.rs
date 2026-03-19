use anchor_lang::prelude::*;
use crate::{constants::VERSION, errors::MarketError, events::EpochOpened, state::*};

#[derive(Accounts)]
#[instruction(epoch_id: u64)]
pub struct OpenEpoch<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    #[account(mut)] pub authority: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump, constraint = config.is_worker_or_admin(&authority.key()) @ MarketError::Unauthorized, constraint = !config.paused @ MarketError::ProtocolPaused)]
    pub config: Box<Account<'info, Config>>,
    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump, constraint = template.active @ MarketError::TemplateInactive)]
    pub template: Box<Account<'info, MarketTemplate>>,
    #[account(mut, seeds = [MarketLedger::SEED, template.key().as_ref()], bump = ledger.bump)]
    pub ledger: Box<Account<'info, MarketLedger>>,
    #[account(init, payer = payer, space = 8 + Epoch::INIT_SPACE, seeds = [Epoch::SEED, template.key().as_ref(), &epoch_id.to_le_bytes()], bump)]
    pub epoch: Box<Account<'info, Epoch>>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OpenEpochParams { pub open_at: i64, pub lock_at: i64, pub resolve_at: i64 }

pub fn handler(ctx: Context<OpenEpoch>, epoch_id: u64, params: OpenEpochParams) -> Result<()> {
    require!(params.open_at < params.lock_at && params.lock_at < params.resolve_at, MarketError::InvalidTiming);
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.ledger.require_can_open_next_epoch(epoch_id)?;
    let epoch = &mut ctx.accounts.epoch;
    epoch.version = VERSION; epoch.bump = ctx.bumps.epoch; epoch.epoch_id = epoch_id;
    epoch.status = EpochStatus::Open; epoch.cancel_reason = CancelReason::None; epoch.timing = MarketTiming { open_at: params.open_at, lock_at: params.lock_at, resolve_at: params.resolve_at };
    epoch.checkpoint_a = OracleCheckpoint::default(); epoch.checkpoint_b = OracleCheckpoint::default(); epoch.oracle_feed_id = ctx.accounts.template.oracle_feed_id; epoch.market_type = ctx.accounts.template.market_type; epoch.condition = ctx.accounts.template.condition; epoch.absolute_threshold_value_e8 = ctx.accounts.template.absolute_threshold_value_e8; epoch.range_bounds_e8 = ctx.accounts.template.range_bounds_e8; epoch.switch_fee_bps = ctx.accounts.template.switch_fee_bps; epoch.settlement_fee_bps = ctx.accounts.template.settlement_fee_bps; epoch.equal_price_voids = ctx.accounts.template.equal_price_voids; epoch.fee_on_losing_pool = ctx.accounts.template.fee_on_losing_pool; epoch.allow_multi_side_positions = ctx.accounts.template.allow_multi_side_positions; epoch.outcome_count = ctx.accounts.template.outcome_count;
    epoch.winning_outcome_mask = 0; epoch.total_pool = 0; epoch.outcome_pools = [0u64; crate::constants::MAX_OUTCOMES]; epoch.switch_fee_total = 0; epoch.settlement_fee_total = 0; epoch.claim_liability_total = 0; epoch.total_refund_liability = 0; epoch.claimed_total = 0; epoch.remaining_winning_stake = 0; epoch.refund_mode = false; epoch.claimable = false; epoch.created_at = now; epoch.locked_at = 0; epoch.resolved_at = 0; epoch.total_positions = 0; epoch.reserved = [0; 16];
    ctx.accounts.ledger.active_epoch_id = epoch_id;
    emit!(EpochOpened { template: ctx.accounts.template.key(), epoch: epoch.key(), epoch_id, open_at: params.open_at, lock_at: params.lock_at, resolve_at: params.resolve_at });
    Ok(())
}
