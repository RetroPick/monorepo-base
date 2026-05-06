-- sqlc schema mirror of migrations (000001_init)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE indexer_state (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_block BIGINT NOT NULL DEFAULT 0,
    last_block_hash VARCHAR(66),
    last_indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reorg_depth INT NOT NULL DEFAULT 0
);

CREATE TABLE chain_events (
    id BIGSERIAL PRIMARY KEY,
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INT NOT NULL,
    contract_addr VARCHAR(42) NOT NULL,
    event_name VARCHAR(64) NOT NULL,
    template_id BYTEA,
    epoch_id BIGINT,
    user_address VARCHAR(42),
    payload JSONB NOT NULL DEFAULT '{}',
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tx_hash, log_index)
);

CREATE TABLE templates (
    template_id BYTEA PRIMARY KEY,
    slug VARCHAR(512) NOT NULL,
    market_type SMALLINT NOT NULL DEFAULT 0,
    outcome_count SMALLINT NOT NULL DEFAULT 2,
    oracle_max_delay_seconds BIGINT NOT NULL DEFAULT 0,
    oracle_max_confidence_bps INT NOT NULL DEFAULT 0,
    initialized BOOLEAN NOT NULL DEFAULT FALSE,
    execution_mode SMALLINT NOT NULL DEFAULT 0,
    rolling_phase SMALLINT NOT NULL DEFAULT 0,
    rolling_halt_reason SMALLINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ledgers (
    template_id BYTEA PRIMARY KEY REFERENCES templates (template_id) ON DELETE CASCADE,
    active_epoch_id BIGINT NOT NULL DEFAULT 0,
    last_resolved_epoch_id BIGINT NOT NULL DEFAULT 0,
    rolling_next_epoch_id BIGINT NOT NULL DEFAULT 1,
    halted_at_epoch_id BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE epochs (
    template_id BYTEA NOT NULL REFERENCES templates (template_id) ON DELETE CASCADE,
    epoch_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    open_at TIMESTAMPTZ,
    lock_at TIMESTAMPTZ,
    resolve_at TIMESTAMPTZ,
    open_tx_hash VARCHAR(66),
    lock_tx_hash VARCHAR(66),
    resolve_tx_hash VARCHAR(66),
    claimable BOOLEAN NOT NULL DEFAULT FALSE,
    winning_outcome_mask INT,
    ref_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (template_id, epoch_id)
);

CREATE TABLE keeper_schedule (
    id BIGSERIAL PRIMARY KEY,
    template_id BYTEA,
    epoch_id BIGINT,
    action VARCHAR(64) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    window_end_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE keeper_executions (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(64) NOT NULL,
    template_id BYTEA,
    epoch_id BIGINT,
    result VARCHAR(32) NOT NULL,
    tx_hash VARCHAR(66),
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incidents (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(256) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    template_id BYTEA,
    payload JSONB NOT NULL DEFAULT '{}',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE market_read_models (
    template_id BYTEA PRIMARY KEY REFERENCES templates (template_id) ON DELETE CASCADE,
    slug VARCHAR(512) NOT NULL,
    market_type SMALLINT NOT NULL DEFAULT 0,
    initialized BOOLEAN NOT NULL DEFAULT FALSE,
    execution_mode SMALLINT NOT NULL DEFAULT 0,
    rolling_phase SMALLINT NOT NULL DEFAULT 0,
    rolling_halt_reason SMALLINT NOT NULL DEFAULT 0,
    active_epoch_id BIGINT NOT NULL DEFAULT 0,
    last_resolved_epoch_id BIGINT,
    rolling_next_epoch_id BIGINT,
    halted_at_epoch_id BIGINT,
    status VARCHAR(32) NOT NULL DEFAULT 'unknown',
    total_pool NUMERIC(78, 0) NOT NULL DEFAULT 0,
    volume NUMERIC(78, 0) NOT NULL DEFAULT 0,
    outcome_count SMALLINT NOT NULL DEFAULT 2,
    outcomes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_event_seq BIGINT,
    last_indexed_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_read_models_active
    ON market_read_models (active_epoch_id, last_indexed_block DESC);

CREATE TABLE probability_points (
    template_id BYTEA NOT NULL REFERENCES templates (template_id) ON DELETE CASCADE,
    epoch_id BIGINT NOT NULL,
    seq BIGINT NOT NULL,
    outcome_index SMALLINT NOT NULL,
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(66),
    log_index INT,
    probability_bps INT NOT NULL DEFAULT 0,
    pool_amount NUMERIC(78, 0) NOT NULL DEFAULT 0,
    total_pool NUMERIC(78, 0) NOT NULL DEFAULT 0,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (template_id, epoch_id, seq, outcome_index)
);

CREATE INDEX idx_probability_points_lookup
    ON probability_points (template_id, epoch_id, seq DESC, outcome_index);

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

CREATE TABLE funding_transition_guards (
    id BIGSERIAL PRIMARY KEY,
    funding_intent_id UUID NOT NULL REFERENCES funding_intents(id) ON DELETE CASCADE,
    to_status TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (funding_intent_id, to_status, idempotency_key)
);

CREATE TABLE funding_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(42) NOT NULL,
    client_nonce TEXT,
    status TEXT NOT NULL,
    target_currency TEXT NOT NULL DEFAULT 'USD',
    target_display_amount TEXT NOT NULL,
    target_amount_decimal TEXT NOT NULL,
    target_usdc_amount NUMERIC(78,0) NOT NULL,
    settlement_chain_id BIGINT NOT NULL,
    settlement_token_address VARCHAR(42) NOT NULL,
    settlement_receiver_address VARCHAR(42),
    settlement_token_symbol TEXT NOT NULL DEFAULT 'USDC',
    settlement_token_decimals INT NOT NULL DEFAULT 6,
    mode TEXT NOT NULL DEFAULT 'AUTO_BEST_SOURCE',
    recommended_route_id UUID,
    selected_route_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    credited_amount NUMERIC(78,0) NOT NULL DEFAULT 0,
    credited_at TIMESTAMPTZ,
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
    matched_execution_id UUID,
    credit_status TEXT NOT NULL DEFAULT 'UNMATCHED',
    provenance TEXT NOT NULL DEFAULT 'POLLER',
    webhook_event_id UUID,
    provider_execution_ref TEXT,
    match_confidence NUMERIC(10,6),
    match_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(chain_id, tx_hash, log_index)
);

CREATE TABLE wallet_balance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_intent_id UUID NOT NULL REFERENCES funding_intents(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    chain_id BIGINT NOT NULL,
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    token_decimals INT,
    balance_amount NUMERIC(78,0) NOT NULL,
    estimated_usd_value NUMERIC(38,12),
    source TEXT NOT NULL,
    raw_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE funding_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_intent_id UUID NOT NULL REFERENCES funding_intents(id) ON DELETE CASCADE,
    funding_route_option_id UUID NOT NULL REFERENCES funding_route_options(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'LIFI',
    status TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    client_route_execution_id TEXT,
    source_chain_id BIGINT NOT NULL,
    source_token_address TEXT NOT NULL,
    source_amount NUMERIC(78,0) NOT NULL,
    destination_chain_id BIGINT NOT NULL,
    destination_token_address TEXT NOT NULL,
    expected_usdc_amount NUMERIC(78,0) NOT NULL,
    min_usdc_amount NUMERIC(78,0) NOT NULL,
    source_tx_hash TEXT,
    destination_tx_hash TEXT,
    provider_status JSONB,
    route_snapshot JSONB NOT NULL,
    failure_code TEXT,
    failure_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE route_update_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_execution_id UUID NOT NULL REFERENCES funding_executions(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT,
    step_index INT,
    process_type TEXT,
    chain_id BIGINT,
    tx_hash TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE funding_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    execution_id UUID REFERENCES funding_executions(id) ON DELETE SET NULL,
    event_type TEXT,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, event_id)
);

CREATE TABLE destination_transfer_indexer_state (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    last_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE destination_usdc_transfers
    ADD CONSTRAINT fk_destination_usdc_transfers_execution
    FOREIGN KEY (matched_execution_id) REFERENCES funding_executions(id);

ALTER TABLE destination_usdc_transfers
    ADD CONSTRAINT fk_destination_usdc_transfers_webhook
    FOREIGN KEY (webhook_event_id) REFERENCES funding_webhook_events(id);

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

CREATE TABLE market_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    outcome_id INT NOT NULL,
    amount NUMERIC(78,0) NOT NULL,
    funding_intent_id UUID REFERENCES funding_intents(id),
    status TEXT NOT NULL,
    tx_hash TEXT,
    chain_id BIGINT,
    failure_code TEXT,
    failure_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE provider_tools_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    tool_key TEXT NOT NULL,
    tool_type TEXT NOT NULL,
    status TEXT NOT NULL,
    risk_score INT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, tool_key)
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

-- Omitted from public /api/v1/markets; see migrations/000002_frontend_hidden.up.sql
CREATE TABLE frontend_hidden_templates (
    template_id BYTEA PRIMARY KEY REFERENCES templates (template_id) ON DELETE CASCADE,
    hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User watchlist + replay protection for signed mutations; see migrations/000003_user_watchlist.up.sql
CREATE TABLE user_watchlist (
    user_address VARCHAR(42) NOT NULL,
    template_id BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_address, template_id)
);

CREATE INDEX idx_user_watchlist_user ON user_watchlist (LOWER(user_address));

CREATE TABLE user_watchlist_nonce (
    user_address VARCHAR(42) PRIMARY KEY,
    nonce BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
