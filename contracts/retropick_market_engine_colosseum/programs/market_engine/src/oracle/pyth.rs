//! Pyth Pull oracle: load [`PriceUpdateV2`], enforce freshness, normalize to **e8** fixed point for resolvers.

use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{Price, PriceUpdateV2};

use crate::{errors::MarketError, state::OracleCheckpoint};

/// Normalized price for checkpoints: integer `value_e8`, Pyth `publish_time`, and `confidence_e8` in the same scale as `value_e8`.
#[derive(Debug, Clone, Copy)]
pub struct NormalizedPrice {
    pub value_e8: i128,
    pub publish_time: i64,
    pub confidence_e8: u64,
}

/// Maps Pyth `(price, conf, exponent)` to e8-scaled integers. Real value is `price * 10^exponent`; checkpoints store
/// `value_e8 = price * 10^(exponent + 8)` (integer ops), matching all feed types on Pyth (crypto, FX, metals, etc.).
pub(crate) fn pyth_components_to_e8(price: i64, conf: u64, exponent: i32) -> Result<(i128, u64)> {
    let value_e8 = scale_i64_by_pow10(price, exponent.checked_add(8).ok_or(MarketError::MathOverflow)?)?;
    let conf128 = scale_u128_by_pow10(u128::from(conf), exponent.checked_add(8).ok_or(MarketError::MathOverflow)?)?;
    let confidence_e8 = u64::try_from(conf128.min(u128::from(u64::MAX))).map_err(|_| MarketError::MathOverflow)?;
    Ok((value_e8, confidence_e8))
}

fn scale_i64_by_pow10(x: i64, k: i32) -> Result<i128> {
    let mut v = x as i128;
    let kk = i128::from(k);
    if kk >= 0 {
        let n = u32::try_from(kk).map_err(|_| MarketError::MathOverflow)?;
        require!(n <= 38, MarketError::MathOverflow);
        v = v.checked_mul(10i128.pow(n)).ok_or(MarketError::MathOverflow)?;
    } else {
        let n = u32::try_from(-kk).map_err(|_| MarketError::MathOverflow)?;
        require!(n <= 38, MarketError::MathOverflow);
        v = v.checked_div(10i128.pow(n)).ok_or(MarketError::MathOverflow)?;
    }
    Ok(v)
}

fn scale_u128_by_pow10(x: u128, k: i32) -> Result<u128> {
    let kk = i128::from(k);
    if kk >= 0 {
        let n = u32::try_from(kk).map_err(|_| MarketError::MathOverflow)?;
        require!(n <= 38, MarketError::MathOverflow);
        Ok(x.checked_mul(10u128.pow(n)).ok_or(MarketError::MathOverflow)?)
    } else {
        let n = u32::try_from(-kk).map_err(|_| MarketError::MathOverflow)?;
        require!(n <= 38, MarketError::MathOverflow);
        Ok(x / 10u128.pow(n))
    }
}

/// Loads the feed matching `expected_feed_id`, requires `get_price_no_older_than` to succeed (else [`MarketError::OracleStale`]), maps Pyth exponent to **1e8** fixed point.
///
/// Confidence ratio checks vs `max_confidence_bps` happen in the lock/resolve instructions (`flow.md` §3), not in this helper.
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

    normalized_from_sdk_price(&price)
}

/// Maps a Pyth SDK [`Price`] (from `get_price_no_older_than`) to [`NormalizedPrice`]. Used by tests and [`read_price_no_older_than`].
pub(crate) fn normalized_from_sdk_price(price: &Price) -> Result<NormalizedPrice> {
    let (value_e8, confidence_e8) = pyth_components_to_e8(price.price, price.conf, price.exponent)?;
    Ok(NormalizedPrice {
        value_e8,
        publish_time: price.publish_time,
        confidence_e8,
    })
}

/// Builds a written checkpoint for storage on the [`crate::state::Epoch`].
pub fn to_checkpoint(np: &NormalizedPrice) -> OracleCheckpoint {
    OracleCheckpoint {
        value_e8: np.value_e8,
        publish_time: np.publish_time,
        confidence_e8: np.confidence_e8,
        written: true,
    }
}

#[cfg(test)]
mod tests {
    use super::{normalized_from_sdk_price, pyth_components_to_e8, read_price_no_older_than, to_checkpoint};
    use crate::errors::MarketError;
    use anchor_lang::{prelude::*, AccountSerialize};
    use anchor_lang::solana_program::account_info::AccountInfo;
    use pyth_solana_receiver_sdk::price_update::{Price, PriceFeedMessage, PriceUpdateV2, VerificationLevel};

    #[test]
    fn e8_matches_legacy_crypto_minus8() {
        let (v, c) = pyth_components_to_e8(100_000_000, 50_000_000, -8).unwrap();
        assert_eq!(v, 100_000_000);
        assert_eq!(c, 50_000_000);
    }

    #[test]
    fn e8_scales_equity_style_minus5() {
        let (v, _) = pyth_components_to_e8(199_900, 100, -5).unwrap();
        assert_eq!(v, 199_900_000);
    }

    #[test]
    fn e8_positive_exponent() {
        let (v, _) = pyth_components_to_e8(5, 1, 2).unwrap();
        assert_eq!(v, 5 * 10i128.pow(10));
    }

    #[test]
    fn e8_negative_scale_down() {
        let (v, _) = pyth_components_to_e8(1_000_000, 100, -12).unwrap();
        assert_eq!(v, 100);
    }

