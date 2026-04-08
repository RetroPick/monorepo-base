use anchor_lang::prelude::*;

use crate::{constants::MAX_OUTCOMES, errors::MarketError, state::types::*};

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub version: u8,
    pub bump: u8,

    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub worker_authority: Pubkey,

    pub paused: bool,

    pub stake_mint: Pubkey,

    pub default_settlement_fee_bps: u16,
    pub max_switch_fee_bps: u16,
    pub max_outcomes: u8,

    pub oracle_config: OracleConfig,

    pub reserved: [u8; 32],
}

impl Config {
    pub const SEED: &'static [u8] = b"config";

    pub fn validate(&self) -> Result<()> {
        require!(self.admin != Pubkey::default(), MarketError::Unauthorized);
        require!(self.worker_authority != Pubkey::default(), MarketError::Unauthorized);
        require!(self.treasury != Pubkey::default(), MarketError::Unauthorized);
        require!(self.default_settlement_fee_bps <= 10_000, MarketError::InvalidFeeBps);
        require!(self.max_switch_fee_bps <= 10_000, MarketError::InvalidFeeBps);
        require!(self.max_outcomes as usize <= MAX_OUTCOMES, MarketError::TooManyOutcomes);
        require!(matches!(self.oracle_config.oracle_kind, OracleKind::Pyth), MarketError::InvalidOracleFeed);
        Ok(())
    }

    pub fn is_worker_or_admin(&self, key: &Pubkey) -> bool {
        self.worker_authority == *key || self.admin == *key
    }
}
