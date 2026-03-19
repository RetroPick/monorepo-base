use anchor_lang::prelude::*;

use crate::errors::MarketError;

#[account]
#[derive(InitSpace)]
pub struct MarketLedger {
    pub version: u8,
    pub bump: u8,

    pub active_epoch_id: u64,
    pub last_resolved_epoch_id: u64,

    pub active_collateral_total: u64,
    pub claims_reserve_total: u64,
    pub fee_reserve_total: u64,
    pub insurance_reserve_total: u64,

    pub reserved: [u8; 32],
}

impl MarketLedger {
    pub const SEED: &'static [u8] = b"ledger";

    pub fn require_can_open_next_epoch(&self, epoch_id: u64) -> Result<()> {
        require!(
            self.active_epoch_id == self.last_resolved_epoch_id,
            MarketError::PreviousEpochUnresolved
        );
        require!(
            epoch_id == self.active_epoch_id.saturating_add(1),
            MarketError::EpochAlreadyExists
        );
        Ok(())
    }

    pub fn require_active_epoch(&self, epoch_id: u64) -> Result<()> {
        require!(epoch_id == self.active_epoch_id, MarketError::EpochNotActive);
        Ok(())
    }

    pub fn increase_active_collateral(&mut self, amount: u64) -> Result<()> {
        self.active_collateral_total = self
            .active_collateral_total
            .checked_add(amount)
            .ok_or(MarketError::MathOverflow)?;
        Ok(())
    }

    pub fn decrease_active_collateral(&mut self, amount: u64) -> Result<()> {
        self.active_collateral_total = self
            .active_collateral_total
            .checked_sub(amount)
            .ok_or(MarketError::MathOverflow)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ledger(active_epoch_id: u64, last_resolved_epoch_id: u64) -> MarketLedger {
        MarketLedger {
            version: 1,
            bump: 1,
            active_epoch_id,
            last_resolved_epoch_id,
            active_collateral_total: 0,
            claims_reserve_total: 0,
            fee_reserve_total: 0,
            insurance_reserve_total: 0,
            reserved: [0; 32],
        }
    }

    #[test]
    fn cannot_open_next_epoch_while_previous_is_unresolved() {
        let ledger = ledger(2, 1);
        assert_eq!(
            ledger.require_can_open_next_epoch(3).unwrap_err(),
            MarketError::PreviousEpochUnresolved.into()
        );
    }

    #[test]
    fn active_epoch_guard_rejects_stale_epoch() {
        let ledger = ledger(2, 2);
        assert_eq!(
            ledger.require_active_epoch(1).unwrap_err(),
            MarketError::EpochNotActive.into()
        );
    }

    #[test]
    fn ledger_init_space_is_smaller_than_legacy_layout() {
        assert!(MarketLedger::INIT_SPACE < 122);
    }
}
