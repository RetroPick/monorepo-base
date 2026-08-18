CREATE TABLE IF NOT EXISTS fee_route_batches (
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

CREATE INDEX IF NOT EXISTS idx_fee_route_batches_created ON fee_route_batches (created_at DESC);
