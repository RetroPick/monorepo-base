# 14 — Rollout Plan

## Phase 0 — Inventory

```txt
List current REST endpoints
List frontend components needing live updates
List chain events
List DB tables and indexes
List wallet/deposit flows
```

Exit:

```txt
API classification accepted
channel taxonomy accepted
```

## Phase 1 — Realtime foundation

Build:

```txt
realtime_events table
EventEnvelope type
RealtimePublisher
NOTIFY trigger
WebSocket gateway
subscribe/unsubscribe/ping/resume
channel auth
event replay
```

Exit:

```txt
Frontend receives test event and reconnect replay works.
```

## Phase 2 — Market live updates

Build:

```txt
pool_update
epoch_opened
epoch_locked
epoch_resolved
position_update
claimable_update
```

Exit:

```txt
Market page updates without reload after indexed tx.
```

## Phase 3 — User updates

Build:

```txt
user:{address} channel
balance_update
position_update
claimable_update
portfolio live updates
```

Exit:

```txt
Balance and position update live.
```

## Phase 4 — LI.FI deposit realtime

Build:

```txt
funding_intents
route options
deposit channel
destination USDC indexer
credit worker
balance event
DepositModal target amount flow
```

Exit:

```txt
User enters $25, confirms route, sees progress, receives balance update.
```

## Phase 5 — Market data service

Build:

```txt
price_candles
MarketDataService
chart REST endpoint
chart WS channel
PriceChart live updates
```

Exit:

```txt
Chart updates without reload.
```

## Phase 6 — Operator realtime

Build:

```txt
ops channels
keeper/oracle/indexer events
incident live panel
stuck deposit panel
```

Exit:

```txt
Operator dashboard shows live health.
```

## Phase 7 — gRPC

Only after boundaries stabilize.

Build:

```txt
MarketStateService
DepositService
MarketDataService
OracleStateService
KeeperService
RealtimeEventService
```

## Do not do early

```txt
Do not add Kafka.
Do not expose gRPC to browser.
Do not use WebSocket for initial full snapshots.
Do not send timer ticks every second.
Do not persist every raw price tick.
Do not trust frontend-submitted amounts.
```
