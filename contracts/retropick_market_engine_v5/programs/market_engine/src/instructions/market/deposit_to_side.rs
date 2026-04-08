use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::{constants::VERSION, errors::MarketError, events::PositionDeposited, state::*};

#[derive(Accounts)]
pub struct DepositToSide<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump, constraint = !config.paused @ MarketError::ProtocolPaused)] pub config: Box<Account<'info, Config>>,
    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump)] pub template: Box<Account<'info, MarketTemplate>>,
    #[account(mut, seeds = [MarketLedger::SEED, template.key().as_ref()], bump = ledger.bump)] pub ledger: Box<Account<'info, MarketLedger>>,
    #[account(mut, seeds = [Epoch::SEED, template.key().as_ref(), &epoch.epoch_id.to_le_bytes()], bump = epoch.bump)] pub epoch: Box<Account<'info, Epoch>>,
    #[account(init_if_needed, payer = user, space = 8 + Position::INIT_SPACE, seeds = [Position::SEED, epoch.key().as_ref(), user.key().as_ref()], bump)] pub position: Box<Account<'info, Position>>,
    #[account(mut, constraint = user_token_account.owner == user.key() @ MarketError::Unauthorized, constraint = user_token_account.mint == stake_mint.key() @ MarketError::InvalidTemplate)] pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, seeds = [b"active_vault_token", template.key().as_ref()], bump, constraint = active_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate)] pub active_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositToSide>, outcome_index: u8, amount: u64) -> Result<()> {
    require!(amount > 0, MarketError::ZeroStake);
    require!((outcome_index as usize) < ctx.accounts.epoch.outcome_count as usize, MarketError::InvalidOutcome);
    require!(ctx.accounts.stake_mint.key() == ctx.accounts.config.stake_mint, MarketError::InvalidTemplate);
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.ledger.require_active_epoch(ctx.accounts.epoch.epoch_id)?;
    require!(ctx.accounts.epoch.is_open(now), MarketError::BettingClosed);
    transfer_checked(CpiContext::new(ctx.accounts.token_program.to_account_info(), TransferChecked { from: ctx.accounts.user_token_account.to_account_info(), mint: ctx.accounts.stake_mint.to_account_info(), to: ctx.accounts.active_vault.to_account_info(), authority: ctx.accounts.user.to_account_info() }), amount, ctx.accounts.stake_mint.decimals)?;
    let position = &mut ctx.accounts.position;
    if position.version == 0 { position.version = VERSION; position.bump = ctx.bumps.position; position.stakes = [0u64; crate::constants::MAX_OUTCOMES]; position.total_stake = 0; position.switch_fees_paid = 0; position.entry_fees_paid = 0; position.claimed_amount = 0; position.claimed = false; position.reserved = [0; 16]; ctx.accounts.epoch.total_positions = ctx.accounts.epoch.total_positions.saturating_add(1); }
    require!(
        position.can_deposit_to_outcome(
            outcome_index as usize,
            ctx.accounts.epoch.outcome_count,
            ctx.accounts.epoch.allow_multi_side_positions,
        ),
        MarketError::SingleSideViolation
    );
    position.stakes[outcome_index as usize] = position.stakes[outcome_index as usize].checked_add(amount).ok_or(MarketError::MathOverflow)?;
    position.total_stake = position.total_stake.checked_add(amount).ok_or(MarketError::MathOverflow)?;
    let epoch = &mut ctx.accounts.epoch;
    epoch.outcome_pools[outcome_index as usize] = epoch.outcome_pools[outcome_index as usize].checked_add(amount).ok_or(MarketError::MathOverflow)?;
    epoch.total_pool = epoch.total_pool.checked_add(amount).ok_or(MarketError::MathOverflow)?;
    ctx.accounts.ledger.increase_active_collateral(amount)?;
    emit!(PositionDeposited { epoch: epoch.key(), user: ctx.accounts.user.key(), outcome: outcome_index, amount });
    Ok(())
}
