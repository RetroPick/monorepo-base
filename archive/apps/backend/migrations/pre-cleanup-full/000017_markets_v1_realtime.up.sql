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
    epsilon DOUBLE PRECISION NOT NULL,
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
