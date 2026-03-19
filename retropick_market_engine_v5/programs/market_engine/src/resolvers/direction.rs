use anchor_lang::prelude::*;
use crate::{errors::MarketError, state::OracleCheckpoint};

pub fn resolve_direction(checkpoint_a: OracleCheckpoint, checkpoint_b: OracleCheckpoint, void_on_equal: bool) -> Result<Option<u64>> {
    require!(checkpoint_a.written && checkpoint_b.written, MarketError::InvalidEpochState);
    if checkpoint_b.value_e8 > checkpoint_a.value_e8 { Ok(Some(1u64 << 0)) }
    else if checkpoint_b.value_e8 < checkpoint_a.value_e8 { Ok(Some(1u64 << 1)) }
    else if void_on_equal { Ok(None) } else { Ok(Some(1u64 << 1)) }
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::OracleCheckpoint;

    fn cp(v: i128) -> OracleCheckpoint { OracleCheckpoint { value_e8: v, publish_time: 0, confidence_e8: 0, written: true } }

    #[test]
    fn direction_yes() {
        assert_eq!(resolve_direction(cp(100), cp(110), true).unwrap(), Some(1));
    }

    #[test]
    fn direction_no() {
        assert_eq!(resolve_direction(cp(100), cp(90), true).unwrap(), Some(2));
    }

    #[test]
    fn direction_equal_void() {
        assert_eq!(resolve_direction(cp(100), cp(100), true).unwrap(), None);
    }
}
