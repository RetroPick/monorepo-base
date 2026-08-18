DROP INDEX IF EXISTS idx_funding_executions_destination_tx_hash;
DROP INDEX IF EXISTS idx_destination_transfers_provider_execution_ref;
DROP INDEX IF EXISTS idx_destination_transfers_unmatched;

ALTER TABLE destination_usdc_transfers
    DROP COLUMN IF EXISTS match_metadata,
    DROP COLUMN IF EXISTS match_confidence,
    DROP COLUMN IF EXISTS provider_execution_ref,
    DROP COLUMN IF EXISTS webhook_event_id,
    DROP COLUMN IF EXISTS provenance;

DROP TABLE IF EXISTS funding_webhook_events;
DROP TABLE IF EXISTS destination_transfer_indexer_state;
