# RetroPick Realtime Backend + Frontend Refactor Docs

## Goal

Refactor RetroPick so the web app updates without reload for the components that matter in a prediction market:

- market status
- pool sizes
- implied probabilities
- price charts
- oracle freshness
- deposit status
- user balance
- user positions
- claim availability
- operator health

The correct design is **not** “everything WebSocket.” The correct design is:

```txt
REST/HTTP = snapshots, commands, auth, pagination, history
WebSocket = live UI deltas and async progress
gRPC = internal service-to-service contracts after boundaries stabilize
PostgreSQL = durable truth, audit, replay, reconciliation
Indexer = chain event truth
MarketDataService = high-frequency chart/feed updates
```

## Included files

| File | Purpose |
|---|---|
| `01-system-target-architecture.md` | Target architecture and data ownership |
| `02-api-classification-matrix.md` | REST vs WebSocket vs gRPC classification |
| `03-backend-service-refactor.md` | Go backend service/package refactor |
| `04-realtime-event-model.md` | Event envelope, channels, sequence/replay model |
| `05-websocket-gateway-spec.md` | WebSocket protocol and gateway behavior |
| `06-grpc-internal-service-spec.md` | Internal gRPC service boundaries |
| `07-database-schema-updates.md` | PostgreSQL migrations/schema additions |
| `08-market-data-and-chart-service.md` | Chart/candle/tick architecture |
| `09-deposit-realtime-flow.md` | LI.FI target-USDC funding intent realtime flow |
| `10-frontend-refactor-plan.md` | Next.js component-level update plan |
| `11-frontend-hooks-and-state.md` | React hooks, WS client, local state model |
| `12-operator-dashboard-realtime.md` | Operator realtime channels and panels |
| `13-security-reliability-observability.md` | Security, testing, metrics, alerts |
| `14-rollout-plan.md` | Phased rollout |
| `15-codex-implementation-prompt.md` | Copy-paste implementation prompt |

## Core frontend rule

```txt
1. Fetch REST snapshot
2. Subscribe to WebSocket channels
3. Apply event deltas
4. Reconnect with lastSeq
5. Refetch REST snapshot if sequence gap exists
```

## Core backend rule

```txt
Never broadcast financial state that has not committed to PostgreSQL.
Never credit based only on frontend messages.
Never make WebSocket the source of truth.
```
