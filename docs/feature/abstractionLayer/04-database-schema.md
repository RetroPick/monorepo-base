# 04 — Database Schema

Assumes PostgreSQL. Store all token amounts in integer base units as `NUMERIC(78, 0)` or `BIGINT` where safe.

## 1. funding_intents

```sql
CREATE TABLE funding_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_address TEXT NOT NULL,
  client_nonce TEXT,

  target_currency TEXT NOT NULL DEFAULT 'USD',
  target_display_amount TEXT NOT NULL,
  target_usdc_amount NUMERIC(78,0) NOT NULL,

  settlement_chain_id BIGINT NOT NULL,
  settlement_token_address TEXT NOT NULL,
  settlement_token_symbol TEXT NOT NULL DEFAULT 'USDC',
  settlement_token_decimals INT NOT NULL DEFAULT 6,
  settlement_receiver_address TEXT NOT NULL,

  mode TEXT NOT NULL DEFAULT 'AUTO_BEST_SOURCE',
  status TEXT NOT NULL,

  recommended_option_id UUID,
  selected_option_id UUID,

  expires_at TIMESTAMPTZ NOT NULL,
  credited_amount NUMERIC(78,0) NOT NULL DEFAULT 0,
  credited_at TIMESTAMPTZ,

  failure_code TEXT,
  failure_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_address, client_nonce)
);

CREATE INDEX idx_funding_intents_user_created
  ON funding_intents (user_address, created_at DESC);

CREATE INDEX idx_funding_intents_status
  ON funding_intents (status);
```

## 2. wallet_balance_snapshots

```sql
CREATE TABLE wallet_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  funding_intent_id UUID NOT NULL REFERENCES funding_intents(id),
  user_address TEXT NOT NULL,

  chain_id BIGINT NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  token_decimals INT,
  balance_amount NUMERIC(78,0) NOT NULL,
  estimated_usd_value NUMERIC(38, 12),

  source TEXT NOT NULL,
  raw_snapshot JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_balance_snapshots_intent
  ON wallet_balance_snapshots (funding_intent_id);
```

## 3. funding_options

```sql
CREATE TABLE funding_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  funding_intent_id UUID NOT NULL REFERENCES funding_intents(id),
  provider TEXT NOT NULL DEFAULT 'LIFI',

  status TEXT NOT NULL,

  source_chain_id BIGINT NOT NULL,
  source_token_address TEXT NOT NULL,
  source_token_symbol TEXT,
  source_token_decimals INT,
  source_required_amount NUMERIC(78,0) NOT NULL,
  source_balance_amount NUMERIC(78,0),

  destination_chain_id BIGINT NOT NULL,
  destination_token_address TEXT NOT NULL,
  estimated_to_amount NUMERIC(78,0) NOT NULL,
  min_to_amount NUMERIC(78,0) NOT NULL,

  estimated_duration_seconds INT,
  estimated_gas_usd NUMERIC(38, 12),
  estimated_fee_usd NUMERIC(38, 12),
  price_impact_pct NUMERIC(18, 8),
  slippage_pct NUMERIC(18, 8),

  score INT,
  rank INT,

  route_id TEXT,
  route_snapshot JSONB NOT NULL,
  route_summary JSONB,

  expires_at TIMESTAMPTZ NOT NULL,
  failure_code TEXT,
  failure_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_funding_options_intent_rank
  ON funding_options (funding_intent_id, rank);

CREATE INDEX idx_funding_options_status
  ON funding_options (status);
```

## 4. funding_executions

```sql
CREATE TABLE funding_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  funding_intent_id UUID NOT NULL REFERENCES funding_intents(id),
  funding_option_id UUID NOT NULL REFERENCES funding_options(id),

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

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_funding_execution_source_tx
  ON funding_executions (source_chain_id, source_tx_hash)
  WHERE source_tx_hash IS NOT NULL;

CREATE INDEX idx_funding_executions_status
  ON funding_executions (status);
```

