# 04 — Realtime Event Model

## 1. Event envelope

```json
{
  "seq": 184920,
  "type": "pool_update",
  "channel": "market:btc-direction-1h",
  "scope": "public",
  "templateId": "0xabc",
  "epochId": 42,
  "blockNumber": 29100221,
  "txHash": "0x...",
  "createdAt": "2026-05-02T12:01:02.000Z",
  "payload": {
    "outcomePools": ["10000000", "12000000"],
    "totalPool": "22000000"
  }
}
```

## 2. Required fields

```txt
seq
type
channel
scope
createdAt
payload
```

Optional fields:

```txt
templateId
epochId
userAddress
blockNumber
txHash
logIndex
dedupeKey
```

## 3. Table

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

CREATE INDEX idx_realtime_events_channel_seq
  ON realtime_events(channel, seq DESC);

CREATE INDEX idx_realtime_events_user_seq
  ON realtime_events(user_address, seq DESC)
  WHERE user_address IS NOT NULL;

CREATE UNIQUE INDEX uniq_realtime_events_dedupe
  ON realtime_events(dedupe_key)
  WHERE dedupe_key IS NOT NULL;
```

## 4. Notify by sequence only

Bad:

```sql
pg_notify('market_update', huge_json_payload)
```

Good:

```sql
pg_notify('realtime_event', '184920')
```

The WebSocket gateway loads the event row from PostgreSQL.

## 5. Reconnect protocol

Client sends:

```json
{
  "type": "subscribe",
  "channels": ["market:btc-direction-1h"],
  "lastSeq": 184900
}
```

Server:

```txt
if replay available:
  send missed events
else:
  send resync_required
```

## 6. Event groups

Market:

```txt
epoch_opened
epoch_locked
epoch_resolved
epoch_cancelled
pool_update
probability_update
volume_update
```

Oracle/chart:

```txt
price_tick
candle_updated
oracle_tick
oracle_stale
oracle_recovered
checkpoint_written
```

User:

```txt
deposit_credited
balance_update
position_update
claimable_update
claim_confirmed
withdrawal_update
```

Operator:

```txt
keeper_tx_failed
buffer_pressure
rolling_halted
indexer_lag_update
incident_opened
```
