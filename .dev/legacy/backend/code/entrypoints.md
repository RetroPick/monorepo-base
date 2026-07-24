# Entrypoints and runtime composition

This doc walks through `apps/backend/cmd/*` entrypoints and explains what each binary does at runtime.

## Inventory

- `cmd/api/main.go`: main HTTP API + websocket + background workers + LISTEN bridge
- `cmd/indexer/main.go`: chain log ingestion + projection writes + realtime envelopes
- `cmd/keeper/main.go`: DB-backed job runner + hot wallet executor (optional)
- `cmd/migrator/main.go`: apply embedded migrations then exit
- `cmd/alert/main.go`: incident notifier worker (optional)
- `cmd/reporter/main.go`: disabled-by-default TrustedReporter claim signer
- `cmd/healthcheck/main.go`: local HTTP probe utility

## `cmd/api/main.go` (API)

### Startup flow (ordered)

1. Build a cancelable context from signals (`SIGINT`, `SIGTERM`).
2. Initialize structured logger (JSON slog handler).
3. Load config (`internal/config.Load`) and load embedded registry (`internal/registry.LoadEmbedded`).
4. Create a chain caller (`ethops.NewCaller`) with optional RPC fallbacks.\n   - Apply a global live-RPC cache TTL (`ethCaller.SetGlobalCacheTTL`).
5. Optionally initialize faucet relayer (requires `FAUCET_RELAY_ENABLED=1` and key set).
6. Wait for DB schema to exist and not be “dirty” (`db.WaitForSchema`).
7. Open pgx pool (`db.NewPoolWithConfig`) using config-constrained connection parameters.
8. Construct runtime services:\n   - websocket hub (`wshub.NewHub`)\n   - funding service (`funding.NewService`)\n   - funding workers (credit/matcher/destination poller)\n   - marketdata service (`marketdata.NewService`)\n   - Postgres LISTEN bridge (`pglisten.Run`)
9. Configure chi router and middleware:\n   - auth config injection into request context\n   - CORS allow-origin func\n   - request ID, RealIP, logger, recoverer, timeout\n   - rate limit middleware
10. Mount routes:\n    - health (`RegisterHealthRoutes`)\n    - `/api/v1/auth`\n    - `/api/v1/config/contracts`\n    - `/api/v1/ops` (operator gate)\n    - `/api/v1/tx`\n    - `/api/v1/funding` and `/api/funding`\n    - `/api/v1/me`\n    - and additional market/user/watchlist/faucet endpoints\n    - websocket endpoint: `/ws`
11. Start HTTP server and block until shutdown, then gracefully `Shutdown` with 10s timeout.

### Concurrency model

API is a single process that runs multiple goroutines:\n\n- HTTP server goroutine\n- funding workers (credit/matcher/destination poller)\n- pglisten bridge\n\nAll are driven by the same context so cancellation stops them.

## `cmd/indexer/main.go` (Indexer)

### Startup flow

1. Build cancelable signal context.\n2. Load config + embedded registry.\n3. Wait for schema (`db.WaitForSchema`).\n4. Open DB pool.\n5. Create RPC failover client (`ethops.NewFailoverRPCClient`).\n6. Build `indexer.Service` (needs proxy address and logger).\n7. Optionally start a metrics server (`metrics.ServeIfConfigured`) with two counters.\n8. Loop:\n   - call `SyncOnce(ctx, maxBlocksPerTick)`\n   - record success/failure counters\n   - sleep until tick interval or context cancel

### Max block range constraint

The binary clamps max blocks per tick to **<= 10000** due to common public RPC `eth_getLogs` span caps.

## `cmd/keeper/main.go` (Keeper)

### Enablement gate

If `KEEPER_ENABLED != 1`, keeper logs “disabled” and exits.

### Startup flow

1. Load config + embedded registry.\n2. Wait for schema.\n3. Open DB pool.\n4. Load hot wallet key from `KEEPER_PRIVATE_KEY_FILE`.\n5. Build executor (`keeper.NewHotWalletExecutor`).\n6. Build Postgres repository + keeper service.\n7. Optionally start a metrics server.\n8. Loop:\n   - `svc.RunOnce(ctx)`\n   - if processed a job, immediately attempt next\n   - otherwise sleep for poll interval

## `cmd/migrator/main.go` (Migrator)

- Loads config.\n- Runs `db.RunMigrations(DATABASE_URL)`.\n- Exits.

## `cmd/alert/main.go` (Incident notifier)

### Enablement gate

If `ALERT_WEBHOOK_URL` is empty, the worker logs “disabled” and exits.

### Loop

Every `ALERT_POLL_INTERVAL`, it attempts to:\n\n- load the oldest open incident with `notified_at IS NULL`\n- POST a JSON payload to the webhook URL\n- if POST succeeds (2xx), set `notified_at=NOW()`\n- else increment `notification_attempts` and record `last_error`

This worker is intentionally simple and DB-driven; it does not subscribe to realtime events.

## `cmd/reporter/main.go` (Reporter)

### Enablement gate

If `REPORTER_ENABLED != 1`, reporter logs “disabled” and exits.

### Signing mode

When enabled, the reporter command signs one TrustedReporter claim and writes a JSON payload to stdout. It does **not** broadcast transactions.

Required env:

- `REPORTER_PRIVATE_KEY`: reporter signer key, not admin/owner key.
- `REPORTER_CHAIN_ID`: chain id used in the EIP-712 domain.
- `TRUSTED_REPORTER_ADAPTER`: adapter verifying contract.
- `REPORTER_CLAIM_KIND`: `lock`, `resolve`, or `ohlc`.
- `REPORTER_MARKET_ID`: engine `positionKey(templateId, epochId)`.
- `REPORTER_OBSERVED_AT`: source-data observation timestamp.
- `REPORTER_DATA_SOURCE` or `REPORTER_DATA_SOURCE_HASH`.
- `REPORTER_NONCE` and `REPORTER_EPOCH`: current adapter nonce / reporter epoch.
- scalar claims: `REPORTER_VALUE_E8`.
- OHLC claims: `REPORTER_HIGH_E8`, `REPORTER_LOW_E8`, `REPORTER_CLOSE_E8`.

The output includes the digest, signature, signer address, adapter address, and an explicit submission guard. Operators must verify adapter state and source data before posting `postResolveResult` / `postOhlcResult`.

## `cmd/healthcheck/main.go` (Local probe)

- Simple utility that `GET`s `http://127.0.0.1:${PORT}/api/v1/livez` (or a custom path).\n- Exits non-zero if the request fails or returns non-2xx.

## Source pointers

- `apps/backend/cmd/api/main.go`\n- `apps/backend/cmd/indexer/main.go`\n- `apps/backend/cmd/keeper/main.go`\n- `apps/backend/cmd/migrator/main.go`\n- `apps/backend/cmd/alert/main.go`\n- `apps/backend/cmd/reporter/main.go`\n- `apps/backend/cmd/healthcheck/main.go`
