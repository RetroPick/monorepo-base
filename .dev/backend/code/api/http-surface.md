# API HTTP surface (route map)

This doc enumerates the main HTTP routes exposed by `cmd/api/main.go` and points to the handler implementations in `internal/api/*`.

## Where routes are wired

Primary wiring happens in:

- `apps/backend/cmd/api/main.go`

Routers are implemented in:

- `apps/backend/internal/api/*`

## Global middleware (in order)

See [`middleware.md`](./middleware.md) for details:

- auth config injection via `api.WithAuthConfig(...)`
- CORS (`api.BuildCORSAllowOriginFunc`)
- standard chi middleware: request id, RealIP, logger, recoverer, timeout
- in-memory rate limiting (`api.RateLimitMiddleware`)

## Health and diagnostics

Implemented in `internal/api/health.go`:

- `GET /api/v1/livez`: static liveness + build + chain id + faucet relay enabled
- `GET /api/v1/health`: **indexer freshness** (`indexer_state`) plus `schemaVersion`, `environment`, `chainId`, nested `indexer` (aligned with `/api/v1/ops/global-state`), `contracts.marketEngineProxy`, and top-level `indexedBlock` alias for `lastIndexedBlock`
- `GET /api/v1/readyz`: DB ping + schema check + optional RPC block number
- `GET /metrics`: API-local Prometheus-text metrics derived from DB queries

## Auth

Mounted in `cmd/api/main.go`:

- `r.Mount(\"/api/v1/auth\", api.AuthRouter())`

Router implementation:

- `internal/api/auth_routes.go`

## Registry / config

- `GET /api/v1/config/contracts`: returns embedded `registry` JSON plus `faucetRelayEnabled`

## Operator APIs (`/api/v1/ops/*`)

Mounted with operator requirement:

- `r.Mount(\"/api/v1/ops\", api.RequireOperator(api.OpsRouter(...), cfg.AuthJWTSecret))`

`OpsRouter` lives in:

- `internal/api/ops.go` (indexed global state/templates/keeper schedule/incidents)
- `internal/api/ops_live.go` (explicit live RPC reads)
- `internal/api/ops_prepare*.go` (prepared calldata)
- `internal/api/ops_frontend_visibility.go`
- `internal/api/ops_feeds.go`

Important: some ops endpoints are **stubs** (oracle health, audit).

## Tx helpers (`/api/v1/tx/*`)

Mounted:

- `r.Mount(\"/api/v1/tx\", api.TxRouter(pool, ethCaller, reg))`

Implementation:

- `internal/api/tx_prepare.go`
- `internal/api/tx_submit_*`

Concept: these endpoints help the frontend build calldata for wallet-submitted transactions and track status.

## Funding v1 (`/api/v1/funding/*`)

Mounted:

- `r.Mount(\"/api/v1/funding\", api.FundingRouter(pool, reg, fundingSvc))`

Implementation:

- `internal/api/funding.go`
- `internal/api/funding_validation.go`

## Funding abstraction v2 (`/api/funding/*`)

Mounted:

- `r.Mount(\"/api/funding\", api.FundingAbstractionRouter(...))`

Implementation:

- `internal/api/funding_abstraction.go`

This is the “intent/options/execution” flow used to bridge USDC onto the settlement chain and credit internal balances.

## “Me” / session-scoped routes (`/api/v1/me/*`)

Mounted:

- `r.Mount(\"/api/v1/me\", api.MeRouter(pool, ethCaller, reg))`

Implementation:

- `internal/api/me_routes.go`

## User + market routes wired directly in `cmd/api/main.go`

These are handlers registered inline in `cmd/api/main.go` (not via a router factory):

- User balance and positions:\n  - `GET /api/v1/user/balance`\n  - `GET /api/users/{address}/balance`\n  - `GET /api/v1/user/positions`\n  - `GET /api/v1/user/claims`\n  - `GET /api/v1/user/portfolio-summary`
- Watchlist:\n  - `GET /api/v1/user/watchlist/nonce`\n  - `GET /api/v1/user/watchlist`\n  - `POST /api/v1/user/watchlist`
- Faucet:\n  - `GET /api/v1/user/faucet-state`\n  - `POST /api/v1/user/faucet-relay`
- Markets:\n  - `GET /api/v1/markets`\n  - `GET /api/v1/markets/{templateId}`\n  - `GET /api/v1/markets/{templateId}/chart`\n  - `GET /api/v1/markets/{templateId}/epochs`\n  - `GET /api/v1/markets/{templateId}/epochs/{epochId}/outcomes`\n    - supports `?source=live` to call RPC via `ethCaller.GetOutcomeViews(...)`\n  - `GET /api/v1/markets/{templateId}/probability-history`\n    - backed by `probability_points` by default\n  - **Epoch lifecycle:** when a `market_snapshots` row exists, list/detail JSON includes `epochStatus` (and `status`) = `open` | `locked` | `resolved`. See [`../epoch-field-parity.md`](../epoch-field-parity.md).\n- User events:\n  - `GET /api/v1/user/{address}/events`
- Internal-balance market entry:\n  - `POST /api/markets/{marketId}/enter`

## Source pointers

- `apps/backend/cmd/api/main.go`
- `apps/backend/internal/api/*.go`

