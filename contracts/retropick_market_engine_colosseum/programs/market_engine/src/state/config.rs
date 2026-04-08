use anchor_lang::prelude::*;

use crate::{constants::MAX_OUTCOMES, errors::MarketError, state::types::*};

/// Global singleton configuration. **PDA seeds:** [`Config::SEED`] → one account per program deployment.
///
/// Roles and unused fields: see `docs/current/currentPrograms.md` §3 and §3.1.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub version: u8,
    pub bump: u8,

    /// Full admin signer: templates, market init, pause, treasury/worker updates.
    pub admin: Pubkey,
    /// Receives protocol fee withdrawals; may sign `withdraw_fees` together with `admin` per instruction constraints.
    pub treasury: Pubkey,
    /// May open/lock/resolve/cancel epochs together with `admin` (see authority matrix in docs).
    pub worker_authority: Pubkey,

    /// When `true`, most instructions return [`MarketError::ProtocolPaused`]; exceptions documented per instruction (e.g. `cancel_epoch`, `claim`).
    pub paused: bool,

    /// SPL mint for all stake token accounts and vaults in this deployment.
    pub stake_mint: Pubkey,

    /// Written only at [`crate::instructions::admin::initialize`]. **Not read** when opening epochs or upserting templates—epoch fees come from the template at `open_epoch`. Treat as off-chain default / future use.
    pub default_settlement_fee_bps: u16,
    /// Upper bound enforced on template `switch_fee_bps` at [`crate::instructions::admin::upsert_template`].
    pub max_switch_fee_bps: u16,
    /// Upper bound on template `outcome_count` (must be ≤ [`crate::constants::MAX_OUTCOMES`]).
    pub max_outcomes: u8,

    /// Staleness and confidence limits for Pyth pull feeds (`flow.md` §3).
    pub oracle_config: OracleConfig,

    pub reserved: [u8; 32],
}

impl Config {
    pub const SEED: &'static [u8] = b"config";

    /// Ensures non-default authorities, fee bps ≤ 10_000, outcome cap, and [`OracleKind::Pyth`].
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

    /// Returns true if `key` is either `worker_authority` or `admin` (operator paths).
    pub fn is_worker_or_admin(&self, key: &Pubkey) -> bool {
        self.worker_authority == *key || self.admin == *key
    }
}
