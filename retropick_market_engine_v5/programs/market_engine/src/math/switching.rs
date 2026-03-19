use anchor_lang::prelude::*;

use crate::{constants::BPS_DENOMINATOR, errors::MarketError};

pub fn compute_switch(gross_amount: u64, switch_fee_bps: u16) -> Result<(u64, u64)> {
    let fee = if switch_fee_bps == 0 {
        0
    } else {
        gross_amount
            .checked_mul(switch_fee_bps as u64)
            .and_then(|value| value.checked_add(BPS_DENOMINATOR - 1))
            .ok_or(MarketError::MathOverflow)?
            / BPS_DENOMINATOR
    };
    let net = gross_amount
        .checked_sub(fee)
        .ok_or(MarketError::MathOverflow)?;
    Ok((net, fee))
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn switch_with_fee() {
        let (net, fee) = compute_switch(10_000, 200).unwrap();
        assert_eq!(fee, 200);
        assert_eq!(net, 9_800);
    }

    #[test]
    fn switch_no_fee() {
        let (net, fee) = compute_switch(1_000, 0).unwrap();
        assert_eq!(fee, 0);
        assert_eq!(net, 1_000);
    }

    #[test]
    fn switch_fee_rounds_up_to_prevent_fee_bypass() {
        let (net, fee) = compute_switch(199, 1).unwrap();
        assert_eq!(fee, 1);
        assert_eq!(net, 198);
    }

    #[test]
    fn split_switches_do_not_avoid_fees() {
        let single_fee = compute_switch(19_900, 1).unwrap().1;
        let split_fee = (0..100)
            .map(|_| compute_switch(199, 1).unwrap().1)
            .sum::<u64>();

        assert!(split_fee >= single_fee);
    }
}
