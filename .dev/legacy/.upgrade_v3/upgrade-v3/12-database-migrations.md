# 12 — Database Migrations

## V3 Migration Groups

### 0002 Idempotency

```sql
CREATE TABLE IF NOT EXISTS indexer_blocks (
  block_number BIGINT PRIMARY KEY,
  block_hash BYTEA NOT NULL,
  parent_hash BYTEA NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chain_events
  ADD CONSTRAINT IF NOT EXISTS chain_events_log_unique UNIQUE (block_hash, log_index);

CREATE TABLE IF NOT EXISTS keeper_executions (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key BYTEA NOT NULL UNIQUE,
  template_id TEXT NOT NULL,
  epoch_id BIGINT,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  tx_hash BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
```

### 0003 Reporter

```sql
CREATE TABLE IF NOT EXISTS reporter_identity (
  id BIGSERIAL PRIMARY KEY,
  address BYTEA NOT NULL UNIQUE,
  pubkey BYTEA,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reporter_submissions (
  id BIGSERIAL PRIMARY KEY,
  template_id TEXT NOT NULL,
  epoch_id BIGINT NOT NULL,
  reporter_id BIGINT NOT NULL REFERENCES reporter_identity(id),
  outcome JSONB NOT NULL,
  evidence JSONB NOT NULL,
  evidence_hash BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  nonce BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, epoch_id, reporter_id, nonce)
);

CREATE TABLE IF NOT EXISTS reporter_audit_log (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT REFERENCES reporter_submissions(id),
  actor_id BIGINT REFERENCES reporter_identity(id),
  action TEXT NOT NULL,
  reason TEXT,
  tx_hash BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 0004 GoodDollar / Rewards

```sql
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
  fee_amount NUMERIC(78,0) NOT NULL,
  block_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS referral_reward_events (
  id BIGSERIAL PRIMARY KEY,
  fee_event_id BIGINT NOT NULL REFERENCES fee_events(id),
  referrer_wallet BYTEA NOT NULL,
  trader_wallet BYTEA NOT NULL,
  level INT NOT NULL,
  amount NUMERIC(78,0) NOT NULL,
  status TEXT NOT NULL DEFAULT 'claimable',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fee_event_id, referrer_wallet, level)
);

CREATE TABLE IF NOT EXISTS impact_daily_metrics (
  day DATE PRIMARY KEY,
  gusd_volume NUMERIC(78,0) NOT NULL DEFAULT 0,
  gusd_fees NUMERIC(78,0) NOT NULL DEFAULT 0,
  unique_users INT NOT NULL DEFAULT 0,
  verified_users INT NOT NULL DEFAULT 0,
  rewards_claimed NUMERIC(78,0) NOT NULL DEFAULT 0,
  markets_resolved INT NOT NULL DEFAULT 0
);
```
