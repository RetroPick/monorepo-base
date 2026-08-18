ALTER TABLE funding_intents
    ADD COLUMN IF NOT EXISTS client_nonce TEXT,
    ADD COLUMN IF NOT EXISTS settlement_receiver_address VARCHAR(42),
    ADD COLUMN IF NOT EXISTS settlement_token_symbol TEXT NOT NULL DEFAULT 'USDC',
    ADD COLUMN IF NOT EXISTS settlement_token_decimals INT NOT NULL DEFAULT 6,
    ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'AUTO_BEST_SOURCE',
    ADD COLUMN IF NOT EXISTS target_display_amount TEXT,
    ADD COLUMN IF NOT EXISTS credited_amount NUMERIC(78,0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ;

UPDATE funding_intents
SET target_display_amount = target_amount_decimal
WHERE target_display_amount IS NULL;

ALTER TABLE funding_intents
    ALTER COLUMN target_display_amount SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_funding_intents_user_nonce
    ON funding_intents (LOWER(user_address), client_nonce)
    WHERE client_nonce IS NOT NULL;

CREATE TABLE IF NOT EXISTS wallet_balance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_intent_id UUID NOT NULL REFERENCES funding_intents(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    chain_id BIGINT NOT NULL,
    token_address TEXT NOT NULL,
    token_symbol TEXT,
    token_decimals INT,
    balance_amount NUMERIC(78,0) NOT NULL,
    estimated_usd_value NUMERIC(38, 12),
    source TEXT NOT NULL,
    raw_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_balance_snapshots_intent
    ON wallet_balance_snapshots (funding_intent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS funding_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_intent_id UUID NOT NULL REFERENCES funding_intents(id) ON DELETE CASCADE,
    funding_route_option_id UUID NOT NULL REFERENCES funding_route_options(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'LIFI',
    status TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    client_route_execution_id TEXT,
    source_chain_id BIGINT NOT NULL,
    source_token_address TEXT NOT NULL,
    source_amount NUMERIC(78,0) NOT NULL,
    destination_chain_id BIGINT NOT NULL,
    destination_token_address TEXT NOT NULL,
    expected_usdc_amount NUMERIC(78,0) NOT NULL,
    min_usdc_amount NUMERIC(78,0) NOT NULL,
    source_tx_hash TEXT,
    destination_tx_hash TEXT,
    provider_status JSONB,
    route_snapshot JSONB NOT NULL,
    failure_code TEXT,
    failure_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_funding_execution_source_tx
    ON funding_executions (source_chain_id, source_tx_hash)
    WHERE source_tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_funding_executions_status
    ON funding_executions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS route_update_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_execution_id UUID NOT NULL REFERENCES funding_executions(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT,
    step_index INT,
    process_type TEXT,
    chain_id BIGINT,
    tx_hash TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_update_events_execution
    ON route_update_events (funding_execution_id, created_at ASC);

ALTER TABLE destination_usdc_transfers
    ADD COLUMN IF NOT EXISTS matched_execution_id UUID REFERENCES funding_executions(id);

CREATE TABLE IF NOT EXISTS market_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    outcome_id INT NOT NULL,
    amount NUMERIC(78,0) NOT NULL,
    funding_intent_id UUID REFERENCES funding_intents(id),
    status TEXT NOT NULL,
    tx_hash TEXT,
    chain_id BIGINT,
    failure_code TEXT,
    failure_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_entries_user_created
    ON market_entries (LOWER(user_address), created_at DESC);

CREATE TABLE IF NOT EXISTS provider_tools_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    tool_key TEXT NOT NULL,
    tool_type TEXT NOT NULL,
    status TEXT NOT NULL,
    risk_score INT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, tool_key)
);
