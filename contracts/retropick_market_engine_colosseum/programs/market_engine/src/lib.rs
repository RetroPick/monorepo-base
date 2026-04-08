#![allow(deprecated)]

//! Pooled prediction-style markets on Solana over a single stake SPL mint.
//!
//! **Program ID:** `DYx5zh2gM1QuSviJF4WvdcsiGNb4JSxyp2ZhbnqnUuwR` (see `declare_id!` below).
//!
//! Each **market** is keyed by a [`MarketTemplate`](crate::state::MarketTemplate) (oracle feed, market type, fees).
//! **Epochs** advance per template: users `deposit_to_side` while open, may `switch_side`, then
//! operators `lock_epoch` / `resolve_epoch` (or `cancel_epoch`) using Pyth checkpoints; winners
//! `claim` from the claims vault; protocol fees `withdraw_fees`.
//!
//! **Off-chain reference:** `docs/current/currentPrograms.md` (PDAs, instructions, roles) and
//! `docs/current/flow.md` (lifecycle, economics, oracle rules). Rolling epoch counters:
//! `docs/current/rollin-rounds.md`.
//!
//! ## Instruction groups
//!
//! - **Admin (singleton config & templates):** `initialize_config`, `upsert_template`,
//!   `initialize_market`, `pause_program`, `set_worker_authority`, `set_treasury`.
//! - **Market (per-template epochs & user flows):** `open_epoch`, `deposit_to_side`,
//!   `switch_side`, `lock_epoch`, `resolve_epoch`, `cancel_epoch`, `claim`,
//!   `withdraw_fees`.

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod math;
pub mod oracle;
pub mod resolvers;
pub mod state;

use instructions::*;

declare_id!("DYx5zh2gM1QuSviJF4WvdcsiGNb4JSxyp2ZhbnqnUuwR");

#[program]
pub mod market_engine {
    use super::*;

    /// Creates the global [`crate::state::Config`] PDA (one per deployment). **Signer:** `admin` from params.
    /// Sets stake mint, oracle bounds, fee caps; does not create markets. See `docs/current/currentPrograms.md` §3.
    pub fn initialize_config(ctx: Context<InitializeConfig>, params: InitializeConfigParams) -> Result<()> {
        instructions::admin::initialize::handler(ctx, params)
    }

    /// Creates or updates a [`crate::state::MarketTemplate`] by slug. **Signer:** `admin`. Enforces
    /// `max_outcomes` / `max_switch_fee_bps` from config. Slug immutable after first init with `version != 0`.
    pub fn upsert_template(ctx: Context<UpsertTemplate>, params: UpsertTemplateParams) -> Result<()> {
        instructions::admin::upsert_template::handler(ctx, params)
    }

    /// Allocates ledger + vault metas + token ATAs for a template that has never been initialized.
    /// **Signer:** `admin`. CPIs to create ATAs for active / claims / fee vaults. See `initialize_market` module docs.
    pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
        instructions::admin::initialize_market::handler(ctx)
    }

    /// Sets [`crate::state::Config::paused`]. When `true`, most user/operator paths return [`crate::errors::MarketError::ProtocolPaused`].
    /// **Signer:** `admin`. **`cancel_epoch` is not gated by pause** (operators can cancel while paused).
    pub fn pause_program(ctx: Context<PauseProgram>, paused: bool) -> Result<()> {
        instructions::admin::pause::handler(ctx, paused)
    }

    /// Updates [`crate::state::Config::worker_authority`]. **Signer:** `admin`.
    pub fn set_worker_authority(ctx: Context<SetWorkerAuthority>, worker_authority: Pubkey) -> Result<()> {
        instructions::admin::set_worker::handler(ctx, worker_authority)
    }

    /// Updates [`crate::state::Config::treasury`]. **Signer:** `admin`.
    pub fn set_treasury(ctx: Context<SetTreasury>, treasury: Pubkey) -> Result<()> {
        instructions::admin::set_treasury::handler(ctx, treasury)
    }

    /// Opens the next epoch for a template. **Signers:** `payer` + `authority` where `authority` is
    /// `admin` or `worker_authority`. Requires ledger counters per `rollin-rounds.md`. Reverts if protocol paused.
    pub fn open_epoch(ctx: Context<OpenEpoch>, epoch_id: u64, params: OpenEpochParams) -> Result<()> {
        instructions::market::open_epoch::handler(ctx, epoch_id, params)
    }

    /// User adds stake to an outcome while the epoch is open for betting. **Signer:** `user`. Reverts if paused.
    pub fn deposit_to_side(ctx: Context<DepositToSide>, outcome_index: u8, amount: u64) -> Result<()> {
        instructions::market::deposit_to_side::handler(ctx, outcome_index, amount)
    }

    /// Moves stake between outcomes (fees, single-side rules). **Signer:** `user`. Reverts if paused.
    pub fn switch_side(ctx: Context<SwitchSide>, from_outcome: u8, to_outcome: u8, gross_amount: u64) -> Result<()> {
        instructions::market::switch_side::handler(ctx, from_outcome, to_outcome, gross_amount)
    }

    /// Records checkpoint A from Pyth at lock (where required), sets epoch to `Locked`. **Signers:** `admin` + `worker`.
    /// Reverts if paused.
    pub fn lock_epoch(ctx: Context<LockEpoch>) -> Result<()> {
        instructions::market::lock_epoch::handler(ctx)
    }

    /// Consumes Pyth at resolve, runs resolver, moves collateral into claims/fee vaults, sets `claimable`.
    /// **Signers:** `admin` + `worker`. Reverts if paused.
    pub fn resolve_epoch(ctx: Context<ResolveEpoch>) -> Result<()> {
        instructions::market::resolve_epoch::handler(ctx)
    }

    /// Aborts the epoch and enables refunds or void path. **Signers:** `admin` + `worker`. **Does not check pause**
    /// (intentional). See `flow.md` cancel transitions.
    pub fn cancel_epoch(ctx: Context<CancelEpoch>, reason: state::CancelReason, voided: bool) -> Result<()> {
        instructions::market::cancel_epoch::handler(ctx, reason, voided)
    }

    /// Pays the user from the claims vault. **Does not check [`crate::state::Config::paused`]** — users can exit
    /// after settlement even when new deposits are frozen. **Signer:** `user`.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::market::claim::handler(ctx)
    }

    /// Moves fees from the template fee vault to treasury. **Signer:** `treasury` or `admin`. Does not check `paused` (see instruction module docs).
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        instructions::market::withdraw_fees::handler(ctx, amount)
    }

    /// Closes a fully-settled [`crate::state::Epoch`] PDA and returns its rent-exempt balance to
    /// `receiver`. **Signer:** `authority` ∈ {worker, admin}. Epoch must satisfy
    /// [`crate::state::Epoch::is_fully_settled`] — i.e. all winning claims or refunds have been
    /// processed. This is the primary rent-reclaim mechanism; at ~0.004051 SOL per epoch the
    /// savings compound quickly for high-frequency markets.
    pub fn close_epoch(ctx: Context<CloseEpoch>) -> Result<()> {
        instructions::market::close_epoch::handler(ctx)
    }
}
