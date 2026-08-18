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

