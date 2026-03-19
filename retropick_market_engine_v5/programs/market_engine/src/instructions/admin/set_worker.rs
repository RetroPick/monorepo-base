use anchor_lang::prelude::*;

use crate::{errors::MarketError, state::*};

#[derive(Accounts)]
pub struct SetWorkerAuthority<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [Config::SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ MarketError::Unauthorized,
    )]
    pub config: Account<'info, Config>,
}

pub fn handler(ctx: Context<SetWorkerAuthority>, worker_authority: Pubkey) -> Result<()> {
    require!(worker_authority != Pubkey::default(), MarketError::InvalidAuthority);
    ctx.accounts.config.worker_authority = worker_authority;
    Ok(())
}
