# 07 — Database Schema Updates

## 1. Realtime events

```sql
CREATE TABLE realtime_events (
  seq BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL,
  type TEXT NOT NULL,
  scope TEXT NOT NULL,
  user_address TEXT,
  template_id TEXT,
  epoch_id BIGINT,
  block_number BIGINT,
  tx_hash TEXT,
  log_index INT,
  dedupe_key TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_realtime_events_channel_seq ON realtime_events(channel, seq DESC);
CREATE INDEX idx_realtime_events_user_seq ON realtime_events(user_address, seq DESC) WHERE user_address IS NOT NULL;
CREATE UNIQUE INDEX uniq_realtime_events_dedupe ON realtime_events(dedupe_key) WHERE dedupe_key IS NOT NULL;
```

## 2. WebSocket observability

```sql
CREATE TABLE ws_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id TEXT NOT NULL,
  user_address TEXT,
  is_operator BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  last_ping_at TIMESTAMPTZ,
  close_code INT,
  close_reason TEXT
);

CREATE TABLE ws_subscriptions (
  connection_id UUID REFERENCES ws_connections(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  last_seq BIGINT,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (connection_id, channel)
);
```

## 3. Price candles

```sql
CREATE TABLE price_candles (
  feed_id TEXT NOT NULL,
  interval_sec INT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  open_e8 NUMERIC(38,0) NOT NULL,
  high_e8 NUMERIC(38,0) NOT NULL,
  low_e8 NUMERIC(38,0) NOT NULL,
  close_e8 NUMERIC(38,0) NOT NULL,
  source TEXT NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feed_id, interval_sec, bucket_start)
);
```

## 4. Funding intents

```sql
CREATE TABLE funding_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  status TEXT NOT NULL,
  target_currency TEXT NOT NULL DEFAULT 'USD',
  target_amount_decimal TEXT NOT NULL,
  target_usdc_amount NUMERIC(78,0) NOT NULL,
  settlement_chain_id BIGINT NOT NULL,
  settlement_token_address TEXT NOT NULL,
  recommended_route_id TEXT,
  selected_route_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failure_code TEXT,
  failure_message TEXT
);
```

## 5. Funding route options

```sql
CREATE TABLE funding_route_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_intent_id UUID NOT NULL REFERENCES funding_intents(id),
  provider TEXT NOT NULL DEFAULT 'LIFI',
  provider_route_id TEXT NOT NULL,
  source_chain_id BIGINT NOT NULL,
  source_token_address TEXT NOT NULL,
  source_token_symbol TEXT,
  source_token_decimals INT,
  source_amount NUMERIC(78,0) NOT NULL,
  estimated_usdc_received NUMERIC(78,0) NOT NULL,
  min_usdc_received NUMERIC(78,0) NOT NULL,
  estimated_duration_seconds INT,
  route_score NUMERIC(20,8),
  route_snapshot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funding_intent_id, provider, provider_route_id)
);
```

## 6. Destination USDC transfers

```sql
CREATE TABLE destination_usdc_transfers (
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
  credit_status TEXT NOT NULL DEFAULT 'UNMATCHED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chain_id, tx_hash, log_index)
);
```

## 7. Balances

```sql
CREATE TABLE user_balances (
  user_address TEXT PRIMARY KEY,
  usdc_available NUMERIC(78,0) NOT NULL DEFAULT 0,
  usdc_locked NUMERIC(78,0) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (usdc_available >= 0),
  CHECK (usdc_locked >= 0)
);

CREATE TABLE balance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  delta_available NUMERIC(78,0) NOT NULL DEFAULT 0,
  delta_locked NUMERIC(78,0) NOT NULL DEFAULT 0,
  balance_after_available NUMERIC(78,0),
  balance_after_locked NUMERIC(78,0),
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 8. Notify trigger

```sql
CREATE OR REPLACE FUNCTION notify_realtime_event()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('realtime_event', NEW.seq::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_realtime_event
AFTER INSERT ON realtime_events
FOR EACH ROW
EXECUTE FUNCTION notify_realtime_event();
```
