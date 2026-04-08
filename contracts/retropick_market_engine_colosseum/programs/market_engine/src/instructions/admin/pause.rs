//! Toggle [`Config::paused`]. Paused state blocks most instructions; see `lib.rs` / `flow.md` for exceptions.

use anchor_lang::prelude::*;

use crate::{errors::MarketError, state::*};

/// **Signer:** [`Config::admin`].
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

/// Sets `config.paused = paused`.
pub(crate) fn handler(ctx: Context<PauseProgram>, paused: bool) -> Result<()> {
    ctx.accounts.config.paused = paused;
    Ok(())
}
