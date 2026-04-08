use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MarketType {
    Direction,
    Threshold,
    RangeClose,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Condition {
    AtOrAbove,
    Below,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ThresholdRule {
    None,
    Absolute,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EpochStatus {
    Scheduled,
    Open,
    Locked,
    Resolved,
    Cancelled,
    Voided,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OracleKind {
    Pyth,
}

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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub struct OracleConfig {
    pub oracle_kind: OracleKind,
    pub max_delay_seconds: i64,
    pub max_confidence_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Default)]
pub struct OracleCheckpoint {
    pub value_e8: i128,
    pub publish_time: i64,
    pub confidence_e8: u64,
    pub written: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub struct MarketTiming {
    pub open_at: i64,
    pub lock_at: i64,
    pub resolve_at: i64,
}
