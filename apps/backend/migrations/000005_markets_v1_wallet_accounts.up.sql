-- MKT-P2-004: signer → account wallet linkage (API-owned operational data).

CREATE TABLE IF NOT EXISTS markets_wallet_accounts (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    signer_address TEXT NOT NULL CHECK (signer_address ~ '^0x[0-9a-f]{40}$'),
    account_wallet TEXT NOT NULL CHECK (account_wallet ~ '^0x[0-9a-f]{40}$'),
    wallet_type TEXT NOT NULL CHECK (wallet_type IN ('EOA', 'POLY_PROXY', 'GNOSIS_SAFE', 'DEPOSIT_WALLET')),
    link_status TEXT NOT NULL CHECK (link_status IN ('linked', 'pending_verification')),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    chain_id INT NOT NULL DEFAULT 137,
    linkage_proof_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, signer_address, account_wallet)
);

CREATE INDEX IF NOT EXISTS idx_markets_wallet_accounts_signer
    ON markets_wallet_accounts (user_id, signer_address);

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_wallet_accounts_one_primary
    ON markets_wallet_accounts (user_id, signer_address)
    WHERE is_primary = TRUE;
