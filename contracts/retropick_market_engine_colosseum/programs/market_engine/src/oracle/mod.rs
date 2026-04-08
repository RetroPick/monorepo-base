//! Oracle adapters. Production path: Pyth Pull (`PriceUpdateV2`) via [`read_price_no_older_than`].
//!
//! Validation rules: `docs/current/flow.md` §3 (confidence, staleness).

pub mod pyth;

pub use pyth::*;
