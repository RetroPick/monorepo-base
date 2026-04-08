//! Layout and protocol-wide numeric constants (see also [`crate::state::Config`] / template caps).

/// Account schema / protocol version byte written to new state accounts.
pub const VERSION: u8 = 1;
/// Basis points divisor (100% = 10_000 bps) for fees and oracle confidence ratio.
pub const BPS_DENOMINATOR: u64 = 10_000;
/// Hard cap on outcomes per template/epoch; must match [`crate::state::Config::max_outcomes`] upper bound.
pub const MAX_OUTCOMES: usize = 8;
/// Max UTF-8 bytes for template slug (PDA seed component).
pub const TEMPLATE_SLUG_MAX_LEN: usize = 32;
/// Max UTF-8 bytes for human-readable asset symbol on template.
pub const ASSET_SYMBOL_MAX_LEN: usize = 16;
/// Reserved tail size on some accounts (forward compatibility).
pub const RESERVED_SMALL: usize = 32;
/// Reserved tail size on some accounts (forward compatibility).
pub const RESERVED_MEDIUM: usize = 64;
