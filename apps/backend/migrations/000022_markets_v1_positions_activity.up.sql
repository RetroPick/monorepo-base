-- MKT-P4: position projections and immutable activity events (expand-only).

CREATE TABLE IF NOT EXISTS markets_position_projections (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    wallet_account_id UUID REFERENCES markets_wallet_accounts (id),
    account_wallet TEXT NOT NULL CHECK (account_wallet ~ '^0x[0-9a-f]{40}$'),
    market_id TEXT NOT NULL,
    token_id TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    outcome_index INT CHECK (outcome_index IS NULL OR outcome_index >= 0),
    size TEXT NOT NULL,
    avg_entry_price TEXT,
    mark_price TEXT,
    cost_basis_amount BIGINT,
    cost_basis_currency TEXT DEFAULT 'USDC',
    cost_basis_decimals INT DEFAULT 6,
    unrealized_pnl TEXT,
    realized_pnl TEXT,
    resolution_status TEXT NOT NULL CHECK (resolution_status IN (
        'active', 'resolved', 'redeemable', 'redeemed', 'unknown'
    )),
    redeemable BOOLEAN NOT NULL DEFAULT FALSE,
    claimable_amount TEXT,
    freshness_state TEXT NOT NULL CHECK (freshness_state IN (
        'fresh', 'stale', 'reconciling', 'drift_detected'
    )),
    freshness_reason TEXT NOT NULL DEFAULT '',
    upstream_source TEXT NOT NULL DEFAULT 'data_api',
    upstream_id TEXT NOT NULL,
    chain_id INT NOT NULL DEFAULT 137,
    observed_at TIMESTAMPTZ NOT NULL,
    version INT NOT NULL DEFAULT 1,
    payload_json JSONB CHECK (payload_json IS NULL OR octet_length(payload_json::text) <= 1048576),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, account_wallet, token_id),
    UNIQUE (upstream_source, upstream_id)
);

CREATE INDEX IF NOT EXISTS idx_markets_position_projections_user_resolution
    ON markets_position_projections (user_id, resolution_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_position_projections_user_wallet
    ON markets_position_projections (user_id, account_wallet, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_position_projections_market_token
    ON markets_position_projections (market_id, token_id);

CREATE TABLE IF NOT EXISTS markets_activity_events (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_wallet TEXT CHECK (account_wallet IS NULL OR account_wallet ~ '^0x[0-9a-f]{40}$'),
    event_kind TEXT NOT NULL CHECK (event_kind IN (
        'fill', 'order', 'funding', 'withdrawal', 'split', 'merge',
        'redeem', 'convert', 'transfer', 'resolution', 'other'
    )),
    event_subtype TEXT,
    title TEXT,
    market_id TEXT,
    token_id TEXT,
    order_id UUID REFERENCES markets_user_orders (id),
    fill_id UUID REFERENCES markets_fills (id),
    reference_id TEXT,
    amount TEXT,
    fee_amount BIGINT,
    fee_currency TEXT DEFAULT 'USDC',
    fee_decimals INT DEFAULT 6,
    tx_hash TEXT CHECK (tx_hash IS NULL OR tx_hash ~ '^0x[0-9a-f]{64}$'),
    upstream_source TEXT NOT NULL,
    upstream_id TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    payload_json JSONB CHECK (payload_json IS NULL OR octet_length(payload_json::text) <= 1048576),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (upstream_source, upstream_id)
);

CREATE INDEX IF NOT EXISTS idx_markets_activity_events_user_observed
    ON markets_activity_events (user_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_activity_events_user_kind_observed
    ON markets_activity_events (user_id, event_kind, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_activity_events_order
    ON markets_activity_events (order_id)
    WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_markets_activity_events_fill
    ON markets_activity_events (fill_id)
    WHERE fill_id IS NOT NULL;
