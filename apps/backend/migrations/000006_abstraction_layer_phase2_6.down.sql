DROP TABLE IF EXISTS provider_tools_policy;
DROP TABLE IF EXISTS market_entries;

ALTER TABLE destination_usdc_transfers
    DROP COLUMN IF EXISTS matched_execution_id;

DROP TABLE IF EXISTS route_update_events;
DROP TABLE IF EXISTS funding_executions;
DROP TABLE IF EXISTS wallet_balance_snapshots;

DROP INDEX IF EXISTS uniq_funding_intents_user_nonce;

ALTER TABLE funding_intents
    DROP COLUMN IF EXISTS credited_at,
    DROP COLUMN IF EXISTS credited_amount,
    DROP COLUMN IF EXISTS target_display_amount,
    DROP COLUMN IF EXISTS mode,
    DROP COLUMN IF EXISTS settlement_token_decimals,
    DROP COLUMN IF EXISTS settlement_token_symbol,
    DROP COLUMN IF EXISTS settlement_receiver_address,
    DROP COLUMN IF EXISTS client_nonce;
