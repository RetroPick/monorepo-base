use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::{errors::MarketError, events::Claimed, math::{compute_claim_payout, compute_refund_total, release_claim_on_withdraw}, state::*};

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)] pub user: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump)] pub config: Box<Account<'info, Config>>,
    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump)] pub template: Box<Account<'info, MarketTemplate>>,
    #[account(mut, seeds = [MarketLedger::SEED, template.key().as_ref()], bump = ledger.bump)] pub ledger: Box<Account<'info, MarketLedger>>,
    #[account(mut, seeds = [Epoch::SEED, template.key().as_ref(), &epoch.epoch_id.to_le_bytes()], bump = epoch.bump)] pub epoch: Box<Account<'info, Epoch>>,
    #[account(mut, seeds = [Position::SEED, epoch.key().as_ref(), user.key().as_ref()], bump = position.bump)] pub position: Box<Account<'info, Position>>,
    #[account(mut, constraint = user_token_account.owner == user.key() @ MarketError::Unauthorized, constraint = user_token_account.mint == stake_mint.key() @ MarketError::InvalidTemplate)] pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, seeds = [b"claims_vault_token", template.key().as_ref()], bump, constraint = claims_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate, constraint = claims_vault.owner == claims_vault_authority.key() @ MarketError::InvalidTemplate)] pub claims_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(seeds = [ClaimsVaultMeta::META_SEED, template.key().as_ref()], bump = claims_vault_meta.bump)] pub claims_vault_meta: Box<Account<'info, ClaimsVaultMeta>>,
    /// CHECK: PDA authority for claims vault token account.
    #[account(seeds = [ClaimsVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = claims_vault_meta.vault_authority_bump)] pub claims_vault_authority: UncheckedAccount<'info>,
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<Claim>) -> Result<()> {
    require!(ctx.accounts.epoch.claimable, MarketError::ClaimNotAvailable);
    require!(ctx.accounts.stake_mint.key() == ctx.accounts.config.stake_mint, MarketError::InvalidTemplate);
    require!(!ctx.accounts.position.claimed, MarketError::AlreadyClaimed);
    let (amount, winning_stake) = if ctx.accounts.epoch.refund_mode {
        (compute_refund_total(&ctx.accounts.position)?, 0)
    } else {
        compute_claim_payout(
            &ctx.accounts.epoch,
            &ctx.accounts.position,
            ctx.accounts.ledger.claims_reserve_total,
        )?
    };
    require!(amount > 0, MarketError::NothingToClaim);
    let template_key = ctx.accounts.template.key();
    let claim_seeds: &[&[u8]] = &[ClaimsVaultMeta::AUTHORITY_SEED, template_key.as_ref(), &[ctx.accounts.claims_vault_meta.vault_authority_bump]];
    transfer_checked(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked { from: ctx.accounts.claims_vault.to_account_info(), mint: ctx.accounts.stake_mint.to_account_info(), to: ctx.accounts.user_token_account.to_account_info(), authority: ctx.accounts.claims_vault_authority.to_account_info() }, &[claim_seeds]), amount, ctx.accounts.stake_mint.decimals)?;
    ctx.accounts.position.claimed_amount = amount; ctx.accounts.position.claimed = true; ctx.accounts.epoch.claimed_total = ctx.accounts.epoch.claimed_total.checked_add(amount).ok_or(MarketError::MathOverflow)?; if !ctx.accounts.epoch.refund_mode { ctx.accounts.epoch.remaining_winning_stake = ctx.accounts.epoch.remaining_winning_stake.checked_sub(winning_stake).ok_or(MarketError::MathOverflow)?; } release_claim_on_withdraw(&mut ctx.accounts.ledger, amount)?;
    emit!(Claimed { epoch: ctx.accounts.epoch.key(), user: ctx.accounts.user.key(), amount });
    Ok(())
}
