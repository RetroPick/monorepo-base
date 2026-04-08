use anchor_lang::prelude::*;

/// Emitted once from [`crate::instructions::admin::initialize`].
#[event] pub struct ConfigInitialized { pub admin: Pubkey, pub treasury: Pubkey, pub worker_authority: Pubkey }
/// Emitted from [`crate::instructions::admin::upsert_template`].
#[event] pub struct TemplateUpserted { pub template: Pubkey, pub slug: String, pub market_type: u8, pub outcome_count: u8 }
/// Emitted from [`crate::instructions::admin::initialize_market`].
#[event] pub struct MarketInitialized { pub template: Pubkey, pub ledger: Pubkey, pub active_vault: Pubkey, pub claims_vault: Pubkey, pub fee_vault: Pubkey }
/// Emitted from [`crate::instructions::market::open_epoch`].
#[event] pub struct EpochOpened { pub template: Pubkey, pub epoch: Pubkey, pub epoch_id: u64, pub open_at: i64, pub lock_at: i64, pub resolve_at: i64 }
/// Emitted from [`crate::instructions::market::deposit_to_side`].
#[event] pub struct PositionDeposited { pub epoch: Pubkey, pub user: Pubkey, pub outcome: u8, pub amount: u64 }
/// Emitted from [`crate::instructions::market::switch_side`].
#[event] pub struct SideSwitched { pub epoch: Pubkey, pub user: Pubkey, pub from_outcome: u8, pub to_outcome: u8, pub gross_amount: u64, pub fee_amount: u64, pub net_amount: u64 }
/// Emitted from [`crate::instructions::market::lock_epoch`].
#[event] pub struct EpochLocked { pub epoch: Pubkey, pub epoch_id: u64, pub checkpoint_a_value_e8: i128, pub publish_time: i64 }
/// Emitted from [`crate::instructions::market::resolve_epoch`].
#[event] pub struct EpochResolved { pub epoch: Pubkey, pub epoch_id: u64, pub winning_mask: u64, pub claim_liability_total: u64, pub settlement_fee_total: u64, pub refund_mode: bool }
/// Emitted from [`crate::instructions::market::cancel_epoch`].
#[event] pub struct EpochCancelled { pub epoch: Pubkey, pub epoch_id: u64, pub reason: u8 }
/// Emitted from [`crate::instructions::market::claim`].
#[event] pub struct Claimed { pub epoch: Pubkey, pub user: Pubkey, pub amount: u64 }
/// Emitted from [`crate::instructions::market::withdraw_fees`].
#[event] pub struct FeesWithdrawn { pub template: Pubkey, pub amount: u64 }
/// Emitted from [`crate::instructions::market::close_epoch`].
#[event] pub struct EpochClosed { pub template: Pubkey, pub epoch_id: u64, pub receiver: Pubkey }
