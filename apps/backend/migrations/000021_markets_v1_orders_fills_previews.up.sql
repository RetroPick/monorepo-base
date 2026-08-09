-- MKT-P3: order previews, user orders, submit attempts, and fill projections (expand-only).

CREATE TABLE IF NOT EXISTS markets_order_previews (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    token_id TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    price TEXT NOT NULL,
    size TEXT NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'LIMIT' CHECK (order_type IN ('LIMIT')),
    time_in_force TEXT CHECK (time_in_force IS NULL OR time_in_force IN ('GTC', 'GTD')),
    maker_address TEXT NOT NULL CHECK (maker_address ~ '^0x[0-9a-f]{40}$'),
    signer_address TEXT NOT NULL CHECK (signer_address ~ '^0x[0-9a-f]{40}$'),
    exchange_domain TEXT NOT NULL CHECK (exchange_domain IN ('standard', 'neg_risk')),
    content_hash TEXT NOT NULL CHECK (content_hash ~ '^0x[0-9a-f]{64}$'),
    expires_at TIMESTAMPTZ NOT NULL,
    idempotency_key TEXT,
    unsigned_payload_json JSONB NOT NULL CHECK (octet_length(unsigned_payload_json::text) <= 1048576),
    human_summary_json JSONB NOT NULL CHECK (octet_length(human_summary_json::text) <= 1048576),
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_order_previews_user_idempotency
    ON markets_order_previews (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_markets_order_previews_user_created
    ON markets_order_previews (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_order_previews_expires_at
    ON markets_order_previews (expires_at);

CREATE INDEX IF NOT EXISTS idx_markets_order_previews_active
    ON markets_order_previews (consumed_at)
    WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS markets_user_orders (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    wallet_account_id UUID REFERENCES markets_wallet_accounts (id),
    market_id TEXT NOT NULL,
    token_id TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    order_type TEXT NOT NULL DEFAULT 'LIMIT' CHECK (order_type IN ('LIMIT')),
    time_in_force TEXT CHECK (time_in_force IS NULL OR time_in_force IN ('GTC', 'GTD')),
    price TEXT NOT NULL,
    original_size TEXT NOT NULL,
    remaining_size TEXT NOT NULL DEFAULT '0',
    matched_size TEXT NOT NULL DEFAULT '0',
    status TEXT NOT NULL CHECK (status IN (
        'previewed', 'submitted', 'open', 'partially_filled', 'filled',
        'cancel_pending', 'canceled', 'rejected', 'expired', 'unknown'
    )),
    client_order_id TEXT,
    idempotency_key TEXT NOT NULL,
    preview_id UUID REFERENCES markets_order_previews (id),
    content_hash TEXT CHECK (content_hash IS NULL OR content_hash ~ '^0x[0-9a-f]{64}$'),
    signed_payload_hash TEXT CHECK (signed_payload_hash IS NULL OR signed_payload_hash ~ '^0x[0-9a-f]{64}$'),
    maker_address TEXT NOT NULL CHECK (maker_address ~ '^0x[0-9a-f]{40}$'),
    signer_address TEXT NOT NULL CHECK (signer_address ~ '^0x[0-9a-f]{40}$'),
    upstream_source TEXT NOT NULL DEFAULT 'clob',
    upstream_id TEXT,
    chain_id INT NOT NULL DEFAULT 137,
    exchange_domain TEXT NOT NULL CHECK (exchange_domain IN ('standard', 'neg_risk')),
    observed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    rejection_reason TEXT,
    version INT NOT NULL DEFAULT 1,
    payload_json JSONB CHECK (payload_json IS NULL OR octet_length(payload_json::text) <= 1048576),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_user_orders_upstream_tuple
    ON markets_user_orders (upstream_source, upstream_id)
    WHERE upstream_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_user_orders_client_order
    ON markets_user_orders (user_id, client_order_id)
    WHERE client_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_markets_user_orders_user_status
    ON markets_user_orders (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_user_orders_user_created
    ON markets_user_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_user_orders_preview
    ON markets_user_orders (preview_id)
    WHERE preview_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS markets_order_attempts (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id UUID REFERENCES markets_user_orders (id),
    preview_id UUID NOT NULL REFERENCES markets_order_previews (id),
    idempotency_key TEXT NOT NULL,
    attempt_status TEXT NOT NULL CHECK (attempt_status IN (
        'preview_issued', 'submitted', 'accepted', 'rejected', 'integrity_failed'
    )),
    http_status INT,
    error_code TEXT,
    correlation_id TEXT,
    request_fingerprint TEXT,
    response_json JSONB CHECK (response_json IS NULL OR octet_length(response_json::text) <= 1048576),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_order_attempts_order
    ON markets_order_attempts (order_id);

CREATE INDEX IF NOT EXISTS idx_markets_order_attempts_preview
    ON markets_order_attempts (preview_id);

CREATE INDEX IF NOT EXISTS idx_markets_order_attempts_user_created
    ON markets_order_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_order_attempts_idempotency
    ON markets_order_attempts (idempotency_key);

CREATE TABLE IF NOT EXISTS markets_fills (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id UUID NOT NULL REFERENCES markets_user_orders (id),
    market_id TEXT NOT NULL,
    token_id TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    fill_price TEXT NOT NULL,
    fill_size TEXT NOT NULL,
    fee_amount BIGINT,
    fee_currency TEXT DEFAULT 'USDC',
    fee_decimals INT DEFAULT 6,
    upstream_source TEXT NOT NULL DEFAULT 'clob',
    upstream_id TEXT NOT NULL,
    tx_hash TEXT CHECK (tx_hash IS NULL OR tx_hash ~ '^0x[0-9a-f]{64}$'),
    observed_at TIMESTAMPTZ NOT NULL,
    payload_json JSONB CHECK (payload_json IS NULL OR octet_length(payload_json::text) <= 1048576),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (upstream_source, upstream_id)
);

CREATE INDEX IF NOT EXISTS idx_markets_fills_order_observed
    ON markets_fills (order_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_markets_fills_user_observed
    ON markets_fills (user_id, observed_at DESC);
