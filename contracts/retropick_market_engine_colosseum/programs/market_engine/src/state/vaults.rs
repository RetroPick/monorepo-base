//! Minimal PDAs that store **bump** metadata for template-scoped token vault authorities (`currentPrograms.md` §4).

use anchor_lang::prelude::*;

/// Metadata for the **active** (trading) vault authority. **Meta PDA:** [`ActiveVaultMeta::META_SEED`], template. **Authority PDA:** [`ActiveVaultMeta::AUTHORITY_SEED`], template — signs transfers from the active token ATA.
#[account]
#[derive(InitSpace)]
pub struct ActiveVaultMeta {
    pub version: u8,
    pub bump: u8,
    pub vault_authority_bump: u8,
    pub reserved: [u8; 16],
}

/// Metadata for the **claims** vault (post-settlement user payouts). **Meta:** [`ClaimsVaultMeta::META_SEED`]. **Authority:** [`ClaimsVaultMeta::AUTHORITY_SEED`].
#[account]
#[derive(InitSpace)]
pub struct ClaimsVaultMeta {
    pub version: u8,
    pub bump: u8,
    pub vault_authority_bump: u8,
    pub reserved: [u8; 16],
}

/// Metadata for the **fee** vault (protocol fees before `withdraw_fees`). **Meta:** [`FeeVaultMeta::META_SEED`]. **Authority:** [`FeeVaultMeta::AUTHORITY_SEED`].
#[account]
#[derive(InitSpace)]
pub struct FeeVaultMeta {
    pub version: u8,
    pub bump: u8,
    pub vault_authority_bump: u8,
    pub reserved: [u8; 16],
}

impl ActiveVaultMeta {
    pub const META_SEED: &'static [u8] = b"active_vault_meta";
    pub const AUTHORITY_SEED: &'static [u8] = b"active_vault";
}

impl ClaimsVaultMeta {
    pub const META_SEED: &'static [u8] = b"claims_vault_meta";
    pub const AUTHORITY_SEED: &'static [u8] = b"claims_vault";
}

impl FeeVaultMeta {
    pub const META_SEED: &'static [u8] = b"fee_vault_meta";
    pub const AUTHORITY_SEED: &'static [u8] = b"fee_vault";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_vault_meta_init_space_is_smaller_than_legacy_layout() {
        assert!(ActiveVaultMeta::INIT_SPACE < 76);
    }

    #[test]
    fn claims_vault_meta_init_space_is_smaller_than_legacy_layout() {
        assert!(ClaimsVaultMeta::INIT_SPACE < 76);
    }

    #[test]
    fn fee_vault_meta_init_space_is_smaller_than_legacy_layout() {
        assert!(FeeVaultMeta::INIT_SPACE < 76);
    }
}
