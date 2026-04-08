use anchor_lang::prelude::*;

/// High-level market family. Drives resolver selection and whether checkpoint A is taken at lock (`flow.md` §2).
///
/// **Future (not implemented):** discrete macro or categorical outcomes (e.g. Fed hike/hold/cut without a single
/// numeric Pyth field) would need a new variant, template payload (bands or outcome→level mapping), a resolver in
/// [`crate::resolvers`], and a versioned account migration—see `docs/expansion/MarketType.md`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MarketType {
    /// Two outcomes; compares Pyth checkpoint A vs B at lock/resolve.
    Direction,
    /// Two outcomes; threshold against checkpoint B.
    Threshold,
    /// Multiple ordered buckets; price at B falls into a range segment.
    RangeClose,
}

/// Semantic comparison for threshold-style resolution.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Condition {
    AtOrAbove,
    Below,
}

/// How absolute thresholding applies (direction vs threshold templates).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ThresholdRule {
    None,
    Absolute,
}

/// Per-epoch lifecycle. **`Scheduled` exists in the enum but `open_epoch` always sets `Open`**—no instruction sets `Scheduled` today (`currentPrograms.md` §3.1).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EpochStatus {
    Scheduled,
    Open,
    Locked,
    Resolved,
    Cancelled,
    Voided,
}

/// Only Pyth Pull is accepted in [`crate::state::Config::validate`].
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OracleKind {
    Pyth,
}

/// Recorded on cancel for analytics / client display.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CancelReason {
    None,
    OracleUnavailable,
    OracleStale,
    InvalidTemplate,
    InvalidTiming,
    EmergencyPaused,
    ManualAdminCancel,
}

/// Global oracle policy: kind, max price age (`max_delay_seconds`), and confidence ratio (`max_confidence_bps` vs `flow.md` §3).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub struct OracleConfig {
    pub oracle_kind: OracleKind,
    pub max_delay_seconds: i64,
    pub max_confidence_bps: u16,
}

/// Single Pyth sample: fixed-point `value_e8`, `publish_time`, optional `confidence_e8`, and `written` flag.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Default)]
pub struct OracleCheckpoint {
    pub value_e8: i128,
    pub publish_time: i64,
    pub confidence_e8: u64,
    pub written: bool,
}

/// Unix timestamps for `open_at` / `lock_at` / `resolve_at` (`flow.md` §1).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub struct MarketTiming {
    pub open_at: i64,
    pub lock_at: i64,
    pub resolve_at: i64,
}
