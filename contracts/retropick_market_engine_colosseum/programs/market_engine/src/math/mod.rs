//! Pure settlement math: fees, claim liability, switching, and ledger reserve updates. Used by [`crate::instructions::market`] and resolvers.
//!
//! Formulas and examples align with `docs/current/flow.md` §3–4.

pub mod payout;
pub mod reserves;
pub mod switching;

pub use payout::*;
pub use reserves::*;
pub use switching::*;
