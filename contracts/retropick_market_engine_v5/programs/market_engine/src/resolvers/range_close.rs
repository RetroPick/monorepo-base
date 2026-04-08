use anchor_lang::prelude::*;
use crate::{constants::MAX_OUTCOMES, errors::MarketError, state::OracleCheckpoint};

pub fn resolve_range_close(checkpoint_b: OracleCheckpoint, outcome_count: u8, range_bounds_e8: [i128; MAX_OUTCOMES - 1]) -> Result<u64> {
    require!(checkpoint_b.written, MarketError::InvalidEpochState);
    require!(outcome_count >= 2, MarketError::InvalidTemplate);
    let value = checkpoint_b.value_e8;
    let idx = if value < range_bounds_e8[0] { 0usize } else {
        let mut found = None;
        for i in 1..(outcome_count as usize - 1) {
            if value < range_bounds_e8[i] { found = Some(i); break; }
        }
        found.unwrap_or(outcome_count as usize - 1)
    };
    Ok(1u64 << idx)
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::OracleCheckpoint;

    fn cp(v: i128) -> OracleCheckpoint { OracleCheckpoint { value_e8: v, publish_time: 0, confidence_e8: 0, written: true } }

    #[test]
    fn range_first_bucket() {
        assert_eq!(resolve_range_close(cp(50), 3, [100, 200, 0, 0, 0, 0, 0]).unwrap(), 1);
    }

    #[test]
    fn range_middle_bucket() {
        assert_eq!(resolve_range_close(cp(150), 3, [100, 200, 0, 0, 0, 0, 0]).unwrap(), 2);
    }
}
