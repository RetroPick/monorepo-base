use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Protocol paused")]
    ProtocolPaused,
    #[msg("Invalid template")]
    InvalidTemplate,
    #[msg("Template inactive")]
    TemplateInactive,
    #[msg("Too many outcomes")]
    TooManyOutcomes,
    #[msg("Invalid fee basis points")]
    InvalidFeeBps,
    #[msg("Invalid timing")]
    InvalidTiming,
    #[msg("Invalid epoch state")]
    InvalidEpochState,
    #[msg("Betting closed")]
    BettingClosed,
    #[msg("Too early to lock")]
    TooEarlyToLock,
    #[msg("Too early to resolve")]
    TooEarlyToResolve,
    #[msg("Epoch already resolved")]
    EpochAlreadyResolved,
    #[msg("Epoch already exists")]
    EpochAlreadyExists,
    #[msg("Previous epoch unresolved")]
    PreviousEpochUnresolved,
    #[msg("Epoch is not active")]
    EpochNotActive,
    #[msg("Invalid oracle feed")]
    InvalidOracleFeed,
    #[msg("Oracle stale")]
    OracleStale,
    #[msg("Oracle confidence too wide")]
    OracleConfidenceTooWide,
    #[msg("Invalid oracle price")]
    InvalidOraclePrice,
    #[msg("Invalid oracle publish time")]
    InvalidOraclePublishTime,
    #[msg("Checkpoint already written")]
    CheckpointAlreadyWritten,
    #[msg("No winning outcome")]
    NoWinningOutcome,
    #[msg("Invalid outcome")]
    InvalidOutcome,
    #[msg("Single-side positions only")]
    SingleSideViolation,
    #[msg("Partial switch not allowed in single-side mode")]
    PartialSwitchDisallowed,
    #[msg("Amount too small after fees")]
    AmountTooSmall,
    #[msg("Zero stake")]
    ZeroStake,
    #[msg("Insufficient source stake")]
    InsufficientSourceStake,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Claim not available")]
    ClaimNotAvailable,
    #[msg("Math overflow")]
    MathOverflow,
}
