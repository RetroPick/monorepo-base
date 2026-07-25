# Backend architecture (as implemented)

This doc maps the backend modules under `apps/backend/internal/` and clarifies **sources of truth**: what is derived vs canonical.

## Service boundaries (process level)

- **API**: `apps/backend/cmd/api/main.go`
  - HTTP (REST) routes + websocket endpoint `/ws`.
  - Runs background workers for funding lifecycle (credit/matcher/destination poller).
  - Runs a Postgres LISTEN bridge that feeds the in-memory websocket hub.
- **Indexer**: `apps/backend/cmd/indexer/main.go`
  - Pulls chain logs, persists canonical chain event rows, updates projections/read models, emits realtime envelopes.
- **Price worker**: `apps/backend/cmd/price-worker/main.go`
  - Polls curated Chainlink proxies outside request paths, persists feed health, ingests candles, and emits chart realtime envelopes.
- **Keeper**: `apps/backend/cmd/keeper/main.go`
  - DB-backed scheduler + hot-wallet executor for epoch lifecycle calls.
  - Enabled only when `KEEPER_ENABLED=1`.
- **Migrator**: `apps/backend/cmd/migrator/main.go`
  - Applies embedded migrations.

## Module map (`apps/backend/internal/*`)

### `internal/api`
HTTP handlers + middleware:

- **Auth**: cookie session and/or Bearer JWT principal extraction.
  - `internal/api/authn.go`, `internal/api/auth_session.go`, `internal/api/auth_routes.go`
- **CORS**: strict mode for prod, permissive localhost-any-port for dev.
  - `internal/api/cors.go`
- **Rate limiting**: in-memory per-IP budgets (not shared across replicas).
  - `internal/api/rate_limit.go`
- **Health & metrics**: `internal/api/health.go`
- **Routers**: ops, tx prepare/submit, funding (v1 + abstraction v2), “me”, wallet binding, watchlist, portfolio summary, etc.

### `internal/indexer`
Indexer core logic:

- Reads logs from the MarketEngine proxy address.
- Persists **canonical event log** into `chain_events`.
- Maintains `indexer_state` and continuity checking / rewind on reorg.
- Produces derived tables used for fast API reads, and emits durable realtime events.

Main file: `internal/indexer/indexer.go`.

### `internal/realtime`
Durable realtime envelopes and Postgres notify:

- Inserts envelope rows into `realtime_events` with an optional `dedupe_key`.
- Emits `pg_notify('realtime_event', seq)` where `seq` is the inserted row’s sequence.
- Loads envelopes by seq or by range (`afterSeq`).

Main file: `internal/realtime/realtime.go`.

### `internal/priceworker` + `internal/marketdata`

Persistent Chainlink market-data ingestion:

- `internal/priceworker` polls curated proxy feeds and preserves Chainlink phase-encoded `uint80` round ids losslessly.
- `internal/marketdata` stores feed health and candles, then emits durable chart update envelopes.
- Public API chart reads serve Postgres projections; they do not poll RPC inside request handlers.

### `internal/pglisten` + `internal/wshub`
Bridges Postgres notify → in-memory broadcast:

- `internal/pglisten/pglisten.go` connects to Postgres, `LISTEN realtime_event`, then bulk-loads any missing envelopes and broadcasts them to the `wshub` hub.
- `internal/wshub/hub.go` is a simple fanout hub with per-client subscription sets.

### `internal/keeper`
Lifecycle automation for templates/epochs:

- `internal/keeper/service.go` is the orchestration loop for claiming due jobs, preflight, execute, record execution, create incidents, retry/expire rules.
- `internal/keeper/executor.go` is a hot-wallet chain executor.
- `internal/keeper/postgres.go` is the repository (claiming jobs, marking, etc).

### `internal/funding`
Funding “abstraction layer” and background reconciliation:

- API surface lives in `internal/api/funding_abstraction.go`.
- Core service and workers in `internal/funding/*`:
  - destination polling (detect USDC arrivals)
  - matching (execution ↔ destination transfer)
  - crediting (balance ledger updates)
  - provider adapters (LI.FI currently wired)

### `internal/ethops`
Chain RPC abstraction / helpers:

- Failover RPC client (primary + fallback URLs).
- ABI embedding, log decoding helpers, contract “view” calls, tx preparation helpers.
- Faucet relayer helper (optional).

### `internal/db` + `internal/dbqueries`
Database connectivity + typed queries:

- `internal/db/*`: pool creation, reachability checks, migrations, “wait for schema”.
- `internal/dbqueries/*`: sqlc-generated query layer.

## Sources of truth (critical)

- **Canonical chain history**: `chain_events` table (append-only-ish, idempotent by `(tx_hash, log_index)`).
- **Derived projections for serving**:
  - `market_snapshots`, `market_epoch_outcomes`, `market_read_models`, `probability_points`, `user_position_outcomes`, etc.
- **Durable realtime stream**: `realtime_events` table (monotonic `seq`).
- **Automation intent/history**: `keeper_schedule`, `keeper_executions`, `incidents`.
- **Funding lifecycle state**: funding intent/execution tables and ledgers (see funding docs).

## Why this split exists

- The system prioritizes **fast, stable read shapes** for frontend UX.
- It prefers **event-driven freshness** (durable realtime envelopes + websocket replay) over hard polling.
- It keeps the runtime stack “boring”: Postgres is the primary durable system-of-record, with ephemeral in-memory fanout for websockets.
