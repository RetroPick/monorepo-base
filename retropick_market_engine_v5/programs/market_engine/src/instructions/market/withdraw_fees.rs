use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::{errors::MarketError, events::FeesWithdrawn, math::release_fee_on_withdraw, state::*};

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(mut)] pub authority: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump, constraint = config.admin == authority.key() || config.treasury == authority.key() @ MarketError::Unauthorized)] pub config: Box<Account<'info, Config>>,
    #[account(seeds = [MarketTemplate::SEED, template.slug.as_bytes()], bump = template.bump)] pub template: Box<Account<'info, MarketTemplate>>,
    #[account(mut, seeds = [MarketLedger::SEED, template.key().as_ref()], bump = ledger.bump)] pub ledger: Box<Account<'info, MarketLedger>>,
    #[account(mut, seeds = [b"fee_vault_token", template.key().as_ref()], bump, constraint = fee_vault.owner == fee_vault_authority.key() @ MarketError::InvalidTemplate, constraint = fee_vault.mint == stake_mint.key() @ MarketError::InvalidTemplate)] pub fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(seeds = [FeeVaultMeta::META_SEED, template.key().as_ref()], bump = fee_vault_meta.bump)] pub fee_vault_meta: Box<Account<'info, FeeVaultMeta>>,
    /// CHECK: PDA authority for fee vault token account.
    #[account(seeds = [FeeVaultMeta::AUTHORITY_SEED, template.key().as_ref()], bump = fee_vault_meta.vault_authority_bump)] pub fee_vault_authority: UncheckedAccount<'info>,
    #[account(mut, constraint = treasury_token_account.owner == config.treasury @ MarketError::Unauthorized, constraint = treasury_token_account.mint == stake_mint.key() @ MarketError::InvalidTemplate)] pub treasury_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
    require!(amount > 0, MarketError::NothingToClaim);
    require!(ctx.accounts.stake_mint.key() == ctx.accounts.config.stake_mint, MarketError::InvalidTemplate);
    require!(ctx.accounts.ledger.fee_reserve_total >= amount, MarketError::NothingToClaim);
    let template_key = ctx.accounts.template.key();
    let fee_seeds: &[&[u8]] = &[FeeVaultMeta::AUTHORITY_SEED, template_key.as_ref(), &[ctx.accounts.fee_vault_meta.vault_authority_bump]];
    transfer_checked(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked { from: ctx.accounts.fee_vault.to_account_info(), mint: ctx.accounts.stake_mint.to_account_info(), to: ctx.accounts.treasury_token_account.to_account_info(), authority: ctx.accounts.fee_vault_authority.to_account_info() }, &[fee_seeds]), amount, ctx.accounts.stake_mint.decimals)?;
    release_fee_on_withdraw(&mut ctx.accounts.ledger, amount)?;
    emit!(FeesWithdrawn { template: ctx.accounts.template.key(), amount });
    Ok(())
}
