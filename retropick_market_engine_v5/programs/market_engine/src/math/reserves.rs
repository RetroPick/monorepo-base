use anchor_lang::prelude::*;
use crate::{errors::MarketError, state::MarketLedger};

pub fn reserve_claims_from_active(ledger: &mut MarketLedger, amount: u64) -> Result<()> {
    ledger.active_collateral_total = ledger.active_collateral_total.checked_sub(amount).ok_or(MarketError::MathOverflow)?;
    ledger.claims_reserve_total = ledger.claims_reserve_total.checked_add(amount).ok_or(MarketError::MathOverflow)?;
    Ok(())
}
pub fn reserve_fees_from_active(ledger: &mut MarketLedger, amount: u64) -> Result<()> {
    ledger.active_collateral_total = ledger.active_collateral_total.checked_sub(amount).ok_or(MarketError::MathOverflow)?;
    ledger.fee_reserve_total = ledger.fee_reserve_total.checked_add(amount).ok_or(MarketError::MathOverflow)?;
    Ok(())
}
pub fn reserve_switch_fee_from_active(ledger: &mut MarketLedger, amount: u64) -> Result<()> {
    reserve_fees_from_active(ledger, amount)
}
pub fn release_claim_on_withdraw(ledger: &mut MarketLedger, amount: u64) -> Result<()> {
    ledger.claims_reserve_total = ledger.claims_reserve_total.checked_sub(amount).ok_or(MarketError::MathOverflow)?;
    Ok(())
}
pub fn release_fee_on_withdraw(ledger: &mut MarketLedger, amount: u64) -> Result<()> {
    ledger.fee_reserve_total = ledger.fee_reserve_total.checked_sub(amount).ok_or(MarketError::MathOverflow)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn switch_fee_is_removed_from_active_collateral() {
        let mut ledger = MarketLedger {
            version: 1,
            bump: 1,
            active_epoch_id: 1,
            last_resolved_epoch_id: 1,
            active_collateral_total: 1_000,
            claims_reserve_total: 0,
            fee_reserve_total: 0,
            insurance_reserve_total: 0,
            reserved: [0; 32],
        };

        reserve_switch_fee_from_active(&mut ledger, 25).unwrap();
        assert_eq!(ledger.active_collateral_total, 975);
        assert_eq!(ledger.fee_reserve_total, 25);
    }
}
