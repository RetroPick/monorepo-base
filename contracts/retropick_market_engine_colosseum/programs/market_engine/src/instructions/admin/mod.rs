//! Admin-only flows: global [`crate::state::Config`], [`crate::state::MarketTemplate`] upsert, per-template vault bootstrap, pause, treasury/worker keys.
//!
//! See `docs/current/currentPrograms.md` (roles §3, authority matrix) and instruction tables.

pub mod initialize;
pub mod initialize_market;
pub mod pause;
pub mod set_treasury;
pub mod set_worker;
pub mod upsert_template;

pub use initialize::*;
pub use initialize_market::*;
pub use pause::*;
pub use set_treasury::*;
pub use set_worker::*;
pub use upsert_template::*;
