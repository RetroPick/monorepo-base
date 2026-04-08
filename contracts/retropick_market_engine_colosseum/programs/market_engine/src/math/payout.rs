//! Settlement fee, claim liability, and per-user payout math (`flow.md` §3–4).
//!
//! All divisions use integer truncation toward zero unless noted. **Examples below mirror** the `#[cfg(test)]` cases in this file.

use anchor_lang::prelude::*;
use crate::{constants::BPS_DENOMINATOR, errors::MarketError, state::{Epoch, Position}};

/// Settlement fee in token base units: `base * fee_bps / 10_000`.
///
/// - If `fee_on_losing_pool`: `base = losing_pool` (total − winning).
/// - Else: `base = total_pool`.
///
/// **Example (fee on losing pool):** `total_pool = 1000`, `losing_pool = 400`, `fee_bps = 500` (5%) → fee = `400 * 500 / 10000` = **20** (see `fee_on_losing_pool` test).
pub fn compute_settlement_fee(total_pool: u64, losing_pool: u64, fee_bps: u16, fee_on_losing_pool: bool) -> Result<u64> {
    let base = if fee_on_losing_pool { losing_pool } else { total_pool };
    Ok(base.checked_mul(fee_bps as u64).ok_or(MarketError::MathOverflow)? / BPS_DENOMINATOR)
}

/// Total SPL that must sit in the claims vault to cover winners: `winning_pool + (losing_pool - settlement_fee)`.
///
/// **Example:** `total_pool = 1000`, `winning_pool = 600`, `settlement_fee = 20` → losing = 400, distributable losing = 380 → liability = 600 + 380 = **980** (`claim_liability_balanced_binary` test).
pub fn compute_claim_liability(total_pool: u64, winning_pool: u64, settlement_fee: u64) -> Result<u64> {
    require!(winning_pool > 0, MarketError::NoWinningOutcome);
    let losing_pool = total_pool.checked_sub(winning_pool).ok_or(MarketError::MathOverflow)?;
    let distributable_losing_pool = losing_pool.checked_sub(settlement_fee).ok_or(MarketError::MathOverflow)?;
    winning_pool.checked_add(distributable_losing_pool).ok_or(MarketError::MathOverflow.into())
}

/// Pro-rata share of `distributable_losing_pool` for one user: `user_winning_stake * distributable_losing_pool / winning_pool`, plus principal `user_winning_stake`.
///
/// **Example:** `user_winning_stake = 60`, `winning_pool = 600`, `distributable_losing_pool = 380` → pro-rata = 38 → total **98** (`user_claim_balanced_binary` test).
pub fn compute_user_claim(user_winning_stake: u64, winning_pool: u64, distributable_losing_pool: u64) -> Result<u64> {
    require!(winning_pool > 0, MarketError::NoWinningOutcome);
    let pro_rata_share = (user_winning_stake as u128)
        .checked_mul(distributable_losing_pool as u128)
        .ok_or(MarketError::MathOverflow)?
        .checked_div(winning_pool as u128)
        .ok_or(MarketError::MathOverflow)? as u64;
    user_winning_stake.checked_add(pro_rata_share).ok_or(MarketError::MathOverflow.into())
}

/// Returns `(claim_liability_total, settlement_fee, distributable_losing_pool)` for a resolved pool snapshot.
pub fn compute_claim_liability_components(total_pool: u64, winning_pool: u64, fee_bps: u16, fee_on_losing_pool: bool) -> Result<(u64,u64,u64)> {
    require!(winning_pool > 0, MarketError::NoWinningOutcome);
    let losing_pool = total_pool.checked_sub(winning_pool).ok_or(MarketError::MathOverflow)?;
    let settlement_fee = compute_settlement_fee(total_pool, losing_pool, fee_bps, fee_on_losing_pool)?;
    let distributable_losing_pool = losing_pool.checked_sub(settlement_fee).ok_or(MarketError::MathOverflow)?;
    let claim_liability_total = winning_pool.checked_add(distributable_losing_pool).ok_or(MarketError::MathOverflow)?;
    Ok((claim_liability_total, settlement_fee, distributable_losing_pool))
}

/// Same as [`compute_claim_liability_components`] using [`Epoch::winning_pool_total`] for `winning_pool`.
pub fn compute_epoch_claim_liability(epoch: &Epoch, fee_bps: u16, fee_on_losing_pool: bool) -> Result<(u64,u64,u64)> {
    compute_claim_liability_components(epoch.total_pool, epoch.winning_pool_total(), fee_bps, fee_on_losing_pool)
}

