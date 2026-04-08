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

    pub fn initialize_config(ctx: Context<InitializeConfig>, params: InitializeConfigParams) -> Result<()> {
        instructions::admin::initialize::handler(ctx, params)
    }

    pub fn upsert_template(ctx: Context<UpsertTemplate>, params: UpsertTemplateParams) -> Result<()> {
        instructions::admin::upsert_template::handler(ctx, params)
    }

    pub fn initialize_market(ctx: Context<InitializeMarket>) -> Result<()> {
        instructions::admin::initialize_market::handler(ctx)
    }

    pub fn pause_program(ctx: Context<PauseProgram>, paused: bool) -> Result<()> {
        instructions::admin::pause::handler(ctx, paused)
    }

    pub fn set_worker_authority(ctx: Context<SetWorkerAuthority>, worker_authority: Pubkey) -> Result<()> {
        instructions::admin::set_worker::handler(ctx, worker_authority)
    }

    pub fn set_treasury(ctx: Context<SetTreasury>, treasury: Pubkey) -> Result<()> {
        instructions::admin::set_treasury::handler(ctx, treasury)
    }

    pub fn open_epoch(ctx: Context<OpenEpoch>, epoch_id: u64, params: OpenEpochParams) -> Result<()> {
        instructions::market::open_epoch::handler(ctx, epoch_id, params)
    }

    pub fn deposit_to_side(ctx: Context<DepositToSide>, outcome_index: u8, amount: u64) -> Result<()> {
        instructions::market::deposit_to_side::handler(ctx, outcome_index, amount)
    }

    pub fn switch_side(ctx: Context<SwitchSide>, from_outcome: u8, to_outcome: u8, gross_amount: u64) -> Result<()> {
        instructions::market::switch_side::handler(ctx, from_outcome, to_outcome, gross_amount)
    }

    pub fn lock_epoch(ctx: Context<LockEpoch>) -> Result<()> {
        instructions::market::lock_epoch::handler(ctx)
    }

    pub fn resolve_epoch(ctx: Context<ResolveEpoch>) -> Result<()> {
        instructions::market::resolve_epoch::handler(ctx)
    }

    pub fn cancel_epoch(ctx: Context<CancelEpoch>, reason: state::CancelReason, voided: bool) -> Result<()> {
        instructions::market::cancel_epoch::handler(ctx, reason, voided)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::market::claim::handler(ctx)
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        instructions::market::withdraw_fees::handler(ctx, amount)
    }
}
