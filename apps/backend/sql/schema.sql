-- sqlc schema mirror of migrations (000001_init)
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

-- Omitted from public /api/v1/markets; see migrations/000002_frontend_hidden.up.sql
CREATE TABLE frontend_hidden_templates (
    template_id BYTEA PRIMARY KEY REFERENCES templates (template_id) ON DELETE CASCADE,
    hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
