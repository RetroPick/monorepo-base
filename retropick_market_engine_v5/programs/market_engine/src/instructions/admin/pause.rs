use anchor_lang::prelude::*;

use crate::{errors::MarketError, state::*};

#[derive(Accounts)]
pub struct PauseProgram<'info> {
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

pub fn handler(ctx: Context<PauseProgram>, paused: bool) -> Result<()> {
    ctx.accounts.config.paused = paused;
    Ok(())
}
