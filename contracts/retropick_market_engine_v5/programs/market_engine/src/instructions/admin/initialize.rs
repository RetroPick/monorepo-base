use anchor_lang::prelude::*;

use crate::{constants::VERSION, events::ConfigInitialized, state::*};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + Config::INIT_SPACE,
        seeds = [Config::SEED],
        bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeConfigParams {
    pub treasury: Pubkey,
    pub worker_authority: Pubkey,
    pub stake_mint: Pubkey,
    pub default_settlement_fee_bps: u16,
    pub max_switch_fee_bps: u16,
    pub max_outcomes: u8,
    pub oracle_config: OracleConfig,
}

pub fn handler(ctx: Context<InitializeConfig>, params: InitializeConfigParams) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.version = VERSION;
    config.bump = ctx.bumps.config;
    config.admin = ctx.accounts.admin.key();
    config.treasury = params.treasury;
    config.worker_authority = params.worker_authority;
    config.paused = false;
    config.stake_mint = params.stake_mint;
    config.default_settlement_fee_bps = params.default_settlement_fee_bps;
    config.max_switch_fee_bps = params.max_switch_fee_bps;
    config.max_outcomes = params.max_outcomes;
    config.oracle_config = params.oracle_config;
    config.reserved = [0; 32];
    config.validate()?;

    emit!(ConfigInitialized {
        admin: config.admin,
        treasury: config.treasury,
        worker_authority: config.worker_authority,
    });

    Ok(())
}
