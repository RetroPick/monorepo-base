use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::{errors::MarketError, events::SideSwitched, math::{compute_switch, reserve_switch_fee_from_active}, state::*};

#[derive(Accounts)]
pub struct SwitchSide<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump, constraint = !config.paused @ MarketError::ProtocolPaused)] pub config: Box<Account<'info, Config>>,
    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump)] pub template: Box<Account<'info, MarketTemplate>>,
    #[account(mut, seeds = [MarketLedger::SEED, template.key().as_ref()], bump = ledger.bump)] pub ledger: Box<Account<'info, MarketLedger>>,
    #[account(mut, seeds = [Epoch::SEED, template.key().as_ref(), &epoch.epoch_id.to_le_bytes()], bump = epoch.bump)] pub epoch: Box<Account<'info, Epoch>>,
    #[account(mut, seeds = [Position::SEED, epoch.key().as_ref(), user.key().as_ref()], bump = position.bump)] pub position: Box<Account<'info, Position>>,
    #[account(mut, seeds = [b"active_vault_token", template.key().as_ref()], bump, constraint = active_vault.owner == active_vault_authority.key() @ MarketError::InvalidTemplate, constraint = active_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate)] pub active_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: PDA authority for active vault token account.
    #[account(seeds = [ActiveVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = active_vault_meta.vault_authority_bump)] pub active_vault_authority: UncheckedAccount<'info>,
    #[account(seeds = [ActiveVaultMeta::META_SEED, template.key().as_ref()], bump = active_vault_meta.bump)] pub active_vault_meta: Box<Account<'info, ActiveVaultMeta>>,
    #[account(mut, seeds = [b"fee_vault_token", template.key().as_ref()], bump, constraint = fee_vault.owner == fee_vault_authority.key() @ MarketError::InvalidTemplate, constraint = fee_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate)] pub fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: PDA authority for fee vault token account.
    #[account(seeds = [FeeVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = fee_vault_meta.vault_authority_bump)] pub fee_vault_authority: UncheckedAccount<'info>,
    #[account(seeds = [FeeVaultMeta::META_SEED, template.key().as_ref()], bump = fee_vault_meta.bump)] pub fee_vault_meta: Box<Account<'info, FeeVaultMeta>>,
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<SwitchSide>, from_outcome: u8, to_outcome: u8, gross_amount: u64) -> Result<()> {
    require!(gross_amount > 0, MarketError::ZeroStake);
    require!(from_outcome != to_outcome, MarketError::InvalidOutcome);
    require!((from_outcome as usize) < ctx.accounts.epoch.outcome_count as usize, MarketError::InvalidOutcome);
    require!((to_outcome as usize) < ctx.accounts.epoch.outcome_count as usize, MarketError::InvalidOutcome);
    ctx.accounts.ledger.require_active_epoch(ctx.accounts.epoch.epoch_id)?;
    require!(ctx.accounts.epoch.is_open(Clock::get()?.unix_timestamp), MarketError::BettingClosed);
    let position = &mut ctx.accounts.position;
    require!(position.stakes[from_outcome as usize] >= gross_amount, MarketError::InsufficientSourceStake);
    let (net_amount, fee_amount) = compute_switch(gross_amount, ctx.accounts.epoch.switch_fee_bps)?;
    require!(net_amount > 0, MarketError::AmountTooSmall);
    if !ctx.accounts.epoch.allow_multi_side_positions {
        require!(
            position.is_single_sided_on(from_outcome as usize, ctx.accounts.epoch.outcome_count),
            MarketError::SingleSideViolation
        );
        require!(
            gross_amount == position.stakes[from_outcome as usize],
            MarketError::PartialSwitchDisallowed
        );
    }
    position.stakes[from_outcome as usize] = position.stakes[from_outcome as usize].checked_sub(gross_amount).ok_or(MarketError::MathOverflow)?;
    position.stakes[to_outcome as usize] = position.stakes[to_outcome as usize].checked_add(net_amount).ok_or(MarketError::MathOverflow)?;
    position.total_stake = position.total_stake.checked_sub(fee_amount).ok_or(MarketError::MathOverflow)?; position.switch_fees_paid = position.switch_fees_paid.checked_add(fee_amount).ok_or(MarketError::MathOverflow)?;
    let epoch = &mut ctx.accounts.epoch;
    epoch.outcome_pools[from_outcome as usize] = epoch.outcome_pools[from_outcome as usize].checked_sub(gross_amount).ok_or(MarketError::MathOverflow)?;
    epoch.outcome_pools[to_outcome as usize] = epoch.outcome_pools[to_outcome as usize].checked_add(net_amount).ok_or(MarketError::MathOverflow)?;
    epoch.total_pool = epoch.total_pool.checked_sub(fee_amount).ok_or(MarketError::MathOverflow)?; epoch.switch_fee_total = epoch.switch_fee_total.checked_add(fee_amount).ok_or(MarketError::MathOverflow)?;
    if fee_amount > 0 {
        let template_key = ctx.accounts.template.key();
        let active_seeds: &[&[u8]] = &[ActiveVaultMeta::AUTHORITY_SEED, template_key.as_ref(), &[ctx.accounts.active_vault_meta.vault_authority_bump]];
        transfer_checked(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked { from: ctx.accounts.active_vault.to_account_info(), mint: ctx.accounts.stake_mint.to_account_info(), to: ctx.accounts.fee_vault.to_account_info(), authority: ctx.accounts.active_vault_authority.to_account_info() }, &[active_seeds]), fee_amount, ctx.accounts.stake_mint.decimals)?;
        reserve_switch_fee_from_active(&mut ctx.accounts.ledger, fee_amount)?;
    }
    emit!(SideSwitched { epoch: epoch.key(), user: ctx.accounts.user.key(), from_outcome, to_outcome, gross_amount, fee_amount, net_amount });
    Ok(())
}
