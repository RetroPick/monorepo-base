use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{constants::VERSION, errors::MarketError, events::MarketInitialized, state::*};

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [Config::SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ MarketError::Unauthorized,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
        seeds = [MarketTemplate::SEED, template.slug.as_bytes()],
        bump = template.bump,
    )]
    pub template: Box<Account<'info, MarketTemplate>>,

    #[account(
        init,
        payer = payer,
        space = 8 + MarketLedger::INIT_SPACE,
        seeds = [MarketLedger::SEED, template.key().as_ref()],
        bump
    )]
    pub ledger: Box<Account<'info, MarketLedger>>,

    #[account(
        init,
        payer = payer,
        space = 8 + ActiveVaultMeta::INIT_SPACE,
        seeds = [ActiveVaultMeta::META_SEED, template.key().as_ref()],
        bump
    )]
    pub active_vault_meta: Box<Account<'info, ActiveVaultMeta>>,

    #[account(
        init,
        payer = payer,
        token::mint = stake_mint,
        token::authority = active_vault_authority,
        seeds = [b"active_vault_token", template.key().as_ref()],
        bump
    )]
    pub active_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: PDA authority for the active vault token account.
    #[account(
        seeds = [ActiveVaultMeta::AUTHORITY_SEED, template.key().as_ref()],
        bump
    )]
    pub active_vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ClaimsVaultMeta::INIT_SPACE,
        seeds = [ClaimsVaultMeta::META_SEED, template.key().as_ref()],
        bump
    )]
    pub claims_vault_meta: Box<Account<'info, ClaimsVaultMeta>>,

    #[account(
        init,
        payer = payer,
        token::mint = stake_mint,
        token::authority = claims_vault_authority,
        seeds = [b"claims_vault_token", template.key().as_ref()],
        bump
    )]
    pub claims_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: PDA authority for the claims vault token account.
    #[account(
        seeds = [ClaimsVaultMeta::AUTHORITY_SEED, template.key().as_ref()],
        bump
    )]
    pub claims_vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + FeeVaultMeta::INIT_SPACE,
        seeds = [FeeVaultMeta::META_SEED, template.key().as_ref()],
        bump
    )]
    pub fee_vault_meta: Box<Account<'info, FeeVaultMeta>>,

    #[account(
        init,
        payer = payer,
        token::mint = stake_mint,
        token::authority = fee_vault_authority,
        seeds = [b"fee_vault_token", template.key().as_ref()],
        bump
    )]
    pub fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: PDA authority for the fee vault token account.
    #[account(
        seeds = [FeeVaultMeta::AUTHORITY_SEED, template.key().as_ref()],
        bump
    )]
    pub fee_vault_authority: UncheckedAccount<'info>,

    pub stake_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeMarket>) -> Result<()> {
    require!(ctx.accounts.config.stake_mint == ctx.accounts.stake_mint.key(), MarketError::InvalidTemplate);
    let ledger = &mut ctx.accounts.ledger;
    ledger.version = VERSION;
    ledger.bump = ctx.bumps.ledger;
    ledger.active_epoch_id = 0;
    ledger.last_resolved_epoch_id = 0;
    ledger.active_collateral_total = 0;
    ledger.claims_reserve_total = 0;
    ledger.fee_reserve_total = 0;
    ledger.insurance_reserve_total = 0;
    ledger.reserved = [0; 32];

    let active_meta = &mut ctx.accounts.active_vault_meta;
    active_meta.version = VERSION;
    active_meta.bump = ctx.bumps.active_vault_meta;
    active_meta.vault_authority_bump = ctx.bumps.active_vault_authority;
    active_meta.reserved = [0; 16];

    let claims_meta = &mut ctx.accounts.claims_vault_meta;
    claims_meta.version = VERSION;
    claims_meta.bump = ctx.bumps.claims_vault_meta;
    claims_meta.vault_authority_bump = ctx.bumps.claims_vault_authority;
    claims_meta.reserved = [0; 16];

    let fee_meta = &mut ctx.accounts.fee_vault_meta;
    fee_meta.version = VERSION;
    fee_meta.bump = ctx.bumps.fee_vault_meta;
    fee_meta.vault_authority_bump = ctx.bumps.fee_vault_authority;
    fee_meta.reserved = [0; 16];

    emit!(MarketInitialized {
        template: ctx.accounts.template.key(),
        ledger: ledger.key(),
        active_vault: ctx.accounts.active_vault.key(),
        claims_vault: ctx.accounts.claims_vault.key(),
        fee_vault: ctx.accounts.fee_vault.key(),
    });

    Ok(())
}
