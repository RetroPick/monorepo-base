use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use crate::{errors::MarketError, events::EpochResolved, math::{compute_epoch_claim_liability, reserve_claims_from_active, reserve_fees_from_active}, oracle, resolvers::{resolve_direction, resolve_range_close, resolve_threshold}, state::*};

#[derive(Accounts)]
pub struct ResolveEpoch<'info> {
    pub authority: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump, constraint = config.is_worker_or_admin(&authority.key()) @ MarketError::Unauthorized, constraint = !config.paused @ MarketError::ProtocolPaused)] pub config: Box<Account<'info, Config>>,
    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump)] pub template: Box<Account<'info, MarketTemplate>>,
    #[account(mut, seeds = [MarketLedger::SEED, template.key().as_ref()], bump = ledger.bump)] pub ledger: Box<Account<'info, MarketLedger>>,
    #[account(mut, seeds = [Epoch::SEED, template.key().as_ref(), &epoch.epoch_id.to_le_bytes()], bump = epoch.bump)] pub epoch: Box<Account<'info, Epoch>>,
    #[account(mut, seeds = [b"active_vault_token", template.key().as_ref()], bump, constraint = active_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate, constraint = active_vault.owner == active_vault_authority.key() @ MarketError::InvalidTemplate)] pub active_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: PDA authority for active vault token account.
    #[account(seeds = [ActiveVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = active_vault_meta.vault_authority_bump)] pub active_vault_authority: UncheckedAccount<'info>,
    #[account(seeds = [ActiveVaultMeta::META_SEED, template.key().as_ref()], bump = active_vault_meta.bump)] pub active_vault_meta: Box<Account<'info, ActiveVaultMeta>>,
    #[account(mut, seeds = [b"claims_vault_token", template.key().as_ref()], bump, constraint = claims_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate, constraint = claims_vault.owner == claims_vault_authority.key() @ MarketError::InvalidTemplate)] pub claims_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(seeds = [ClaimsVaultMeta::META_SEED, template.key().as_ref()], bump = claims_vault_meta.bump)] pub claims_vault_meta: Box<Account<'info, ClaimsVaultMeta>>,
    /// CHECK: PDA authority for claims vault token account.
    #[account(seeds = [ClaimsVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = claims_vault_meta.vault_authority_bump)] pub claims_vault_authority: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"fee_vault_token", template.key().as_ref()], bump, constraint = fee_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate, constraint = fee_vault.owner == fee_vault_authority.key() @ MarketError::InvalidTemplate)] pub fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(seeds = [FeeVaultMeta::META_SEED, template.key().as_ref()], bump = fee_vault_meta.bump)] pub fee_vault_meta: Box<Account<'info, FeeVaultMeta>>,
    /// CHECK: PDA authority for fee vault token account.
    #[account(seeds = [FeeVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = fee_vault_meta.vault_authority_bump)] pub fee_vault_authority: UncheckedAccount<'info>,
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub price_update: Account<'info, PriceUpdateV2>,
}

pub fn handler(ctx: Context<ResolveEpoch>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.ledger.require_active_epoch(ctx.accounts.epoch.epoch_id)?;
    require!(ctx.accounts.epoch.is_resolvable(now), MarketError::TooEarlyToResolve);
    require!(ctx.accounts.stake_mint.key() == ctx.accounts.config.stake_mint, MarketError::InvalidTemplate);
    require!(!ctx.accounts.epoch.checkpoint_b.written, MarketError::CheckpointAlreadyWritten);
    let normalized = oracle::read_price_no_older_than(&ctx.accounts.price_update, &ctx.accounts.epoch.oracle_feed_id, ctx.accounts.config.oracle_config.max_delay_seconds, now)?;
    let confidence_limit = (normalized.value_e8.unsigned_abs() as u128).checked_mul(ctx.accounts.config.oracle_config.max_confidence_bps as u128).ok_or(MarketError::MathOverflow)? / 10_000u128;
    require!(u128::from(normalized.confidence_e8) <= confidence_limit, MarketError::OracleConfidenceTooWide);
    let epoch = &mut ctx.accounts.epoch;
    epoch.validate_checkpoint_b_publish_time(normalized.publish_time)?;
    epoch.checkpoint_b = oracle::to_checkpoint(&normalized);
    let maybe_winning_mask = match epoch.market_type {
        MarketType::Direction => resolve_direction(epoch.checkpoint_a, epoch.checkpoint_b, epoch.equal_price_voids)?,
        MarketType::Threshold => Some(resolve_threshold(epoch.condition, epoch.absolute_threshold_value_e8, epoch.checkpoint_b)?),
        MarketType::RangeClose => Some(resolve_range_close(epoch.checkpoint_b, epoch.outcome_count, epoch.range_bounds_e8)?),
    };
    let template_key = ctx.accounts.template.key();
    let active_seeds: &[&[u8]] = &[ActiveVaultMeta::AUTHORITY_SEED, template_key.as_ref(), &[ctx.accounts.active_vault_meta.vault_authority_bump]];
    let (winning_mask, claim_liability_total, settlement_fee_total, refund_mode) = if let Some(mask) = maybe_winning_mask { epoch.winning_outcome_mask = mask; let (claims, fees, _) = compute_epoch_claim_liability(epoch, epoch.settlement_fee_bps, epoch.fee_on_losing_pool)?; (mask, claims, fees, false) } else { (0, epoch.total_pool, 0, true) };
    if claim_liability_total > 0 {
        transfer_checked(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked { from: ctx.accounts.active_vault.to_account_info(), mint: ctx.accounts.stake_mint.to_account_info(), to: ctx.accounts.claims_vault.to_account_info(), authority: ctx.accounts.active_vault_authority.to_account_info() }, &[active_seeds]), claim_liability_total, ctx.accounts.stake_mint.decimals)?;
        reserve_claims_from_active(&mut ctx.accounts.ledger, claim_liability_total)?;
    }
    if settlement_fee_total > 0 {
        transfer_checked(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked { from: ctx.accounts.active_vault.to_account_info(), mint: ctx.accounts.stake_mint.to_account_info(), to: ctx.accounts.fee_vault.to_account_info(), authority: ctx.accounts.active_vault_authority.to_account_info() }, &[active_seeds]), settlement_fee_total, ctx.accounts.stake_mint.decimals)?;
        reserve_fees_from_active(&mut ctx.accounts.ledger, settlement_fee_total)?;
    }
    epoch.winning_outcome_mask = winning_mask; epoch.claim_liability_total = if refund_mode { 0 } else { claim_liability_total }; epoch.total_refund_liability = if refund_mode { claim_liability_total } else { 0 }; epoch.settlement_fee_total = settlement_fee_total; epoch.remaining_winning_stake = if refund_mode { 0 } else { epoch.winning_pool_total() }; epoch.refund_mode = refund_mode; epoch.claimable = true; epoch.status = if refund_mode { EpochStatus::Voided } else { EpochStatus::Resolved }; epoch.resolved_at = now;
    ctx.accounts.ledger.last_resolved_epoch_id = epoch.epoch_id;
    emit!(EpochResolved { epoch: epoch.key(), epoch_id: epoch.epoch_id, winning_mask, claim_liability_total, settlement_fee_total, refund_mode });
    Ok(())
}
