# 03 — Backend Service Refactor

## 1. Target Go layout

```txt
cmd/
  api/
  indexer/
  keeper/
  oracle/
  reporter/
  alert/
  marketdata/

internal/
  transport/
    rest/
    ws/
    grpc/
  app/
    markets/
    epochs/
    positions/
    balances/
    funding/
    deposits/
    claims/
    oracle/
    keeper/
    ops/
  realtime/
    envelope.go
    channels.go
    publisher.go
    replay.go
    hub.go
  events/
    store.go
    outbox.go
  db/
    pool.go
    tx.go
    queries/
    migrations/
  chain/
    evm/
    bindings/
  integrations/
    lifi/
    chainlink/
    binance/
  security/
    siwe/
    jwt/
    permissions/
  observability/
```

## 2. Service responsibilities

### `retropick-api`

```txt
REST API
WebSocket gateway
Auth/session
Public app API
Operator API
REST snapshot reads
Command orchestration
Event replay
```

### `retropick-indexer`

```txt
Read Base logs
Decode MarketEngine events
Update epochs/positions/pools
Insert realtime_events
Handle reorgs
```

### `retropick-marketdata`

```txt
Subscribe/poll UX price sources
Normalize ticks
Build candles
Persist candles
Publish chart events
```

### `retropick-deposit-worker`

```txt
Track LI.FI funding intent status
Index destination USDC transfers
Match transfers to intents
Credit balances idempotently
Emit deposit/balance events
```

### `retropick-keeper`

```txt
Lifecycle schedule
Preflight checks
Transaction broadcast
Keeper execution logging
Post-execution validation
```

## 3. Handler pattern

Bad:

```go
func handler(w http.ResponseWriter, r *http.Request) {
  // parse, validate, call provider, mutate db, broadcast
}
```

Good:

```go
func (h *FundingHandler) CreateIntent(w http.ResponseWriter, r *http.Request) {
  input := decode(r)
  result, err := h.service.CreateIntent(r.Context(), input)
  respond(w, result, err)
}
```

Business logic belongs in services, not handlers.

## 4. Event publishing pattern

```txt
DB transaction:
  1. mutate domain table
  2. insert realtime_events row
  3. insert audit row if needed
  4. commit

After commit:
  5. pg_notify event seq
  6. WS gateway loads event
  7. gateway broadcasts to subscribers
```

## 5. Transaction boundaries

Use DB transactions for:

```txt
deposit credit
balance debit
market entry
claim credit
withdrawal debit
funding state transition
keeper execution log
chain event indexing per block
```

## 6. DB queue pattern

```sql
SELECT *
FROM funding_intents
WHERE status IN ('SOURCE_TX_SUBMITTED', 'BRIDGING')
  AND next_check_at <= now()
ORDER BY next_check_at ASC
LIMIT 10
FOR UPDATE SKIP LOCKED;
```

Use this before adding Redis/Kafka.

## 7. Error model

```json
{
  "error": {
    "code": "QUOTE_EXPIRED",
    "message": "This route quote expired. Refresh to get a new route.",
    "details": {}
  }
}
```

Common codes:

```txt
UNAUTHORIZED
FORBIDDEN
INVALID_ADDRESS
UNSUPPORTED_CHAIN
UNSUPPORTED_TOKEN
AMOUNT_TOO_LOW
AMOUNT_TOO_HIGH
QUOTE_EXPIRED
ROUTE_UNAVAILABLE
INSUFFICIENT_BALANCE
MARKET_LOCKED
SOURCE_TX_FAILED
DESTINATION_NOT_VERIFIED
DUPLICATE_CREDIT_ATTEMPT
SEQUENCE_GAP
RATE_LIMITED
INTERNAL_ERROR
```
