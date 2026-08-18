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
