DROP INDEX IF EXISTS chain_events_block_log_unique;
ALTER TABLE chain_events DROP COLUMN IF EXISTS block_hash;
DROP TABLE IF EXISTS indexer_blocks;
