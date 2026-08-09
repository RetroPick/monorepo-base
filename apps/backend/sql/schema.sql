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
    block_hash BYTEA,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    tx_hash VARCHAR(66),
    claimed_by TEXT,
    claimed_at TIMESTAMPTZ,
    preflight_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE keeper_executions (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(64) NOT NULL,
    template_id BYTEA,
    epoch_id BIGINT,
    result VARCHAR(32) NOT NULL,
    tx_hash VARCHAR(66),
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    schedule_id BIGINT REFERENCES keeper_schedule (id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    mined_at TIMESTAMPTZ,
    gas_used BIGINT,
    receipt_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    chain_id BIGINT,
    nonce BIGINT,
    preflight_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE incidents (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(256) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    template_id BYTEA,
    payload JSONB NOT NULL DEFAULT '{}',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at TIMESTAMPTZ,
    notification_attempts INT NOT NULL DEFAULT 0,
    last_error TEXT
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

CREATE SEQUENCE probability_points_seq;

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

CREATE TABLE oracle_feed_health (
    feed_id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    round_id NUMERIC(78,0) NOT NULL DEFAULT 0,
    price_e8 NUMERIC(38,0) NOT NULL DEFAULT 0,
    publish_time TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ NOT NULL,
    stale BOOLEAN NOT NULL DEFAULT FALSE,
    error_text TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oracle_feed_health_stale_checked
    ON oracle_feed_health (stale, last_checked_at DESC);

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

-- V3 upgrade tables (migrations 000012-000015)
CREATE TABLE indexer_blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL,
    parent_hash BYTEA NOT NULL,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reporter_identity (
    id BIGSERIAL PRIMARY KEY,
    address BYTEA NOT NULL UNIQUE,
    pubkey BYTEA,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reporter_submissions (
    id BIGSERIAL PRIMARY KEY,
    template_id TEXT NOT NULL,
    epoch_id BIGINT NOT NULL,
    reporter_id BIGINT NOT NULL REFERENCES reporter_identity(id),
    outcome JSONB NOT NULL,
    evidence JSONB NOT NULL,
    evidence_hash BYTEA NOT NULL,
    signature BYTEA NOT NULL,
    nonce BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, epoch_id, reporter_id, nonce)
);

CREATE TABLE reporter_audit_log (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT REFERENCES reporter_submissions(id),
    actor_id BIGINT REFERENCES reporter_identity(id),
    action TEXT NOT NULL,
    reason TEXT,
    tx_hash BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gooddollar_user_status (
    wallet BYTEA PRIMARY KEY,
    goodid_verified BOOLEAN NOT NULL DEFAULT false,
    root_wallet BYTEA,
    last_checked_at TIMESTAMPTZ
);

CREATE TABLE referral_bindings (
    referee_wallet BYTEA PRIMARY KEY,
    referrer_wallet BYTEA NOT NULL,
    referral_code TEXT NOT NULL,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fee_events (
    id BIGSERIAL PRIMARY KEY,
    tx_hash BYTEA NOT NULL,
    log_index INT NOT NULL,
    market_id BYTEA NOT NULL,
    trader_wallet BYTEA NOT NULL,
    token_address BYTEA NOT NULL,
    fee_amount NUMERIC(78, 0) NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tx_hash, log_index)
);

CREATE TABLE referral_reward_events (
    id BIGSERIAL PRIMARY KEY,
    fee_event_id BIGINT NOT NULL REFERENCES fee_events(id),
    referrer_wallet BYTEA NOT NULL,
    trader_wallet BYTEA NOT NULL,
    level INT NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    status TEXT NOT NULL DEFAULT 'claimable',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (fee_event_id, referrer_wallet, level)
);

CREATE TABLE reward_ledger_events (
    id BIGSERIAL PRIMARY KEY,
    wallet BYTEA NOT NULL,
    quest_id TEXT NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    token_address BYTEA NOT NULL,
    status TEXT NOT NULL DEFAULT 'claimable',
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reward_claims (
    id BIGSERIAL PRIMARY KEY,
    wallet BYTEA NOT NULL,
    reward_ledger_event_id BIGINT REFERENCES reward_ledger_events(id),
    claim_nonce TEXT NOT NULL UNIQUE,
    payload_hash BYTEA NOT NULL,
    tx_hash BYTEA,
    status TEXT NOT NULL DEFAULT 'prepared',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE impact_daily_metrics (
    day DATE PRIMARY KEY,
    gusd_volume NUMERIC(78, 0) NOT NULL DEFAULT 0,
    gusd_fees NUMERIC(78, 0) NOT NULL DEFAULT 0,
    unique_users INT NOT NULL DEFAULT 0,
    verified_users INT NOT NULL DEFAULT 0,
    rewards_claimed NUMERIC(78, 0) NOT NULL DEFAULT 0,
    markets_resolved INT NOT NULL DEFAULT 0
);

CREATE TABLE fee_route_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_id BYTEA NOT NULL UNIQUE,
    token_address BYTEA NOT NULL,
    gross_amount NUMERIC(78, 0) NOT NULL,
    treasury_amount NUMERIC(78, 0) NOT NULL,
    rewards_amount NUMERIC(78, 0) NOT NULL,
    community_amount NUMERIC(78, 0) NOT NULL,
    allocation_hash BYTEA,
    tx_hash BYTEA NOT NULL,
    log_index INT NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tx_hash, log_index)
);

-- Markets V1 backend-first projections (migration 000016)
CREATE TABLE markets_catalog_events (
    event_id TEXT PRIMARY KEY,
    id UUID NOT NULL,
    upstream_id TEXT NOT NULL,
    upstream_source TEXT NOT NULL,
    slug TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('unknown', 'open', 'closed', 'resolved', 'archived')),
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    source TEXT NOT NULL,
    upstream_updated_at TIMESTAMPTZ,
    content_hash TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(payload::text) <= 1048576),
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_markets_catalog_events_row_id
    ON markets_catalog_events (id);
CREATE UNIQUE INDEX idx_markets_catalog_events_upstream_tuple
    ON markets_catalog_events (upstream_source, upstream_id);
CREATE UNIQUE INDEX idx_markets_catalog_events_slug
    ON markets_catalog_events (slug) WHERE slug <> '';
CREATE INDEX idx_markets_catalog_events_status_end
    ON markets_catalog_events (status, end_at DESC, event_id);
CREATE INDEX idx_markets_catalog_events_observed
    ON markets_catalog_events (observed_at DESC);

CREATE TABLE markets_catalog_markets (
    market_id TEXT PRIMARY KEY,
    id UUID NOT NULL,
    upstream_id TEXT NOT NULL,
    upstream_source TEXT NOT NULL,
    event_id TEXT REFERENCES markets_catalog_events(event_id) ON DELETE SET NULL,
    condition_id TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL DEFAULT '',
    question TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('unknown', 'open', 'closed', 'resolved', 'archived')),
    end_at TIMESTAMPTZ,
    enable_order_book BOOLEAN NOT NULL DEFAULT FALSE,
    neg_risk BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL,
    upstream_updated_at TIMESTAMPTZ,
    content_hash TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(payload::text) <= 1048576),
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_markets_catalog_markets_row_id
    ON markets_catalog_markets (id);
CREATE UNIQUE INDEX idx_markets_catalog_markets_upstream_tuple
    ON markets_catalog_markets (upstream_source, upstream_id);
CREATE INDEX idx_markets_catalog_markets_event
    ON markets_catalog_markets (event_id, status);
CREATE INDEX idx_markets_catalog_markets_status_end
    ON markets_catalog_markets (status, end_at DESC, market_id);

CREATE TABLE markets_catalog_outcomes (
    outcome_id TEXT PRIMARY KEY,
    id UUID NOT NULL,
    upstream_id TEXT NOT NULL,
    upstream_source TEXT NOT NULL,
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    upstream_token_id TEXT NOT NULL UNIQUE,
    outcome_index INT NOT NULL CHECK (outcome_index >= 0),
    name TEXT NOT NULL,
    price TEXT CHECK (price IS NULL OR price ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    winner BOOLEAN,
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (market_id, outcome_index)
);

CREATE UNIQUE INDEX idx_markets_catalog_outcomes_row_id
    ON markets_catalog_outcomes (id);
CREATE UNIQUE INDEX idx_markets_catalog_outcomes_upstream_tuple
    ON markets_catalog_outcomes (upstream_source, upstream_id);
CREATE INDEX idx_markets_catalog_outcomes_market
    ON markets_catalog_outcomes (market_id, outcome_index);

CREATE TABLE markets_catalog_rules (
    market_id TEXT PRIMARY KEY REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    id UUID NOT NULL,
    upstream_id TEXT NOT NULL,
    upstream_source TEXT NOT NULL,
    description TEXT NOT NULL,
    resolution_source_name TEXT NOT NULL DEFAULT '',
    resolution_source_url TEXT NOT NULL DEFAULT '',
    content_hash TEXT NOT NULL,
    upstream_updated_at TIMESTAMPTZ,
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_markets_catalog_rules_row_id
    ON markets_catalog_rules (id);
CREATE UNIQUE INDEX idx_markets_catalog_rules_upstream_tuple
    ON markets_catalog_rules (upstream_source, upstream_id);

CREATE TABLE markets_market_data_latest (
    token_id TEXT PRIMARY KEY,
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    condition_id TEXT NOT NULL,
    freshness_state TEXT NOT NULL CHECK (freshness_state IN ('fresh', 'stale', 'resyncing', 'unavailable', 'invalid')),
    freshness_reason TEXT NOT NULL DEFAULT '',
    book_hash TEXT NOT NULL DEFAULT '',
    upstream_timestamp TIMESTAMPTZ,
    observed_at TIMESTAMPTZ NOT NULL,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(snapshot::text) <= 1048576),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_markets_market_data_latest_market
    ON markets_market_data_latest (market_id, freshness_state);
CREATE INDEX idx_markets_market_data_latest_observed
    ON markets_market_data_latest (observed_at);

CREATE TABLE markets_market_data_history (
    token_id TEXT NOT NULL,
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL,
    price TEXT NOT NULL CHECK (price ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    derived BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (token_id, observed_at)
);

CREATE INDEX idx_markets_market_data_history_market_time
    ON markets_market_data_history (market_id, observed_at DESC);

CREATE TABLE markets_market_health_snapshots (
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    token_id TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    freshness_state TEXT NOT NULL CHECK (freshness_state IN ('fresh', 'stale', 'resyncing', 'unavailable', 'invalid')),
    components JSONB NOT NULL CHECK (octet_length(components::text) <= 262144),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (market_id, token_id, algorithm_version, observed_at)
);

CREATE INDEX idx_markets_health_latest
    ON markets_market_health_snapshots (market_id, token_id, observed_at DESC);

CREATE TABLE markets_raw_upstream_events (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    upstream_source TEXT NOT NULL,
    upstream_id TEXT NOT NULL,
    upstream_event_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    payload JSONB NOT NULL CHECK (octet_length(payload::text) <= 1048576),
    observed_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source, upstream_event_id)
);

CREATE UNIQUE INDEX idx_markets_raw_upstream_upstream_tuple
    ON markets_raw_upstream_events (upstream_source, upstream_id);
CREATE INDEX idx_markets_raw_upstream_expiry
    ON markets_raw_upstream_events (expires_at);
CREATE INDEX idx_markets_raw_upstream_entity
    ON markets_raw_upstream_events (entity_type, entity_id, observed_at DESC);

CREATE TABLE markets_sync_checkpoints (
    source TEXT NOT NULL,
    upstream_source TEXT NOT NULL,
    stream TEXT NOT NULL,
    cursor TEXT NOT NULL DEFAULT '',
    high_watermark TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(metadata::text) <= 65536),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source, stream)
);

CREATE TABLE markets_market_signals (
    signal_id TEXT PRIMARY KEY,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('new_market', 'price_move', 'liquidity_change', 'rule_changed')),
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('observed', 'processed', 'confirmed', 'expired', 'retracted')),
    rule_version TEXT NOT NULL,
    reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (octet_length(reason_codes::text) <= 65536),
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    retracted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_markets_signals_market_created
    ON markets_market_signals (market_id, created_at DESC);
CREATE INDEX idx_markets_signals_state_created
    ON markets_market_signals (state, created_at DESC);

CREATE TABLE markets_signal_evidence (
    signal_id TEXT NOT NULL REFERENCES markets_market_signals(signal_id) ON DELETE CASCADE,
    evidence_index INT NOT NULL CHECK (evidence_index >= 0),
    kind TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    content_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (signal_id, evidence_index)
);

CREATE TABLE markets_signal_retractions (
    signal_id TEXT PRIMARY KEY REFERENCES markets_market_signals(signal_id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL,
    evidence_reference_id TEXT NOT NULL,
    retracted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE markets_price_observations (
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    token_id TEXT NOT NULL,
    bucket_start TIMESTAMPTZ NOT NULL,
    bucket_end TIMESTAMPTZ NOT NULL,
    price TEXT NOT NULL CHECK (price ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    best_bid TEXT CHECK (best_bid IS NULL OR best_bid ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    best_ask TEXT CHECK (best_ask IS NULL OR best_ask ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    spread TEXT CHECK (spread IS NULL OR spread ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    snapshot_hash TEXT NOT NULL DEFAULT '',
    rule_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (market_id, token_id, bucket_end)
);

CREATE INDEX idx_markets_price_obs_expiry
    ON markets_price_observations (expires_at);

CREATE TABLE markets_liquidity_observations (
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    token_id TEXT NOT NULL,
    bucket_start TIMESTAMPTZ NOT NULL,
    bucket_end TIMESTAMPTZ NOT NULL,
    total_depth TEXT NOT NULL CHECK (total_depth ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    bid_depth TEXT NOT NULL CHECK (bid_depth ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    ask_depth TEXT NOT NULL CHECK (ask_depth ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    spread TEXT CHECK (spread IS NULL OR spread ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    epsilon TEXT NOT NULL CHECK (epsilon ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    snapshot_hash TEXT NOT NULL DEFAULT '',
    rule_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (market_id, token_id, bucket_end)
);

CREATE INDEX idx_markets_liquidity_obs_expiry
    ON markets_liquidity_observations (expires_at);

CREATE TABLE markets_realtime_recovery (
    token_id TEXT PRIMARY KEY,
    stream_epoch BIGINT NOT NULL DEFAULT 0,
    last_snapshot_hash TEXT NOT NULL DEFAULT '',
    last_validated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE markets_watchlists (
    id UUID PRIMARY KEY,
    owner_wallet_address TEXT NOT NULL CHECK (owner_wallet_address = lower(owner_wallet_address)),
    name TEXT NOT NULL DEFAULT 'default',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_wallet_address, name)
);

CREATE UNIQUE INDEX idx_markets_watchlists_one_default
    ON markets_watchlists (owner_wallet_address)
    WHERE is_default = TRUE;

CREATE INDEX idx_markets_watchlists_owner
    ON markets_watchlists (owner_wallet_address);

CREATE TABLE markets_watchlist_items (
    id UUID PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES markets_watchlists (id) ON DELETE CASCADE,
    item_kind TEXT NOT NULL CHECK (item_kind IN ('event', 'market', 'wallet', 'tag', 'category')),
    target_id TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (watchlist_id, item_kind, target_id)
);

CREATE INDEX idx_markets_watchlist_items_watchlist_sort
    ON markets_watchlist_items (watchlist_id, sort_order);