/// Full entitlement for a user on a resolved epoch (no dust sweep). Returns `0` if the user has no stake on winning outcomes.
pub fn compute_total_user_entitlement_resolved(epoch: &Epoch, position: &Position, fee_bps: u16, fee_on_losing_pool: bool) -> Result<u64> {
    let user_winning_stake = position.total_winning_stake(epoch.winning_outcome_mask, epoch.outcome_count);
    if user_winning_stake == 0 { return Ok(0); }
    let winning_pool = epoch.winning_pool_total();
    let (_, _, distributable_losing_pool) = compute_claim_liability_components(epoch.total_pool, winning_pool, fee_bps, fee_on_losing_pool)?;
    let pro_rata_share = (user_winning_stake as u128).checked_mul(distributable_losing_pool as u128).ok_or(MarketError::MathOverflow)?.checked_div(winning_pool as u128).ok_or(MarketError::MathOverflow)? as u64;
    user_winning_stake.checked_add(pro_rata_share).ok_or(MarketError::MathOverflow.into())
}

/// Actual token payout and winning stake for `claim`. If this user is the **last** remaining winner (`remaining_winning_stake == user_winning_stake`), pays out **all** `claims_reserve_total` to clear rounding dust (`final_winner_claim_sweeps_remaining_dust` test).
pub fn compute_claim_payout(epoch: &Epoch, position: &Position, claims_reserve_total: u64) -> Result<(u64, u64)> {
    let user_winning_stake = position.total_winning_stake(epoch.winning_outcome_mask, epoch.outcome_count);
    if user_winning_stake == 0 {
        return Ok((0, 0));
    }

    let entitlement = compute_total_user_entitlement_resolved(
        epoch,
        position,
        epoch.settlement_fee_bps,
        epoch.fee_on_losing_pool,
    )?;

    let payout = if epoch.remaining_winning_stake == user_winning_stake {
        claims_reserve_total
    } else {
        entitlement
    };

    Ok((payout, user_winning_stake))
}

/// Refund path: user receives full `total_stake` (void/cancel).
pub fn compute_refund_total(position: &Position) -> Result<u64> { Ok(position.total_stake) }


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fee_on_losing_pool() {
        let fee = compute_settlement_fee(1_000, 400, 500, true).unwrap();
        assert_eq!(fee, 20);
    }

    #[test]
    fn claim_liability_balanced_binary() {
        let claims = compute_claim_liability(1_000, 600, 20).unwrap();
        assert_eq!(claims, 980);
    }

    #[test]
    fn user_claim_balanced_binary() {
        let claim = compute_user_claim(60, 600, 380).unwrap();
        assert_eq!(claim, 98);
    }

    #[test]
    fn final_winner_claim_sweeps_remaining_dust() {
        let epoch = Epoch {
            version: 1,
            bump: 1,
            epoch_id: 1,
            status: crate::state::EpochStatus::Resolved,
            cancel_reason: crate::state::CancelReason::None,
            timing: crate::state::MarketTiming { open_at: 0, lock_at: 1, resolve_at: 2 },
            checkpoint_a: crate::state::OracleCheckpoint::default(),
            checkpoint_b: crate::state::OracleCheckpoint::default(),
            oracle_feed_id: [0; 32],
            market_type: crate::state::MarketType::Direction,
            condition: crate::state::Condition::AtOrAbove,
            absolute_threshold_value_e8: 0,
            range_bounds_e8: [0; crate::constants::MAX_OUTCOMES - 1],
            switch_fee_bps: 0,
            settlement_fee_bps: 0,
            equal_price_voids: true,
            fee_on_losing_pool: true,
            allow_multi_side_positions: false,
            outcome_count: 2,
            winning_outcome_mask: 1,
            total_pool: 10,
            outcome_pools: [3, 7, 0, 0, 0, 0, 0, 0],
            switch_fee_total: 0,
            settlement_fee_total: 0,
            claim_liability_total: 10,
            total_refund_liability: 0,
            claimed_total: 0,
            remaining_winning_stake: 1,
            refund_mode: false,
            claimable: true,
            created_at: 0,
            locked_at: 0,
            resolved_at: 0,
            total_positions: 0,
            oracle_max_delay_seconds: 0,
            oracle_max_confidence_bps: 0,
            reserved: [0; 6],
        };
        let position = Position {
            version: 1,
            bump: 1,
            stakes: [1, 0, 0, 0, 0, 0, 0, 0],
            total_stake: 1,
            switch_fees_paid: 0,
            entry_fees_paid: 0,
            claimed_amount: 0,
            claimed: false,
            reserved: [0; 16],
        };

        let (payout, winning_stake) = compute_claim_payout(&epoch, &position, 4).unwrap();
        assert_eq!(winning_stake, 1);
        assert_eq!(payout, 4);
    }
}
