use anchor_lang::prelude::*;
use crate::{errors::MarketError, state::{Condition, OracleCheckpoint}};

pub fn resolve_threshold(condition: Condition, threshold_value_e8: i128, checkpoint_b: OracleCheckpoint) -> Result<u64> {
    require!(checkpoint_b.written, MarketError::InvalidEpochState);
    let yes = match condition {
        Condition::AtOrAbove => checkpoint_b.value_e8 >= threshold_value_e8,
        Condition::Below => checkpoint_b.value_e8 < threshold_value_e8,
    };
    Ok(if yes { 1u64 << 0 } else { 1u64 << 1 })
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{Condition, OracleCheckpoint};

    fn cp(v: i128) -> OracleCheckpoint { OracleCheckpoint { value_e8: v, publish_time: 0, confidence_e8: 0, written: true } }

    #[test]
    fn threshold_at_or_above_yes() {
        assert_eq!(resolve_threshold(Condition::AtOrAbove, 100, cp(100)).unwrap(), 1);
    }

    #[test]
    fn threshold_below_yes() {
        assert_eq!(resolve_threshold(Condition::Below, 100, cp(99)).unwrap(), 1);
    }
}
