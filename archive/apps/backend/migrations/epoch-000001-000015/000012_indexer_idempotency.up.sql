CREATE TABLE IF NOT EXISTS indexer_blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL,
    parent_hash BYTEA NOT NULL,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chain_events ADD COLUMN IF NOT EXISTS block_hash BYTEA;

CREATE UNIQUE INDEX IF NOT EXISTS chain_events_block_log_unique
    ON chain_events (block_hash, log_index)
    WHERE block_hash IS NOT NULL;
