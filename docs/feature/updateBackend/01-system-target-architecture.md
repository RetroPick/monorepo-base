# 01 — Target System Architecture

REST = snapshots, commands, auth, pagination, history
WebSocket = live component updates and async progress
gRPC = internal service contracts later
PostgreSQL = durable state, audit, replay, reconciliation

## 1. Current stack assessment

The current stack is a strong lean production architecture:

```txt
Go API server
PostgreSQL 16
PostgreSQL LISTEN/NOTIFY
Chain indexer
Keeper service
Oracle monitor
TrustedReporter
Alert dispatcher
Next.js frontend
Nginx
systemd
```

The refactor should sharpen boundaries, not replace everything.

## 2. Target architecture

```txt
Browser
  ├─ REST snapshots
  ├─ WebSocket live deltas
  └─ Wallet transactions
        │
        ▼
retropick-api
  ├─ REST handlers
  ├─ WebSocket gateway
  ├─ auth/session
  ├─ event replay
  └─ operator API
        │
        ▼
PostgreSQL
  ├─ market state
  ├─ positions
  ├─ balances
  ├─ chain events
  ├─ realtime_events
  ├─ candles
  └─ audit/ops tables
        ▲
        │
Workers/services
  ├─ ChainIndexer
  ├─ DestinationUsdcIndexer
  ├─ DepositCreditWorker
  ├─ MarketDataService
  ├─ Keeper
  ├─ OracleMonitor
  └─ AlertDispatcher
```

## 3. Data ownership

| Layer | Owns |
|---|---|
| Chain | final settlement proof |
| PostgreSQL | indexed durable app truth |
| Realtime event store | replayable UI deltas |
| WebSocket | delivery only |
| Frontend cache | temporary UI state |
| MarketDataService | non-settlement chart UX |
| Keeper | epoch lifecycle execution |
| OracleMonitor | feed health and freshness |

## 4. Main rule

```txt
REST gives the frontend the snapshot.
WebSocket keeps the snapshot alive.
PostgreSQL proves what happened.
Chain proves what settled.
```

## 5. What should feel realtime

```txt
Market cards
Market detail header
Epoch status
Pool bars
Implied probabilities
Price chart latest candle
Oracle badge
Deposit progress
User balance
User positions
Claim availability
Operator health dashboard
```

## 6. What should remain REST

```txt
Auth
History
Pagination
Search
Market list initial load
Market detail initial load
Chart historical candles
Portfolio initial load
Audit logs
Admin forms
Supported assets
```

## 7. Internal gRPC

Do not expose gRPC to the browser.

Use gRPC later for:

```txt
MarketStateService
DepositService
MarketDataService
OracleStateService
KeeperService
RealtimeEventService
```

Start with Go interfaces first. Add gRPC only after process boundaries stabilize.