    /// Crypto NAV / rates-style **−10** exponent (see Pyth Insights asset classes).
    #[test]
    fn e8_crypto_nav_minus10_exponent() {
        let (v, c) = pyth_components_to_e8(1_234_567_890, 1_000_000, -10).unwrap();
        // k = exponent + 8 = -2 → divide by 10^2
        assert_eq!(v, 12_345_678);
        assert_eq!(c, 10_000);
        let (v2, c2) = pyth_components_to_e8(1, 1, -10).unwrap();
        assert_eq!(v2, 0);
        assert_eq!(c2, 0);
    }

    #[test]
    fn confidence_scales_with_same_exponent_as_price() {
        let (v, c) = pyth_components_to_e8(10_000, 500, -4).unwrap();
        // k = 4: 10_000 * 10^4 = 10^8; 500 * 10^4 = 5 * 10^6
        assert_eq!(v, 100_000_000);
        assert_eq!(c, 5_000_000);
    }

    #[test]
    fn negative_mantissa_preserved_in_scaling() {
        let (v, _) = pyth_components_to_e8(-50_000_000, 1, -8).unwrap();
        assert_eq!(v, -50_000_000);
    }

    #[test]
    fn normalized_from_sdk_price_round_trip() {
        let p = Price {
            price: 42,
            conf: 7,
            exponent: -3,
            publish_time: 1_700_000_000,
        };
        let n = normalized_from_sdk_price(&p).unwrap();
        assert_eq!(n.publish_time, 1_700_000_000);
        // 42 * 10^(-3+8) = 42 * 10^5
        assert_eq!(n.value_e8, 4_200_000);
        assert_eq!(n.confidence_e8, 700_000);
    }

    #[test]
    fn to_checkpoint_sets_written_and_copies_fields() {
        let n = super::NormalizedPrice {
            value_e8: -1,
            publish_time: 99,
            confidence_e8: 5,
        };
        let cp = to_checkpoint(&n);
        assert_eq!(cp.value_e8, -1);
        assert_eq!(cp.publish_time, 99);
        assert_eq!(cp.confidence_e8, 5);
        assert!(cp.written);
    }

    #[test]
    fn read_price_rejects_negative_max_delay() {
        let feed = [2u8; 32];
        let inner = PriceUpdateV2 {
            write_authority: Pubkey::default(),
            verification_level: VerificationLevel::Full,
            price_message: PriceFeedMessage {
                feed_id: feed,
                ema_conf: 0,
                ema_price: 0,
                price: 1,
                conf: 1,
                exponent: -8,
                prev_publish_time: 0,
                publish_time: 100,
            },
            posted_slot: 0,
        };
        let mut data = vec![0u8; PriceUpdateV2::LEN];
        inner.try_serialize(&mut &mut data[..]).unwrap();
        let key = Pubkey::new_unique();
        let mut lamports = 1_000_000u64;
        let owner = pyth_solana_receiver_sdk::ID;
        let ai = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        let account: Account<PriceUpdateV2> = Account::try_from(&ai).unwrap();
        let err = read_price_no_older_than(&account, &feed, -1, 200).unwrap_err();
        assert_eq!(err, MarketError::InvalidTiming.into());
    }

    #[test]
    fn read_price_maps_fresh_full_verification_update() {
        let feed = [3u8; 32];
        let inner = PriceUpdateV2 {
            write_authority: Pubkey::default(),
            verification_level: VerificationLevel::Full,
            price_message: PriceFeedMessage {
                feed_id: feed,
                ema_conf: 0,
                ema_price: 0,
                price: 50_000_000_000,
                conf: 25_000_000_000,
                exponent: -8,
                prev_publish_time: 0,
                publish_time: 1_000,
            },
            posted_slot: 0,
        };
        let mut data = vec![0u8; PriceUpdateV2::LEN];
        inner.try_serialize(&mut &mut data[..]).unwrap();
        let key = Pubkey::new_unique();
        let mut lamports = 1_000_000u64;
        let owner = pyth_solana_receiver_sdk::ID;
        let ai = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        let account: Account<PriceUpdateV2> = Account::try_from(&ai).unwrap();
        let n = read_price_no_older_than(&account, &feed, 60, 1_050).unwrap();
        assert_eq!(n.value_e8, 50_000_000_000);
        assert_eq!(n.confidence_e8, 25_000_000_000);
        assert_eq!(n.publish_time, 1_000);
    }

    #[test]
    fn read_price_oracle_stale_when_too_old() {
        let feed = [4u8; 32];
        let inner = PriceUpdateV2 {
            write_authority: Pubkey::default(),
            verification_level: VerificationLevel::Full,
            price_message: PriceFeedMessage {
                feed_id: feed,
                ema_conf: 0,
                ema_price: 0,
                price: 1,
                conf: 1,
                exponent: -8,
                prev_publish_time: 0,
                publish_time: 100,
            },
            posted_slot: 0,
        };
        let mut data = vec![0u8; PriceUpdateV2::LEN];
        inner.try_serialize(&mut &mut data[..]).unwrap();
        let key = Pubkey::new_unique();
        let mut lamports = 1_000_000u64;
        let owner = pyth_solana_receiver_sdk::ID;
        let ai = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        let account: Account<PriceUpdateV2> = Account::try_from(&ai).unwrap();
        let err = read_price_no_older_than(&account, &feed, 30, 200).unwrap_err();
        assert_eq!(err, MarketError::OracleStale.into());
    }
}
