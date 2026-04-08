use anchor_lang::prelude::*;
use crate::{constants::{MAX_OUTCOMES, VERSION}, errors::MarketError, events::TemplateUpserted, state::*};

#[derive(Accounts)]
#[instruction(params: UpsertTemplateParams)]
pub struct UpsertTemplate<'info> {
    #[account(mut)] pub payer: Signer<'info>,
    #[account(mut)] pub admin: Signer<'info>,
    #[account(seeds = [Config::SEED], bump = config.bump, constraint = config.admin == admin.key() @ MarketError::Unauthorized)]
    pub config: Account<'info, Config>,
    #[account(init_if_needed, payer = payer, space = 8 + MarketTemplate::INIT_SPACE, seeds = [MarketTemplate::SEED, params.slug.as_bytes()], bump)]
    pub template: Account<'info, MarketTemplate>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpsertTemplateParams {
    pub slug: String,
    pub asset_symbol: String,
    pub oracle_feed_id: [u8; 32],
    pub market_type: MarketType,
    pub condition: Condition,
    pub threshold_rule: ThresholdRule,
    pub active: bool,
    pub outcome_count: u8,
    pub absolute_threshold_value_e8: i128,
    pub range_bounds_e8: [i128; MAX_OUTCOMES - 1],
    pub switch_fee_bps: u16,
    pub settlement_fee_bps: u16,
    pub allow_multi_side_positions: bool,
}

pub fn handler(ctx: Context<UpsertTemplate>, params: UpsertTemplateParams) -> Result<()> {
    require!(params.switch_fee_bps <= ctx.accounts.config.max_switch_fee_bps, MarketError::InvalidFeeBps);
    require!(params.outcome_count <= ctx.accounts.config.max_outcomes, MarketError::TooManyOutcomes);
    let template = &mut ctx.accounts.template;
    template.validate_slug_update(&params.slug)?;
    if template.version == 0 { template.version = VERSION; template.bump = ctx.bumps.template; }
    template.slug = params.slug;
    template.asset_symbol = params.asset_symbol;
    template.oracle_feed_id = params.oracle_feed_id;
    template.market_type = params.market_type;
    template.condition = params.condition;
    template.threshold_rule = params.threshold_rule;
    template.active = params.active;
    template.outcome_count = params.outcome_count;
    template.absolute_threshold_value_e8 = params.absolute_threshold_value_e8;
    template.range_bounds_e8 = params.range_bounds_e8;
    template.switch_fee_bps = params.switch_fee_bps;
    template.settlement_fee_bps = params.settlement_fee_bps;
    template.equal_price_voids = true;
    template.fee_on_losing_pool = true;
    template.allow_multi_side_positions = params.allow_multi_side_positions;
    template.reserved = [0; 16];
    template.validate()?;
    emit!(TemplateUpserted { template: template.key(), slug: template.slug.clone(), market_type: template.market_type as u8, outcome_count: template.outcome_count });
    Ok(())
}
