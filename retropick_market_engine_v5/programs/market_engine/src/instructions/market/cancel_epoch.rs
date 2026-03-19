use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::{errors::MarketError, events::EpochCancelled, math::reserve_claims_from_active, state::*};

#[derive(Accounts)]
pub struct CancelEpoch<'info> {
    pub authority: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump, constraint = config.is_worker_or_admin(&authority.key()) @ MarketError::Unauthorized)] pub config: Box<Account<'info, Config>>,
    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump)] pub template: Box<Account<'info, MarketTemplate>>,
    #[account(mut, seeds = [MarketLedger::SEED, template.key().as_ref()], bump = ledger.bump)] pub ledger: Box<Account<'info, MarketLedger>>,
    #[account(mut, seeds = [Epoch::SEED, template.key().as_ref(), &epoch.epoch_id.to_le_bytes()], bump = epoch.bump)] pub epoch: Box<Account<'info, Epoch>>,
    #[account(mut, seeds = [b"active_vault_token", template.key().as_ref()], bump, constraint = active_vault.owner == active_vault_authority.key() @ MarketError::InvalidTemplate, constraint = active_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate)] pub active_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: PDA authority for active vault token account.
    #[account(seeds = [ActiveVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = active_vault_meta.vault_authority_bump)] pub active_vault_authority: UncheckedAccount<'info>,
    #[account(seeds = [ActiveVaultMeta::META_SEED, template.key().as_ref()], bump = active_vault_meta.bump)] pub active_vault_meta: Box<Account<'info, ActiveVaultMeta>>,
    #[account(mut, seeds = [b"claims_vault_token", template.key().as_ref()], bump, constraint = claims_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate, constraint = claims_vault.owner == claims_vault_authority.key() @ MarketError::InvalidTemplate)] pub claims_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(seeds = [ClaimsVaultMeta::META_SEED, template.key().as_ref()], bump = claims_vault_meta.bump)] pub claims_vault_meta: Box<Account<'info, ClaimsVaultMeta>>,
    /// CHECK: PDA authority for claims vault token account.
    #[account(seeds = [ClaimsVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = claims_vault_meta.vault_authority_bump)] pub claims_vault_authority: UncheckedAccount<'info>,
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<CancelEpoch>, reason: CancelReason, voided: bool) -> Result<()> {
    ctx.accounts.ledger.require_active_epoch(ctx.accounts.epoch.epoch_id)?;
    require!(matches!(ctx.accounts.epoch.status, EpochStatus::Open | EpochStatus::Locked), MarketError::InvalidEpochState);
    require!(ctx.accounts.stake_mint.key() == ctx.accounts.config.stake_mint, MarketError::InvalidTemplate);
    require!(reason != CancelReason::None, MarketError::InvalidEpochState);
    let refund_liability = ctx.accounts.epoch.total_pool;
    if refund_liability > 0 {
        let template_key = ctx.accounts.template.key();
        let active_seeds: &[&[u8]] = &[ActiveVaultMeta::AUTHORITY_SEED, template_key.as_ref(), &[ctx.accounts.active_vault_meta.vault_authority_bump]];
        transfer_checked(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked { from: ctx.accounts.active_vault.to_account_info(), mint: ctx.accounts.stake_mint.to_account_info(), to: ctx.accounts.claims_vault.to_account_info(), authority: ctx.accounts.active_vault_authority.to_account_info() }, &[active_seeds]), refund_liability, ctx.accounts.stake_mint.decimals)?;
        reserve_claims_from_active(&mut ctx.accounts.ledger, refund_liability)?;
    }
    ctx.accounts.epoch.claim_liability_total = 0; ctx.accounts.epoch.total_refund_liability = refund_liability; ctx.accounts.epoch.settlement_fee_total = 0; ctx.accounts.epoch.winning_outcome_mask = 0; ctx.accounts.epoch.remaining_winning_stake = 0; ctx.accounts.epoch.cancel_reason = reason; ctx.accounts.epoch.refund_mode = true; ctx.accounts.epoch.claimable = true; ctx.accounts.epoch.status = if voided { EpochStatus::Voided } else { EpochStatus::Cancelled }; ctx.accounts.epoch.resolved_at = Clock::get()?.unix_timestamp;
    ctx.accounts.ledger.last_resolved_epoch_id = ctx.accounts.epoch.epoch_id;
    emit!(EpochCancelled { epoch: ctx.accounts.epoch.key(), epoch_id: ctx.accounts.epoch.epoch_id, reason: reason as u8 });
    Ok(())
}
