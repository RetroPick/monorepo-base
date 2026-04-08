//! User and operator flows per template/epoch: open/deposit/switch/lock/resolve/cancel, claim, fee withdrawal.
//!
//! Timing and economics: `docs/current/flow.md`. Pause behavior: most instructions check `Config::paused` in the accounts;
//! `cancel_epoch` and `claim` are exceptions (see each handler module).

pub mod claim;
pub mod cancel_epoch;
pub mod close_epoch;
pub mod deposit_to_side;
pub mod lock_epoch;
pub mod open_epoch;
pub mod resolve_epoch;
pub mod switch_side;
pub mod withdraw_fees;

pub use claim::*;
pub use cancel_epoch::*;
pub use close_epoch::*;
pub use deposit_to_side::*;
pub use lock_epoch::*;
pub use open_epoch::*;
pub use resolve_epoch::*;
pub use switch_side::*;
pub use withdraw_fees::*;
