use anchor_lang::prelude::*;

use crate::{
    constants::{ASSET_SYMBOL_MAX_LEN, MAX_OUTCOMES, TEMPLATE_SLUG_MAX_LEN},
    errors::MarketError,
    state::types::*,
};

#[account]
pub struct MarketTemplate {
    pub version: u8,
    pub bump: u8,

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
    pub equal_price_voids: bool,
    pub fee_on_losing_pool: bool,
    pub allow_multi_side_positions: bool,
    pub reserved: [u8; 16],
}

impl MarketTemplate {
    pub const SEED: &'static [u8] = b"template";
    pub const INIT_SPACE: usize = 272;

    pub fn validate_slug_update(&self, next_slug: &str) -> Result<()> {
        if self.version != 0 {
            require!(self.slug == next_slug, MarketError::InvalidTemplate);
        }
        Ok(())
    }

    pub fn validate(&self) -> Result<()> {
        require!(!self.slug.is_empty(), MarketError::InvalidTemplate);
        require!(self.slug.len() <= TEMPLATE_SLUG_MAX_LEN, MarketError::InvalidTemplate);
        require!(!self.asset_symbol.is_empty(), MarketError::InvalidTemplate);
        require!(self.asset_symbol.len() <= ASSET_SYMBOL_MAX_LEN, MarketError::InvalidTemplate);
        require!(self.outcome_count as usize <= MAX_OUTCOMES, MarketError::TooManyOutcomes);
        require!(self.switch_fee_bps <= 10_000, MarketError::InvalidFeeBps);
        require!(self.settlement_fee_bps <= 10_000, MarketError::InvalidFeeBps);
        require!(self.oracle_feed_id != [0u8; 32], MarketError::InvalidOracleFeed);

        match self.market_type {
            MarketType::Direction => {
                require!(self.outcome_count == 2, MarketError::InvalidTemplate);
                require!(self.threshold_rule == ThresholdRule::None, MarketError::InvalidTemplate);
                require!(self.equal_price_voids, MarketError::InvalidTemplate);
            }
            MarketType::Threshold => {
                require!(self.outcome_count == 2, MarketError::InvalidTemplate);
                require!(self.threshold_rule == ThresholdRule::Absolute, MarketError::InvalidTemplate);
            }
            MarketType::RangeClose => {
                require!(self.outcome_count >= 2, MarketError::InvalidTemplate);
                for i in 1..(self.outcome_count as usize - 1) {
                    require!(self.range_bounds_e8[i - 1] < self.range_bounds_e8[i], MarketError::InvalidTemplate);
                }
            }
        }
        Ok(())
    }

    pub fn requires_checkpoint_a_on_lock(&self) -> bool {
        matches!(self.market_type, MarketType::Direction)
    }

    pub fn requires_checkpoint_a_on_open(&self) -> bool {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_template() -> MarketTemplate {
        MarketTemplate {
            version: 1,
            bump: 1,
            slug: "s".repeat(TEMPLATE_SLUG_MAX_LEN),
            asset_symbol: "A".repeat(ASSET_SYMBOL_MAX_LEN),
            oracle_feed_id: [1; 32],
            market_type: MarketType::RangeClose,
            condition: Condition::AtOrAbove,
            threshold_rule: ThresholdRule::Absolute,
            active: true,
            outcome_count: MAX_OUTCOMES as u8,
            absolute_threshold_value_e8: 0,
            range_bounds_e8: [0; MAX_OUTCOMES - 1],
            switch_fee_bps: 100,
            settlement_fee_bps: 100,
            equal_price_voids: true,
            fee_on_losing_pool: true,
            allow_multi_side_positions: true,
            reserved: [0; 16],
        }
    }

    #[test]
    fn template_init_space_is_smaller_than_legacy_layout() {
        assert!(MarketTemplate::INIT_SPACE < 360);
    }

    #[test]
    fn template_init_space_covers_serialized_max_payload() {
        let serialized = sample_template()
            .try_to_vec()
            .expect("template should serialize");
        assert!(
            serialized.len() <= MarketTemplate::INIT_SPACE,
            "serialized template len {} exceeds init space {}",
            serialized.len(),
            MarketTemplate::INIT_SPACE
        );
    }

    #[test]
    fn template_slug_is_immutable_after_initialization() {
        let template = sample_template();
        assert!(template.validate_slug_update(&template.slug).is_ok());
        assert_eq!(
            template.validate_slug_update("different-slug").unwrap_err(),
            MarketError::InvalidTemplate.into()
        );
    }

    #[test]
    fn uninitialized_template_can_accept_initial_slug() {
        let mut template = sample_template();
        template.version = 0;
        assert!(template.validate_slug_update("fresh-slug").is_ok());
    }
}
