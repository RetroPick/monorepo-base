//! [`MarketTemplate`] account: per-slug market definition copied into each [`super::Epoch`] at open.

use anchor_lang::prelude::*;

use crate::{
    constants::{ASSET_SYMBOL_MAX_LEN, MAX_OUTCOMES, TEMPLATE_SLUG_MAX_LEN},
    errors::MarketError,
    state::types::*,
};

/// Template metadata and economics for a market line. **PDA seeds:** [`MarketTemplate::SEED`], `slug.as_bytes()` (max [`crate::constants::TEMPLATE_SLUG_MAX_LEN`]).
///
/// Immutable slug after first init when `version != 0`. See `currentPrograms.md` §4.
#[account]
pub struct MarketTemplate {
    pub version: u8,
    pub bump: u8,

    /// Short identifier; must match between upserts once `version != 0`.
    pub slug: String,

    pub asset_symbol: String,

    /// Pyth feed id (32 bytes) for this template.
    pub oracle_feed_id: [u8; 32],
    pub market_type: MarketType,
    pub condition: Condition,
    pub threshold_rule: ThresholdRule,
    /// When false, user-facing ops should treat the template as disabled.
    pub active: bool,
    pub outcome_count: u8,
    pub absolute_threshold_value_e8: i128,
    /// Sorted bounds for [`MarketType::RangeClose`]; see [`MarketTemplate::validate`].
    pub range_bounds_e8: [i128; MAX_OUTCOMES - 1],
    /// Capped by [`crate::state::Config::max_switch_fee_bps`] at upsert.
    pub switch_fee_bps: u16,
    /// Copied to the epoch at [`crate::instructions::market::open_epoch`]; used for settlement math.
    pub settlement_fee_bps: u16,
    /// Direction markets require `true` (validation).
    pub equal_price_voids: bool,
    /// If true, settlement fee is taken from losing pool only; else from total pool (`flow.md`).
    pub fee_on_losing_pool: bool,
    /// If false, user may only hold stake on one outcome at a time (single-side mode).
    pub allow_multi_side_positions: bool,
    /// When `0`, epochs use global [`crate::state::Config::oracle_config`] `max_delay_seconds`. Else overrides for this template (copied to each [`super::Epoch`]).
    pub oracle_max_delay_seconds: i64,
    /// When `0`, use global `max_confidence_bps`.
    pub oracle_max_confidence_bps: u16,
    pub reserved: [u8; 6],
}

impl MarketTemplate {
    pub const SEED: &'static [u8] = b"template";
    /// Space allocated for `init` / `realloc`; must cover max serialized size (see unit tests below).
    pub const INIT_SPACE: usize = 272;

    /// Ensures slug cannot change after the template is initialized (`version != 0`).
    pub fn validate_slug_update(&self, next_slug: &str) -> Result<()> {
        if self.version != 0 {
            require!(self.slug == next_slug, MarketError::InvalidTemplate);
        }
        Ok(())
    }

    /// Invariants on strings, fees, feed id, and per-[`MarketType`] layout.
    pub fn validate(&self) -> Result<()> {
        require!(!self.slug.is_empty(), MarketError::InvalidTemplate);
        require!(self.slug.len() <= TEMPLATE_SLUG_MAX_LEN, MarketError::InvalidTemplate);
        require!(!self.asset_symbol.is_empty(), MarketError::InvalidTemplate);
        require!(self.asset_symbol.len() <= ASSET_SYMBOL_MAX_LEN, MarketError::InvalidTemplate);
        require!(self.outcome_count as usize <= MAX_OUTCOMES, MarketError::TooManyOutcomes);
        require!(self.switch_fee_bps <= 10_000, MarketError::InvalidFeeBps);
        require!(self.settlement_fee_bps <= 10_000, MarketError::InvalidFeeBps);
        require!(self.oracle_feed_id != [0u8; 32], MarketError::InvalidOracleFeed);
        require!(self.oracle_max_delay_seconds >= 0, MarketError::InvalidTiming);
        if self.oracle_max_confidence_bps > 0 {
            require!(self.oracle_max_confidence_bps <= 10_000, MarketError::InvalidFeeBps);
        }

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

    /// **Direction** markets write checkpoint A at [`crate::instructions::market::lock_epoch`]; threshold/range-close do not (`flow.md` §2.2).
    pub fn requires_checkpoint_a_on_lock(&self) -> bool {
        matches!(self.market_type, MarketType::Direction)
    }

    /// Reserved for a future open-time oracle snapshot; always `false` today.
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
            oracle_max_delay_seconds: 0,
            oracle_max_confidence_bps: 0,
            reserved: [0; 6],
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
