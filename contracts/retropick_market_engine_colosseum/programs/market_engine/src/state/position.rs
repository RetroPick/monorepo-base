//! User stake breakdown for one user in one [`super::Epoch`].

use anchor_lang::prelude::*;

use crate::constants::MAX_OUTCOMES;

/// Per-user per-epoch PDA. **PDA seeds:** [`Position::SEED`], `epoch_pubkey`, `user_pubkey`.
///
/// **`entry_fees_paid`:** initialized to 0; **never incremented**—no entry-fee path today (`currentPrograms.md` §3.1).
#[account]
#[derive(InitSpace)]
pub struct Position {
    pub version: u8,
    pub bump: u8,

    pub stakes: [u64; MAX_OUTCOMES],
    pub total_stake: u64,

    pub switch_fees_paid: u64,
    /// Reserved for future entry fees; currently unused.
    pub entry_fees_paid: u64,

    pub claimed_amount: u64,
    pub claimed: bool,

    pub reserved: [u8; 16],
}

impl Position {
    pub const SEED: &'static [u8] = b"position";

    /// Stake on a single outcome index.
    pub fn stake_for_outcome(&self, outcome_index: usize) -> u64 {
        self.stakes[outcome_index]
    }

    /// Sum of `stakes[i]` for indices in `winning_mask` (up to `outcome_count`).
    pub fn total_winning_stake(&self, winning_mask: u64, outcome_count: u8) -> u64 {
        let mut sum = 0u64;
        for i in 0..outcome_count as usize {
            if (winning_mask & (1u64 << i)) != 0 {
                sum = sum.saturating_add(self.stakes[i]);
            }
        }
        sum
    }

    /// Number of outcomes with positive stake (multi-side diagnostics).
    pub fn nonzero_outcome_count(&self, outcome_count: u8) -> usize {
        self.stakes
            .iter()
            .take(outcome_count as usize)
            .filter(|stake| **stake > 0)
            .count()
    }

    /// If `allow_multi_side_positions`, always true; else only if empty or only this outcome has stake.
    pub fn can_deposit_to_outcome(&self, outcome_index: usize, outcome_count: u8, allow_multi_side_positions: bool) -> bool {
        allow_multi_side_positions
            || self.total_stake == 0
            || self.stakes
                .iter()
                .take(outcome_count as usize)
                .enumerate()
                .all(|(idx, stake)| *stake == 0 || idx == outcome_index)
    }

    /// True if all stake sits on `outcome_index` (others zero).
    pub fn is_single_sided_on(&self, outcome_index: usize, outcome_count: u8) -> bool {
        self.stakes
            .iter()
            .take(outcome_count as usize)
            .enumerate()
            .all(|(idx, stake)| *stake == 0 || idx == outcome_index)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_side_mode_rejects_other_outcome_deposit() {
        let position = Position {
            version: 1,
            bump: 1,
            stakes: [10, 0, 0, 0, 0, 0, 0, 0],
            total_stake: 10,
            switch_fees_paid: 0,
            entry_fees_paid: 0,
            claimed_amount: 0,
            claimed: false,
            reserved: [0; 16],
        };

        assert!(!position.can_deposit_to_outcome(1, 3, false));
        assert!(position.can_deposit_to_outcome(0, 3, false));
    }

    #[test]
    fn single_side_helper_detects_clean_source_side() {
        let position = Position {
            version: 1,
            bump: 1,
            stakes: [0, 25, 0, 0, 0, 0, 0, 0],
            total_stake: 25,
            switch_fees_paid: 0,
            entry_fees_paid: 0,
            claimed_amount: 0,
            claimed: false,
            reserved: [0; 16],
        };

        assert!(position.is_single_sided_on(1, 2));
        assert!(!position.is_single_sided_on(0, 2));
    }

    #[test]
    fn position_init_space_is_smaller_than_legacy_layout() {
        assert!(Position::INIT_SPACE < 211);
    }
}
