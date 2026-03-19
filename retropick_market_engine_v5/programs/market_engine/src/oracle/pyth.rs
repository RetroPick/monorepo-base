use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::{errors::MarketError, state::OracleCheckpoint};

#[derive(Debug, Clone, Copy)]
pub struct NormalizedPrice {
    pub value_e8: i128,
    pub publish_time: i64,
    pub confidence_e8: u64,
}

pub fn read_price_no_older_than(
    price_update: &Account<PriceUpdateV2>,
    expected_feed_id: &[u8; 32],
    max_delay_seconds: i64,
    now_ts: i64,
) -> Result<NormalizedPrice> {
    require!(max_delay_seconds >= 0, MarketError::InvalidTiming);
    let clock = Clock {
        slot: 0,
        epoch_start_timestamp: 0,
        epoch: 0,
        leader_schedule_epoch: 0,
        unix_timestamp: now_ts,
    };
    let price = price_update
        .get_price_no_older_than(&clock, max_delay_seconds as u64, expected_feed_id)
        .map_err(|_| MarketError::OracleStale)?;

    require!(price.exponent <= 0, MarketError::InvalidOraclePrice);

    let mut value = price.price as i128;
    let mut conf = price.conf as u128;
    let exponent = (-price.exponent) as u32;

    if exponent < 8 {
        let mul = 10i128.pow(8 - exponent);
        value = value.checked_mul(mul).ok_or(MarketError::MathOverflow)?;
        conf = conf.checked_mul(10u128.pow(8 - exponent)).ok_or(MarketError::MathOverflow)?;
    } else if exponent > 8 {
        let div = 10i128.pow(exponent - 8);
        value = value.checked_div(div).ok_or(MarketError::MathOverflow)?;
        conf = conf.checked_div(10u128.pow(exponent - 8)).ok_or(MarketError::MathOverflow)?;
    }

    Ok(NormalizedPrice {
        value_e8: value,
        publish_time: price.publish_time,
        confidence_e8: u64::try_from(conf).map_err(|_| MarketError::MathOverflow)?,
    })
}

pub fn to_checkpoint(np: &NormalizedPrice) -> OracleCheckpoint {
    OracleCheckpoint {
        value_e8: np.value_e8,
        publish_time: np.publish_time,
        confidence_e8: np.confidence_e8,
        written: true,
    }
}
