use anchor_lang::prelude::*;

use crate::{errors::MarketError, state::*};

#[derive(Accounts)]
pub struct SetTreasury<'info> {
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

pub fn handler(ctx: Context<SetTreasury>, treasury: Pubkey) -> Result<()> {
    require!(treasury != Pubkey::default(), MarketError::InvalidAuthority);
    ctx.accounts.config.treasury = treasury;
    Ok(())
}
