-- sqlc schema mirror of Markets V1 migrations (000001–000002)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS markets_catalog_events (
    event_id TEXT PRIMARY KEY,
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_catalog_events_slug
    ON markets_catalog_events (slug) WHERE slug <> '';
CREATE INDEX IF NOT EXISTS idx_markets_catalog_events_status_end
    ON markets_catalog_events (status, end_at DESC, event_id);
CREATE INDEX IF NOT EXISTS idx_markets_catalog_events_observed
    ON markets_catalog_events (observed_at DESC);

CREATE TABLE IF NOT EXISTS markets_catalog_markets (
    market_id TEXT PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_markets_catalog_markets_event
    ON markets_catalog_markets (event_id, status);
CREATE INDEX IF NOT EXISTS idx_markets_catalog_markets_status_end
    ON markets_catalog_markets (status, end_at DESC, market_id);

CREATE TABLE IF NOT EXISTS markets_catalog_outcomes (
    outcome_id TEXT PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_markets_catalog_outcomes_market
    ON markets_catalog_outcomes (market_id, outcome_index);

CREATE TABLE IF NOT EXISTS markets_catalog_rules (
    market_id TEXT PRIMARY KEY REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    resolution_source_name TEXT NOT NULL DEFAULT '',
    resolution_source_url TEXT NOT NULL DEFAULT '',
    content_hash TEXT NOT NULL,
    upstream_updated_at TIMESTAMPTZ,
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS markets_market_data_latest (
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

CREATE INDEX IF NOT EXISTS idx_markets_market_data_latest_market
    ON markets_market_data_latest (market_id, freshness_state);
CREATE INDEX IF NOT EXISTS idx_markets_market_data_latest_observed
    ON markets_market_data_latest (observed_at);

CREATE TABLE IF NOT EXISTS markets_market_data_history (
    token_id TEXT NOT NULL,
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL,
    price TEXT NOT NULL CHECK (price ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    derived BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (token_id, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_markets_market_data_history_market_time
    ON markets_market_data_history (market_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS markets_market_health_snapshots (
    market_id TEXT NOT NULL REFERENCES markets_catalog_markets(market_id) ON DELETE CASCADE,
    token_id TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    freshness_state TEXT NOT NULL CHECK (freshness_state IN ('fresh', 'stale', 'resyncing', 'unavailable', 'invalid')),
    components JSONB NOT NULL CHECK (octet_length(components::text) <= 262144),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (market_id, token_id, algorithm_version, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_markets_health_latest
    ON markets_market_health_snapshots (market_id, token_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS markets_raw_upstream_events (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_markets_raw_upstream_expiry
    ON markets_raw_upstream_events (expires_at);
CREATE INDEX IF NOT EXISTS idx_markets_raw_upstream_entity
    ON markets_raw_upstream_events (entity_type, entity_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS markets_sync_checkpoints (
    source TEXT NOT NULL,
    stream TEXT NOT NULL,
    cursor TEXT NOT NULL DEFAULT '',
    high_watermark TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(metadata::text) <= 65536),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source, stream)
);

CREATE TABLE IF NOT EXISTS markets_market_signals (
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

CREATE INDEX IF NOT EXISTS idx_markets_signals_market_created
    ON markets_market_signals (market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_signals_state_created
    ON markets_market_signals (state, created_at DESC);

CREATE TABLE IF NOT EXISTS markets_signal_evidence (
    signal_id TEXT NOT NULL REFERENCES markets_market_signals(signal_id) ON DELETE CASCADE,
    evidence_index INT NOT NULL CHECK (evidence_index >= 0),
    kind TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    content_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (signal_id, evidence_index)
);

CREATE TABLE IF NOT EXISTS markets_signal_retractions (
    signal_id TEXT PRIMARY KEY REFERENCES markets_market_signals(signal_id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL,
    evidence_reference_id TEXT NOT NULL,
    retracted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Markets V1 Phase 1.3: sampled observations for deterministic signals

CREATE TABLE IF NOT EXISTS markets_price_observations (
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

CREATE INDEX IF NOT EXISTS idx_markets_price_obs_expiry
    ON markets_price_observations (expires_at);

CREATE TABLE IF NOT EXISTS markets_liquidity_observations (
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

CREATE INDEX IF NOT EXISTS idx_markets_liquidity_obs_expiry
    ON markets_liquidity_observations (expires_at);

CREATE TABLE IF NOT EXISTS markets_realtime_recovery (
    token_id TEXT PRIMARY KEY,
    stream_epoch BIGINT NOT NULL DEFAULT 0,
    last_snapshot_hash TEXT NOT NULL DEFAULT '',
    last_validated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
