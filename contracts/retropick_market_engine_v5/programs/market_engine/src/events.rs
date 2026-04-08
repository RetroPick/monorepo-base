use anchor_lang::prelude::*;

#[event] pub struct ConfigInitialized { pub admin: Pubkey, pub treasury: Pubkey, pub worker_authority: Pubkey }
#[event] pub struct TemplateUpserted { pub template: Pubkey, pub slug: String, pub market_type: u8, pub outcome_count: u8 }
#[event] pub struct MarketInitialized { pub template: Pubkey, pub ledger: Pubkey, pub active_vault: Pubkey, pub claims_vault: Pubkey, pub fee_vault: Pubkey }
#[event] pub struct EpochOpened { pub template: Pubkey, pub epoch: Pubkey, pub epoch_id: u64, pub open_at: i64, pub lock_at: i64, pub resolve_at: i64 }
#[event] pub struct PositionDeposited { pub epoch: Pubkey, pub user: Pubkey, pub outcome: u8, pub amount: u64 }
#[event] pub struct SideSwitched { pub epoch: Pubkey, pub user: Pubkey, pub from_outcome: u8, pub to_outcome: u8, pub gross_amount: u64, pub fee_amount: u64, pub net_amount: u64 }
#[event] pub struct EpochLocked { pub epoch: Pubkey, pub epoch_id: u64, pub checkpoint_a_value_e8: i128, pub publish_time: i64 }
#[event] pub struct EpochResolved { pub epoch: Pubkey, pub epoch_id: u64, pub winning_mask: u64, pub claim_liability_total: u64, pub settlement_fee_total: u64, pub refund_mode: bool }
#[event] pub struct EpochCancelled { pub epoch: Pubkey, pub epoch_id: u64, pub reason: u8 }
#[event] pub struct Claimed { pub epoch: Pubkey, pub user: Pubkey, pub amount: u64 }
#[event] pub struct FeesWithdrawn { pub template: Pubkey, pub amount: u64 }