## 5. route_update_events

```sql
CREATE TABLE route_update_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  funding_execution_id UUID NOT NULL REFERENCES funding_executions(id),
  provider TEXT NOT NULL,
  status TEXT,
  step_index INT,
  process_type TEXT,
  chain_id BIGINT,
  tx_hash TEXT,

  payload JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_update_events_execution
  ON route_update_events (funding_execution_id, created_at);
```

## 6. destination_transfers

```sql
CREATE TABLE destination_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  chain_id BIGINT NOT NULL,
  token_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INT NOT NULL,

  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount NUMERIC(78,0) NOT NULL,

  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMPTZ,

  matched_funding_intent_id UUID REFERENCES funding_intents(id),
  matched_execution_id UUID REFERENCES funding_executions(id),

  credit_status TEXT NOT NULL DEFAULT 'UNMATCHED',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_destination_transfer_event
  ON destination_transfers (chain_id, tx_hash, log_index);

CREATE INDEX idx_destination_transfers_receiver
  ON destination_transfers (to_address, block_number DESC);
```

## 7. user_balances

```sql
CREATE TABLE user_balances (
  user_address TEXT PRIMARY KEY,

  usdc_available NUMERIC(78,0) NOT NULL DEFAULT 0,
  usdc_locked NUMERIC(78,0) NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (usdc_available >= 0),
  CHECK (usdc_locked >= 0)
);
```

## 8. balance_ledger

```sql
CREATE TABLE balance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_address TEXT NOT NULL,

  asset_chain_id BIGINT NOT NULL,
  asset_token_address TEXT NOT NULL,
  asset_symbol TEXT NOT NULL DEFAULT 'USDC',

  delta_available NUMERIC(78,0) NOT NULL DEFAULT 0,
  delta_locked NUMERIC(78,0) NOT NULL DEFAULT 0,

  balance_after_available NUMERIC(78,0),
  balance_after_locked NUMERIC(78,0),

  reason TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,

  idempotency_key TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_balance_ledger_idempotency
  ON balance_ledger (idempotency_key);

CREATE INDEX idx_balance_ledger_user_created
  ON balance_ledger (user_address, created_at DESC);
```

Ledger reasons:

```txt
TARGET_INTENT_DEPOSIT_CREDIT
DIRECT_USDC_DEPOSIT_CREDIT
MARKET_ENTRY_DEBIT
MARKET_PAYOUT_CREDIT
MARKET_REFUND_CREDIT
WITHDRAWAL_DEBIT
ADMIN_ADJUSTMENT
```

## 9. market_entries

```sql
CREATE TABLE market_entries (
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

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_entries_user_created
  ON market_entries (user_address, created_at DESC);

CREATE INDEX idx_market_entries_market
  ON market_entries (market_id);
```

## 10. provider_tools_policy

```sql
CREATE TABLE provider_tools_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider TEXT NOT NULL,
  tool_key TEXT NOT NULL,
  tool_type TEXT NOT NULL,
  status TEXT NOT NULL,

  risk_score INT,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(provider, tool_key)
);
```

## 11. Reconciliation queries

### Vault solvency

```sql
SELECT
  SUM(usdc_available + usdc_locked) AS total_liabilities
FROM user_balances;
```

Compare this to on-chain vault USDC balance.

### Credited intent without ledger

```sql
SELECT fi.*
FROM funding_intents fi
LEFT JOIN balance_ledger bl
  ON bl.reference_id = fi.id::text
 AND bl.reason = 'TARGET_INTENT_DEPOSIT_CREDIT'
WHERE fi.status = 'CREDITED'
  AND bl.id IS NULL;
```

### Duplicate transfer matching

```sql
SELECT matched_funding_intent_id, COUNT(*)
FROM destination_transfers
WHERE matched_funding_intent_id IS NOT NULL
GROUP BY matched_funding_intent_id
HAVING COUNT(*) > 1;
```
