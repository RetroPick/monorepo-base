use anchor_lang::prelude::*;

use crate::{constants::MAX_OUTCOMES, errors::MarketError, state::types::*};

#[account]
pub struct Epoch {
    pub version: u8,
    pub bump: u8,
    pub epoch_id: u64,
    pub status: EpochStatus,
    pub cancel_reason: CancelReason,
    pub timing: MarketTiming,
    pub checkpoint_a: OracleCheckpoint,
    pub checkpoint_b: OracleCheckpoint,
    pub oracle_feed_id: [u8; 32],
    pub market_type: MarketType,
    pub condition: Condition,
    pub absolute_threshold_value_e8: i128,
    pub range_bounds_e8: [i128; MAX_OUTCOMES - 1],
    pub switch_fee_bps: u16,
    pub settlement_fee_bps: u16,
    pub equal_price_voids: bool,
    pub fee_on_losing_pool: bool,
    pub allow_multi_side_positions: bool,
    pub outcome_count: u8,
    pub winning_outcome_mask: u64,
    pub total_pool: u64,
    pub outcome_pools: [u64; MAX_OUTCOMES],
    pub switch_fee_total: u64,
    pub settlement_fee_total: u64,
    pub claim_liability_total: u64,
    pub total_refund_liability: u64,
    pub claimed_total: u64,
    pub remaining_winning_stake: u64,
    pub refund_mode: bool,
    pub claimable: bool,
    pub created_at: i64,
    pub locked_at: i64,
    pub resolved_at: i64,
    pub total_positions: u32,
    pub reserved: [u8; 16],
}

impl Epoch {
    pub const SEED: &'static [u8] = b"epoch";
    pub const INIT_SPACE: usize = 446;
    pub fn is_open(&self, now: i64) -> bool { self.status == EpochStatus::Open && now >= self.timing.open_at && now < self.timing.lock_at }
    pub fn is_lockable(&self, now: i64) -> bool { self.status == EpochStatus::Open && now >= self.timing.lock_at }
    pub fn is_resolvable(&self, now: i64) -> bool { self.status == EpochStatus::Locked && now >= self.timing.resolve_at }
    pub fn requires_checkpoint_a_on_lock(&self) -> bool { matches!(self.market_type, MarketType::Direction) }
    pub fn validate_checkpoint_a_publish_time(&self, publish_time: i64) -> Result<()> {
        require!(publish_time >= self.timing.lock_at, MarketError::InvalidOraclePublishTime);
        Ok(())
    }
    pub fn validate_checkpoint_b_publish_time(&self, publish_time: i64) -> Result<()> {
        require!(publish_time >= self.timing.resolve_at, MarketError::InvalidOraclePublishTime);
        if self.checkpoint_a.written {
            require!(publish_time >= self.checkpoint_a.publish_time, MarketError::InvalidOraclePublishTime);
        }
        Ok(())
    }
    pub fn winning_pool_total(&self) -> u64 {
        let mut sum = 0u64;
        for i in 0..self.outcome_count as usize {
            if (self.winning_outcome_mask & (1u64 << i)) != 0 {
                sum = sum.saturating_add(self.outcome_pools[i]);
            }
        }
        sum
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn epoch_with_timing(open_at: i64, lock_at: i64) -> Epoch {
        Epoch {
            version: 1,
            bump: 1,
            epoch_id: 1,
            status: EpochStatus::Open,
            cancel_reason: CancelReason::None,
            timing: MarketTiming {
                open_at,
                lock_at,
                resolve_at: lock_at + 10,
            },
            checkpoint_a: OracleCheckpoint::default(),
            checkpoint_b: OracleCheckpoint::default(),
            oracle_feed_id: [0; 32],
            market_type: MarketType::Direction,
            condition: Condition::AtOrAbove,
            absolute_threshold_value_e8: 0,
            range_bounds_e8: [0; MAX_OUTCOMES - 1],
            switch_fee_bps: 0,
            settlement_fee_bps: 0,
            equal_price_voids: true,
            fee_on_losing_pool: true,
            allow_multi_side_positions: false,
            outcome_count: 2,
            winning_outcome_mask: 0,
            total_pool: 0,
            outcome_pools: [0; MAX_OUTCOMES],
            switch_fee_total: 0,
            settlement_fee_total: 0,
            claim_liability_total: 0,
            total_refund_liability: 0,
            claimed_total: 0,
            remaining_winning_stake: 0,
            refund_mode: false,
            claimable: false,
            created_at: 0,
            locked_at: 0,
            resolved_at: 0,
            total_positions: 0,
            reserved: [0; 16],
        }
    }

    #[test]
    fn epoch_is_not_open_before_open_time() {
        let epoch = epoch_with_timing(100, 200);
        assert!(!epoch.is_open(99));
    }

    #[test]
    fn epoch_is_open_inside_window() {
        let epoch = epoch_with_timing(100, 200);
        assert!(epoch.is_open(150));
    }

    #[test]
    fn checkpoint_a_must_not_precede_lock_time() {
        let epoch = epoch_with_timing(100, 200);
        assert_eq!(
            epoch.validate_checkpoint_a_publish_time(199).unwrap_err(),
            MarketError::InvalidOraclePublishTime.into()
        );
    }

    #[test]
    fn direction_epoch_snapshot_requires_checkpoint_a_on_lock() {
        let epoch = epoch_with_timing(100, 200);
        assert!(epoch.requires_checkpoint_a_on_lock());
    }

    #[test]
    fn checkpoint_b_must_not_precede_resolve_time() {
        let mut epoch = epoch_with_timing(100, 200);
        epoch.checkpoint_a = OracleCheckpoint {
            value_e8: 100,
            publish_time: 205,
            confidence_e8: 0,
            written: true,
        };
        assert_eq!(
            epoch.validate_checkpoint_b_publish_time(209).unwrap_err(),
            MarketError::InvalidOraclePublishTime.into()
        );
    }

    #[test]
    fn epoch_init_space_is_smaller_than_legacy_layout() {
        assert!(Epoch::INIT_SPACE < 550);
    }
}
