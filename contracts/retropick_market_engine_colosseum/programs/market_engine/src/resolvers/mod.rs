//! Market-type outcome resolution from [`crate::state::MarketType`] and oracle checkpoints (A/B per `flow.md` §2).
//!
//! Submodules: [`direction`], [`threshold`], [`range_close`].
//!
//! **Extension point:** a future discrete/categorical [`crate::state::MarketType`] would add a submodule and a branch
//! in [`crate::instructions::market::resolve_epoch`], keeping all settlement accounting unchanged.

pub mod direction;
pub mod range_close;
pub mod threshold;

pub use direction::*;
pub use range_close::*;
pub use threshold::*;
