CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE market_epoch_outcomes (
    template_id BYTEA NOT NULL,
    epoch_id BIGINT NOT NULL,
    outcome_index SMALLINT NOT NULL,
    pool_amount NUMERIC(78, 0) NOT NULL DEFAULT 0,
    probability_bps INT NOT NULL DEFAULT 0,
    multiplier_bps INT NOT NULL DEFAULT 0,
    updated_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (template_id, epoch_id, outcome_index)
);

CREATE INDEX idx_market_epoch_outcomes_template_epoch
    ON market_epoch_outcomes (template_id, epoch_id);

CREATE TABLE market_snapshots (
    template_id BYTEA PRIMARY KEY REFERENCES templates (template_id) ON DELETE CASCADE,
    active_epoch_id BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'unknown',
    total_pool NUMERIC(78, 0) NOT NULL DEFAULT 0,
    volume NUMERIC(78, 0) NOT NULL DEFAULT 0,
    outcome_count SMALLINT NOT NULL DEFAULT 2,
    last_indexed_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_snapshots_active
    ON market_snapshots (active_epoch_id, last_indexed_block DESC);

CREATE TABLE realtime_events (
    seq BIGSERIAL PRIMARY KEY,
    channel VARCHAR(128) NOT NULL,
    type VARCHAR(64) NOT NULL,
    scope VARCHAR(16) NOT NULL DEFAULT 'public',
    user_address VARCHAR(42),
    template_id BYTEA,
    epoch_id BIGINT,
    block_number BIGINT,
    tx_hash VARCHAR(66),
    log_index INT,
    payload JSONB NOT NULL DEFAULT '{}',
    dedupe_key VARCHAR(160),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dedupe_key)
);

CREATE INDEX idx_realtime_events_channel_seq
    ON realtime_events (channel, seq DESC);

CREATE INDEX idx_realtime_events_template_seq
    ON realtime_events (template_id, seq)
    WHERE template_id IS NOT NULL;

CREATE INDEX idx_realtime_events_user_seq
    ON realtime_events (user_address, seq DESC)
    WHERE user_address IS NOT NULL;

CREATE TABLE ws_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id TEXT NOT NULL,
    user_address VARCHAR(42),
    is_operator BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    last_ping_at TIMESTAMPTZ,
    close_code INT,
    close_reason TEXT
);

CREATE TABLE ws_subscriptions (
    connection_id UUID REFERENCES ws_connections(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    last_seq BIGINT,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (connection_id, channel)
);

CREATE TABLE user_position_outcomes (
    user_address VARCHAR(42) NOT NULL,
    template_id BYTEA NOT NULL,
    epoch_id BIGINT NOT NULL,
    outcome_index SMALLINT NOT NULL,
    stake_amount NUMERIC(78, 0) NOT NULL DEFAULT 0,
    claimed_amount NUMERIC(78, 0) NOT NULL DEFAULT 0,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_address, template_id, epoch_id, outcome_index)
);

CREATE INDEX idx_user_position_outcomes_pair
    ON user_position_outcomes (user_address, template_id, epoch_id);

CREATE TABLE submitted_transactions (
    tx_hash VARCHAR(66) PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    action VARCHAR(32) NOT NULL,
    template_id BYTEA,
    epoch_id BIGINT,
    idempotency_key VARCHAR(160),
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (idempotency_key)
);

CREATE TABLE funding_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(42) NOT NULL,
    status TEXT NOT NULL,
    target_currency TEXT NOT NULL DEFAULT 'USD',
    target_amount_decimal TEXT NOT NULL,
    target_usdc_amount NUMERIC(78,0) NOT NULL,
    settlement_chain_id BIGINT NOT NULL,
    settlement_token_address VARCHAR(42) NOT NULL,
    recommended_route_id UUID,
    selected_route_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    failure_code TEXT,
    failure_message TEXT
);

CREATE TABLE funding_route_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_intent_id UUID NOT NULL REFERENCES funding_intents(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'LIFI',
    provider_route_id TEXT NOT NULL,
    source_chain_id BIGINT NOT NULL,
    source_token_address VARCHAR(42) NOT NULL,
    source_token_symbol TEXT,
    source_token_decimals INT,
    source_amount NUMERIC(78,0) NOT NULL,
    estimated_usdc_received NUMERIC(78,0) NOT NULL,
    min_usdc_received NUMERIC(78,0) NOT NULL,
    estimated_duration_seconds INT,
    route_score NUMERIC(20,8),
    route_snapshot JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(funding_intent_id, provider, provider_route_id)
);

CREATE TABLE destination_usdc_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id BIGINT NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INT NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78,0) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMPTZ,
    matched_funding_intent_id UUID REFERENCES funding_intents(id),
    credit_status TEXT NOT NULL DEFAULT 'UNMATCHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(chain_id, tx_hash, log_index)
);

CREATE TABLE user_balances (
    user_address VARCHAR(42) PRIMARY KEY,
    usdc_available NUMERIC(78,0) NOT NULL DEFAULT 0,
    usdc_locked NUMERIC(78,0) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (usdc_available >= 0),
    CHECK (usdc_locked >= 0)
);

CREATE TABLE balance_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(42) NOT NULL,
    delta_available NUMERIC(78,0) NOT NULL DEFAULT 0,
    delta_locked NUMERIC(78,0) NOT NULL DEFAULT 0,
    balance_after_available NUMERIC(78,0),
    balance_after_locked NUMERIC(78,0),
    reason TEXT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE price_candles (
    feed_id TEXT NOT NULL,
    interval_sec INT NOT NULL,
    bucket_start TIMESTAMPTZ NOT NULL,
    open_e8 NUMERIC(38,0) NOT NULL,
    high_e8 NUMERIC(38,0) NOT NULL,
    low_e8 NUMERIC(38,0) NOT NULL,
    close_e8 NUMERIC(38,0) NOT NULL,
    source TEXT NOT NULL,
    sample_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (feed_id, interval_sec, bucket_start)
);
