# 02 Backend Architecture

## Runtime Processes
- `apps/backend/cmd/api/main.go`: main HTTP + websocket service, route registration, workers, DB pool, and shutdown coordination.
- `apps/backend/cmd/indexer/main.go`: chain event ingestion loop writing projections and realtime envelopes.
- `apps/backend/cmd/migrator/main.go`: schema migration entrypoint.
- `apps/backend/cmd/keeper/main.go`, `cmd/alert/main.go`, `cmd/reporter/main.go`: currently minimal/stub executables.

## API Process Composition
From `cmd/api/main.go`, startup flow is:
1. Load env config and embedded registry.
2. Build Ethereum caller and optional faucet relayer.
3. Wait for DB schema and open pgx pool.
4. Start workers (credit/matcher/destination poller) and PG LISTEN bridge.
5. Register routers and start HTTP server.

Major mounted APIs:
- `/api/v1/health` and build/chain status endpoints.
- `/api/v1/ops` (operator-protected).
- `/api/v1/tx` (prepare/submit transaction helpers).
- `/api/v1/funding` and `/api/funding` (v1 + abstraction v2).
- `/api/v1/markets*`, `/api/v1/user*`, `/ws`.

## Backend Modules

### API Layer (`internal/api`)
- Route families for markets, user portfolio/watchlist, tx prep, funding, ops.
- Cross-cutting middleware: auth context, operator gates, CORS policy, rate limiting, request timeout.
- Handlers combine DB projection reads with optional live RPC reads where needed.

### Indexer (`internal/indexer`)
- Reads MarketEngine proxy logs via ABI decoding.
- Persists canonical rows in `chain_events`.
- Updates projection tables (`market_snapshots`, `market_epoch_outcomes`, `user_position_outcomes`, etc.).
- Writes durable realtime envelopes and triggers notification.

### Realtime (`internal/realtime`, `internal/pglisten`, `internal/wshub`)
- Realtime messages are persisted before broadcast.
- DB notifications bridge to in-memory websocket hub.
- Websocket supports channel subscriptions, replay from `lastSeq`, and channel authorization checks.

### Funding Abstraction (`internal/funding`)
- Route option creation/scoring via provider adapters (LI.FI in current wiring).
- Intent/execution state machine management.
- Background workers for destination transfer detection, matching, and user balance crediting.

### Ethereum/ABI Integration (`internal/ethops`)
- Read wrappers for contract views.
- Prepared tx payload helpers and submit tracking.
- Faucet relay helper (EIP-712 signature + relayer tx path).

### Data Access (`internal/db`, `internal/dbqueries`, `sql/queries`)
- pgx pool and reachability utilities.
- SQLC-generated query layer for typed DB operations.
- Schema/migrations define projection and operational tables.

## Auth and Access Boundaries
- Operator routes require authenticated operator principal.
- JWT-based principal extraction is used for protected user/ops channels.
- Some wallet-scoped endpoints remain unsigned by design (must be documented explicitly as trust-boundary decisions).

## Deployment/Config Intent
- Environment-driven configuration (`internal/config/config.go`) with explicit chain/contract registry source.
- Supports local Docker and external deployments where backend and frontend are separate surfaces.
- Built for eventual multi-process operation (API, indexer, migrator, and future worker roles).
