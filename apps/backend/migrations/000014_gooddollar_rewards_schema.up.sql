CREATE TABLE IF NOT EXISTS gooddollar_user_status (
    wallet BYTEA PRIMARY KEY,
    goodid_verified BOOLEAN NOT NULL DEFAULT false,
    root_wallet BYTEA,
    last_checked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS referral_bindings (
    referee_wallet BYTEA PRIMARY KEY,
    referrer_wallet BYTEA NOT NULL,
    referral_code TEXT NOT NULL,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fee_events (
    id BIGSERIAL PRIMARY KEY,
    tx_hash BYTEA NOT NULL,
    log_index INT NOT NULL,
    market_id BYTEA NOT NULL,
    trader_wallet BYTEA NOT NULL,
    token_address BYTEA NOT NULL,
    fee_amount NUMERIC(78, 0) NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS referral_reward_events (
    id BIGSERIAL PRIMARY KEY,
    fee_event_id BIGINT NOT NULL REFERENCES fee_events(id),
    referrer_wallet BYTEA NOT NULL,
    trader_wallet BYTEA NOT NULL,
    level INT NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    status TEXT NOT NULL DEFAULT 'claimable',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (fee_event_id, referrer_wallet, level)
);

CREATE TABLE IF NOT EXISTS reward_ledger_events (
    id BIGSERIAL PRIMARY KEY,
    wallet BYTEA NOT NULL,
    quest_id TEXT NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    token_address BYTEA NOT NULL,
    status TEXT NOT NULL DEFAULT 'claimable',
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_claims (
    id BIGSERIAL PRIMARY KEY,
    wallet BYTEA NOT NULL,
    reward_ledger_event_id BIGINT REFERENCES reward_ledger_events(id),
    claim_nonce TEXT NOT NULL UNIQUE,
    payload_hash BYTEA NOT NULL,
    tx_hash BYTEA,
    status TEXT NOT NULL DEFAULT 'prepared',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_daily_metrics (
    day DATE PRIMARY KEY,
    gusd_volume NUMERIC(78, 0) NOT NULL DEFAULT 0,
    gusd_fees NUMERIC(78, 0) NOT NULL DEFAULT 0,
    unique_users INT NOT NULL DEFAULT 0,
    verified_users INT NOT NULL DEFAULT 0,
    rewards_claimed NUMERIC(78, 0) NOT NULL DEFAULT 0,
    markets_resolved INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_referral_bindings_referrer ON referral_bindings (referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_fee_events_trader ON fee_events (trader_wallet, block_number DESC);
