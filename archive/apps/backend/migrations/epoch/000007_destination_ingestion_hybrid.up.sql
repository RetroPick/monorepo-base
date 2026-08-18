CREATE TABLE IF NOT EXISTS funding_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    execution_id UUID REFERENCES funding_executions(id) ON DELETE SET NULL,
    event_type TEXT,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS destination_transfer_indexer_state (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    last_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO destination_transfer_indexer_state (id, last_block)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE destination_usdc_transfers
    ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'POLLER',
    ADD COLUMN IF NOT EXISTS webhook_event_id UUID REFERENCES funding_webhook_events(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS provider_execution_ref TEXT,
    ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS match_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_destination_transfers_unmatched
    ON destination_usdc_transfers (credit_status, created_at)
    WHERE credit_status = 'UNMATCHED';

CREATE INDEX IF NOT EXISTS idx_destination_transfers_provider_execution_ref
    ON destination_usdc_transfers (provider_execution_ref)
    WHERE provider_execution_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_funding_executions_destination_tx_hash
    ON funding_executions (destination_tx_hash)
    WHERE destination_tx_hash IS NOT NULL;
