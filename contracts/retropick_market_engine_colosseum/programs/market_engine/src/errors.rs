use anchor_lang::prelude::*;

/// Anchor error codes for the program. Typical emitters are noted for navigation.
#[error_code]
pub enum MarketError {
    /// Wrong signer or token owner.
    #[msg("Unauthorized")]
    Unauthorized,
    /// Default or invalid authority pubkey on update.
    #[msg("Invalid authority")]
    InvalidAuthority,
    /// [`crate::state::Config::paused`] and instruction requires live protocol.
    #[msg("Protocol paused")]
    ProtocolPaused,
    /// Mint/slug/template mismatch or bad market init.
    #[msg("Invalid template")]
    InvalidTemplate,
    /// Template `active == false` where required.
    #[msg("Template inactive")]
    TemplateInactive,
    /// Exceeds template/config outcome cap.
    #[msg("Too many outcomes")]
    TooManyOutcomes,
    /// Fee bps > 10_000 or over cap.
    #[msg("Invalid fee basis points")]
    InvalidFeeBps,
    /// Epoch timing or oracle window invalid.
    #[msg("Invalid timing")]
    InvalidTiming,
    /// Wrong `EpochStatus` for operation.
    #[msg("Invalid epoch state")]
    InvalidEpochState,
    /// Not in the betting-open window ([`crate::state::Epoch::is_open`]).
    #[msg("Betting closed")]
    BettingClosed,
    /// Before `lock_at` on lock.
    #[msg("Too early to lock")]
    TooEarlyToLock,
    /// Before `resolve_at` on resolve.
    #[msg("Too early to resolve")]
    TooEarlyToResolve,
    /// Terminal epoch reused.
    #[msg("Epoch already resolved")]
    EpochAlreadyResolved,
    /// `open_epoch` id not next in sequence.
    #[msg("Epoch already exists")]
    EpochAlreadyExists,
    /// `active_epoch_id != last_resolved_epoch_id` when opening next.
    #[msg("Previous epoch unresolved")]
    PreviousEpochUnresolved,
    /// Deposits/switch target wrong epoch.
    #[msg("Epoch is not active")]
    EpochNotActive,
    /// Feed id mismatch or unsupported kind.
    #[msg("Invalid oracle feed")]
    InvalidOracleFeed,
    /// Pyth price older than policy.
    #[msg("Oracle stale")]
    OracleStale,
    /// Confidence wider than `max_confidence_bps` vs price (`flow.md` §3).
    #[msg("Oracle confidence too wide")]
    OracleConfidenceTooWide,
    /// Bad exponent or normalization.
    #[msg("Invalid oracle price")]
    InvalidOraclePrice,
    /// Publish time vs lock/resolve rules.
    #[msg("Invalid oracle publish time")]
    InvalidOraclePublishTime,
    /// Second write to same checkpoint.
    #[msg("Checkpoint already written")]
    CheckpointAlreadyWritten,
    /// Resolver or claim math: no winning stake.
    #[msg("No winning outcome")]
    NoWinningOutcome,
    /// Outcome index out of range or bad switch.
    #[msg("Invalid outcome")]
    InvalidOutcome,
    /// Multi-outcome stake when disallowed.
    #[msg("Single-side positions only")]
    SingleSideViolation,
    /// Partial move in single-side mode.
    #[msg("Partial switch not allowed in single-side mode")]
    PartialSwitchDisallowed,
    /// Switch fee ate entire gross.
    #[msg("Amount too small after fees")]
    AmountTooSmall,
    /// Zero deposit/switch amount.
    #[msg("Zero stake")]
    ZeroStake,
    /// Switch `gross` larger than source stake.
    #[msg("Insufficient source stake")]
    InsufficientSourceStake,
    /// Claim payout computed as zero.
    #[msg("Nothing to claim")]
    NothingToClaim,
    /// Second claim on same position.
    #[msg("Already claimed")]
    AlreadyClaimed,
    /// Epoch not yet claimable.
    #[msg("Claim not available")]
    ClaimNotAvailable,
    /// Any checked arithmetic failure.
    #[msg("Math overflow")]
    MathOverflow,
    /// Epoch still has outstanding claims or refunds; cannot close yet.
    #[msg("Epoch not fully settled")]
    EpochNotSettled,
}
