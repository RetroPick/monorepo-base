use market_engine::{
    errors::MarketError,
    math::{compute_claim_payout, compute_switch, compute_total_user_entitlement_resolved, reserve_switch_fee_from_active},
    state::{CancelReason, Condition, Epoch, EpochStatus, MarketLedger, MarketTemplate, MarketTiming, MarketType, OracleCheckpoint, Position, ThresholdRule},
};

fn sample_ledger(active_epoch_id: u64, last_resolved_epoch_id: u64) -> MarketLedger {
    MarketLedger {
        version: 1,
        bump: 1,
        active_epoch_id,
        last_resolved_epoch_id,
        active_collateral_total: 1_000,
        claims_reserve_total: 0,
        fee_reserve_total: 0,
        insurance_reserve_total: 0,
        reserved: [0; 32],
    }
}

fn sample_epoch(open_at: i64, lock_at: i64) -> Epoch {
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
        range_bounds_e8: [0; 7],
        switch_fee_bps: 0,
        settlement_fee_bps: 500,
        equal_price_voids: true,
        fee_on_losing_pool: true,
        allow_multi_side_positions: false,
        outcome_count: 2,
        winning_outcome_mask: 0,
        total_pool: 0,
        outcome_pools: [0; 8],
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
fn pre_open_epoch_rejects_trading_window() {
    let epoch = sample_epoch(100, 200);
    assert!(!epoch.is_open(99));
    assert!(epoch.is_open(100));
}

#[test]
fn unresolved_epoch_blocks_opening_the_next_epoch() {
    let ledger = sample_ledger(2, 1);
    assert!(ledger.require_can_open_next_epoch(3).is_err());
}

#[test]
fn stale_epoch_is_not_treated_as_active() {
    let ledger = sample_ledger(2, 2);
    assert!(ledger.require_active_epoch(1).is_err());
    assert!(ledger.require_active_epoch(2).is_ok());
}

#[test]
fn switch_fee_reserve_reduces_active_collateral() {
    let mut ledger = sample_ledger(1, 1);
    reserve_switch_fee_from_active(&mut ledger, 25).unwrap();
    assert_eq!(ledger.active_collateral_total, 975);
    assert_eq!(ledger.fee_reserve_total, 25);
}

#[test]
fn claim_math_uses_epoch_snapshot_not_live_template_values() {
    let mut epoch = sample_epoch(100, 200);
    epoch.status = EpochStatus::Resolved;
    epoch.winning_outcome_mask = 1;
    epoch.total_pool = 1_000;
    epoch.outcome_pools[0] = 600;
    epoch.outcome_pools[1] = 400;
    epoch.settlement_fee_bps = 500;
    epoch.fee_on_losing_pool = true;

    let position = Position {
        version: 1,
        bump: 1,
        stakes: [60, 0, 0, 0, 0, 0, 0, 0],
        total_stake: 60,
        switch_fees_paid: 0,
        entry_fees_paid: 0,
        claimed_amount: 0,
        claimed: false,
        reserved: [0; 16],
    };

    let claim = compute_total_user_entitlement_resolved(
        &epoch,
        &position,
        epoch.settlement_fee_bps,
        epoch.fee_on_losing_pool,
    )
    .unwrap();
    assert_eq!(claim, 98);
}

#[test]
fn checkpoint_publish_time_must_respect_epoch_boundaries() {
    let mut epoch = sample_epoch(100, 200);
    assert_eq!(
        epoch.validate_checkpoint_a_publish_time(199).unwrap_err(),
        MarketError::InvalidOraclePublishTime.into()
    );

    epoch.checkpoint_a = OracleCheckpoint {
        value_e8: 100,
        publish_time: 205,
        confidence_e8: 0,
        written: true,
    };
    assert_eq!(
        epoch.validate_checkpoint_b_publish_time(205).unwrap_err(),
        MarketError::InvalidOraclePublishTime.into()
    );
}

#[test]
fn single_side_mode_only_allows_full_flip() {
    let position = Position {
        version: 1,
        bump: 1,
        stakes: [100, 0, 0, 0, 0, 0, 0, 0],
        total_stake: 100,
        switch_fees_paid: 0,
        entry_fees_paid: 0,
        claimed_amount: 0,
        claimed: false,
        reserved: [0; 16],
    };

    assert!(position.is_single_sided_on(0, 2));
    assert!(!position.can_deposit_to_outcome(1, 2, false));
}

#[test]
fn single_side_mode_detects_invalid_split_position() {
    let position = Position {
        version: 1,
        bump: 1,
        stakes: [60, 39, 0, 0, 0, 0, 0, 0],
        total_stake: 99,
        switch_fees_paid: 1,
        entry_fees_paid: 0,
        claimed_amount: 0,
        claimed: false,
        reserved: [0; 16],
    };

    assert!(!position.is_single_sided_on(0, 2));
    assert!(!position.is_single_sided_on(1, 2));
}

#[test]
fn switch_fee_bypass_by_splitting_is_closed() {
    let aggregate_fee = compute_switch(19_900, 1).unwrap().1;
    let split_fee = (0..100)
        .map(|_| compute_switch(199, 1).unwrap().1)
        .sum::<u64>();

    assert!(split_fee >= aggregate_fee);
}

#[test]
fn initialized_template_cannot_change_slug_and_break_pda_relationship() {
    let template = MarketTemplate {
        version: 1,
        bump: 1,
        slug: "btc-5m".to_string(),
        asset_symbol: "BTC".to_string(),
        oracle_feed_id: [1; 32],
        market_type: MarketType::Direction,
        condition: Condition::AtOrAbove,
        threshold_rule: ThresholdRule::None,
        active: true,
        outcome_count: 2,
        absolute_threshold_value_e8: 0,
        range_bounds_e8: [0; 7],
        switch_fee_bps: 100,
        settlement_fee_bps: 100,
        equal_price_voids: true,
        fee_on_losing_pool: true,
        allow_multi_side_positions: false,
        reserved: [0; 16],
    };

    assert_eq!(
        template
            .validate_slug_update("btc-15m")
            .unwrap_err(),
        MarketError::InvalidTemplate.into()
    );
}

#[test]
fn epoch_snapshot_drives_oracle_and_checkpoint_behavior_not_live_template() {
    let mut epoch = sample_epoch(100, 200);
    epoch.market_type = MarketType::Direction;
    epoch.oracle_feed_id = [7; 32];

    let mut template = MarketTemplate {
        version: 1,
        bump: 1,
        slug: "btc-5m".to_string(),
        asset_symbol: "BTC".to_string(),
        oracle_feed_id: [9; 32],
        market_type: MarketType::Threshold,
        condition: Condition::AtOrAbove,
        threshold_rule: ThresholdRule::Absolute,
        active: true,
        outcome_count: 2,
        absolute_threshold_value_e8: 0,
        range_bounds_e8: [0; 7],
        switch_fee_bps: 100,
        settlement_fee_bps: 100,
        equal_price_voids: true,
        fee_on_losing_pool: true,
        allow_multi_side_positions: false,
        reserved: [0; 16],
    };

    assert!(epoch.requires_checkpoint_a_on_lock());
    assert_ne!(epoch.oracle_feed_id, template.oracle_feed_id);

    template.market_type = MarketType::RangeClose;
    template.oracle_feed_id = [3; 32];

    assert!(epoch.requires_checkpoint_a_on_lock());
    assert_eq!(epoch.oracle_feed_id, [7; 32]);
}

#[test]
fn live_template_activity_should_not_gate_trading_for_open_epoch() {
    let epoch = sample_epoch(100, 200);
    assert!(epoch.is_open(150));

    let template = MarketTemplate {
        version: 1,
        bump: 1,
        slug: "btc-5m".to_string(),
        asset_symbol: "BTC".to_string(),
        oracle_feed_id: [1; 32],
        market_type: MarketType::Direction,
        condition: Condition::AtOrAbove,
        threshold_rule: ThresholdRule::None,
        active: false,
        outcome_count: 2,
        absolute_threshold_value_e8: 0,
        range_bounds_e8: [0; 7],
        switch_fee_bps: 100,
        settlement_fee_bps: 100,
        equal_price_voids: true,
        fee_on_losing_pool: true,
        allow_multi_side_positions: false,
        reserved: [0; 16],
    };

    assert!(!template.active);
    assert!(epoch.is_open(150));
}

#[test]
fn final_winner_can_sweep_rounding_dust_from_claims_reserve() {
    let mut epoch = sample_epoch(100, 200);
    epoch.status = EpochStatus::Resolved;
    epoch.winning_outcome_mask = 1;
    epoch.total_pool = 10;
    epoch.outcome_pools[0] = 3;
    epoch.outcome_pools[1] = 7;
    epoch.claimable = true;
    epoch.remaining_winning_stake = 1;

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
