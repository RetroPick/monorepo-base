//! [`Epoch`] account: one open/lock/resolve cycle per `(template, epoch_id)`.

use anchor_lang::prelude::*;

use crate::{constants::MAX_OUTCOMES, errors::MarketError, state::types::*};

/// Per-epoch state and accounting. **PDA seeds:** [`Epoch::SEED`], `template_pubkey`, `epoch_id.to_le_bytes()`.
///
/// Lifecycle predicates (`flow.md` §1): **betting open** = `status == Open` ∧ `open_at ≤ now < lock_at`; **lock** = `Open` ∧ `now ≥ lock_at`; **resolve** = `Locked` ∧ `now ≥ resolve_at`.
#[account]
pub struct Epoch {
    pub version: u8,
    pub bump: u8,
    pub epoch_id: u64,
    pub status: EpochStatus,
    /// Set when cancelling; informational.
    pub cancel_reason: CancelReason,
    pub timing: MarketTiming,
    /// Checkpoint A (lock); required publish time ≥ `lock_at` for Direction (`validate_checkpoint_a_publish_time`).
    pub checkpoint_a: OracleCheckpoint,
    /// Checkpoint B (resolve); publish time ≥ `resolve_at` and ≥ A if A written (`validate_checkpoint_b_publish_time`).
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
    /// Bitmask of winning outcome indices after resolve; used for pool sums and claims.
    pub winning_outcome_mask: u64,
    pub total_pool: u64,
    pub outcome_pools: [u64; MAX_OUTCOMES],
    pub switch_fee_total: u64,
    pub settlement_fee_total: u64,
    /// Total SPL owed to claimants after resolve (matches claims reserve movement).
    pub claim_liability_total: u64,
    pub total_refund_liability: u64,
    pub claimed_total: u64,
    /// Tracks unclaimed winning stake for pro-rata dust handling on last claim.
    pub remaining_winning_stake: u64,
    /// True when epoch is void/cancel refund path; user gets [`crate::math::payout::compute_refund_total`].
    pub refund_mode: bool,
    /// After resolve/cancel, users may [`crate::instructions::market::claim`].
    pub claimable: bool,
    pub created_at: i64,
    pub locked_at: i64,
    pub resolved_at: i64,
    pub total_positions: u32,
    /// Snapshot from template at open. When `0`, lock/resolve use global [`crate::state::Config::oracle_config`].
    pub oracle_max_delay_seconds: i64,
    /// When `0`, use global `max_confidence_bps`.
    pub oracle_max_confidence_bps: u16,
    pub reserved: [u8; 6],
}

impl Epoch {
    pub const SEED: &'static [u8] = b"epoch";
    /// Hand-maintained because `#[derive(InitSpace)]` cannot handle `[i128; MAX_OUTCOMES - 1]`
    /// in Anchor 0.31.x. Value = sum of all fields (no discriminator). Includes per-epoch oracle policy snapshot.
    pub const INIT_SPACE: usize = 446;

    /// **Betting open:** `status == Open` and `open_at <= now < lock_at`.
    pub fn is_open(&self, now: i64) -> bool { self.status == EpochStatus::Open && now >= self.timing.open_at && now < self.timing.lock_at }
    /// **Lock allowed:** `status == Open` and `now >= lock_at`.
    pub fn is_lockable(&self, now: i64) -> bool { self.status == EpochStatus::Open && now >= self.timing.lock_at }
    /// **Resolve allowed:** `status == Locked` and `now >= resolve_at`.
    pub fn is_resolvable(&self, now: i64) -> bool { self.status == EpochStatus::Locked && now >= self.timing.resolve_at }
    /// Same as [`crate::state::MarketTemplate::requires_checkpoint_a_on_lock`] on the snapshot fields.
    pub fn requires_checkpoint_a_on_lock(&self) -> bool { matches!(self.market_type, MarketType::Direction) }

    /// Pyth publish time for checkpoint A must be ≥ `lock_at` (`flow.md` §2.1).
    pub fn validate_checkpoint_a_publish_time(&self, publish_time: i64) -> Result<()> {
        require!(publish_time >= self.timing.lock_at, MarketError::InvalidOraclePublishTime);
        Ok(())
    }
    /// Checkpoint B publish time ≥ `resolve_at`; if A was written, also ≥ A’s `publish_time`.
    pub fn validate_checkpoint_b_publish_time(&self, publish_time: i64) -> Result<()> {
        require!(publish_time >= self.timing.resolve_at, MarketError::InvalidOraclePublishTime);
        if self.checkpoint_a.written {
            require!(publish_time >= self.checkpoint_a.publish_time, MarketError::InvalidOraclePublishTime);
        }
        Ok(())
    }
    /// True when the epoch account can be safely closed and its rent reclaimed.
    ///
    /// - Empty epoch (`total_pool == 0`): nothing was deposited; trivially settled.
    /// - Resolved path: every winner has claimed when `remaining_winning_stake == 0`.
    /// - Refund/cancel/void path: every depositor has claimed their refund when
    ///   `claimed_total >= total_refund_liability`.
    pub fn is_fully_settled(&self) -> bool {
        if self.total_pool == 0 {
            return true;
        }
        if !self.claimable {
            return false;
        }
        if self.refund_mode {
            self.claimed_total >= self.total_refund_liability
        } else {
            self.remaining_winning_stake == 0
        }
    }

    /// Sum of `outcome_pools[i]` for indices set in `winning_outcome_mask`.
    pub fn winning_pool_total(&self) -> u64 {
        let mut sum = 0u64;
        for i in 0..self.outcome_count as usize {
            if (self.winning_outcome_mask & (1u64 << i)) != 0 {
                sum = sum.saturating_add(self.outcome_pools[i]);
            }
        }
        sum
    }

    /// Effective staleness window: template snapshot if non-zero, else global.
    pub fn effective_oracle_max_delay_seconds(&self, global: i64) -> i64 {
        if self.oracle_max_delay_seconds > 0 {
            self.oracle_max_delay_seconds
        } else {
            global
        }
    }

    /// Effective confidence ratio cap: template snapshot if non-zero, else global.
    pub fn effective_oracle_max_confidence_bps(&self, global: u16) -> u16 {
        if self.oracle_max_confidence_bps > 0 {
            self.oracle_max_confidence_bps
        } else {
            global
        }
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
            oracle_max_delay_seconds: 0,
            oracle_max_confidence_bps: 0,
            reserved: [0; 6],
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
    fn epoch_init_space_fits_in_legacy_budget() {
        assert!(Epoch::INIT_SPACE < 460);
    }

    #[test]
    fn epoch_serialized_len_within_init_space() {
        let mut e = epoch_with_timing(100, 200);
        e.oracle_max_delay_seconds = 86_400;
        e.oracle_max_confidence_bps = 500;
        let len = e.try_to_vec().expect("epoch serializes");
        assert!(
            len.len() <= Epoch::INIT_SPACE,
            "serialized len {} exceeds INIT_SPACE {}",
            len.len(),
            Epoch::INIT_SPACE
        );
    }

    #[test]
    fn effective_oracle_policy_falls_back_to_global() {
        let mut e = epoch_with_timing(100, 200);
        assert_eq!(e.effective_oracle_max_delay_seconds(300), 300);
        assert_eq!(e.effective_oracle_max_confidence_bps(100), 100);
        e.oracle_max_delay_seconds = 600;
        e.oracle_max_confidence_bps = 50;
        assert_eq!(e.effective_oracle_max_delay_seconds(300), 600);
        assert_eq!(e.effective_oracle_max_confidence_bps(100), 50);
    }
}
