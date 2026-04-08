use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ActiveVaultMeta {
    pub version: u8,
    pub bump: u8,
    pub vault_authority_bump: u8,
    pub reserved: [u8; 16],
}

#[account]
#[derive(InitSpace)]
pub struct ClaimsVaultMeta {
    pub version: u8,
    pub bump: u8,
    pub vault_authority_bump: u8,
    pub reserved: [u8; 16],
}

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
