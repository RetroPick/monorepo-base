# Configuration and environment variables

This doc is derived from `apps/backend/internal/config/config.go` plus runtime usage in `cmd/*`.

## Required

- **`DATABASE_URL`**: Postgres connection string. Required for all processes.

## Common

- **`RPC_URL`**: primary JSON-RPC URL for chain reads. Default: `https://sepolia.base.org`.
- **`RPC_FALLBACK_URLS`**: comma-separated fallbacks used by failover clients/callers.
- **`PORT`**: API listen port. Default `8080` (API only).
- **`LOG_LEVEL`**: `debug|info|warn|error` (currently used as a config value; main binaries default to info handler).

## API auth / sessions

These are injected into request context in `cmd/api/main.go` via `api.WithAuthConfig(...)`.

- **`AUTH_JWT_SECRET`**: HMAC secret for Bearer JWT validation (HS256). If empty, Bearer JWT auth will fail.
- **`AUTH_SESSION_SECRET`**: cookie session encryption/signing secret. Defaults to `AUTH_JWT_SECRET` if not set.
- **`AUTH_SESSION_TTL`**: session TTL. Default `168h` (7 days). Accepts duration strings or a positive integer seconds.
- **`AUTH_NONCE_TTL`**: SIWE-style nonce TTL. Default `10m`.
- **`AUTH_COOKIE_DOMAIN`**: cookie domain attribute.
- **`AUTH_COOKIE_SECURE`**: set to `1` to mark cookies secure.
- **`AUTH_COOKIE_SAMESITE`**: default `Lax`.

## CORS

Implemented in `internal/api/cors.go`.

- **`CORS_STRICT`**: when `1`, only explicit allowed origins/patterns are accepted.
- **`CORS_ALLOWED_ORIGINS`**: comma-separated full origin strings (exact match).
- **`CORS_ALLOWED_ORIGIN_PATTERNS`**: comma-separated `scheme://host` globs matched with `filepath.Match` (e.g. `https://*.vercel.app`).

When `CORS_STRICT` is not `1`, **any** `http://localhost:*` and `http://127.0.0.1:*` origin is accepted in addition to defaults, so dev servers on arbitrary ports aren’t blocked.

## Websocket

- **`WS_ALLOWED_ORIGINS`**: comma-separated list of allowed `Origin` values for websocket upgrades. If empty, upgrades will be rejected because `Origin` must match one of the allowed entries (see `cmd/api/main.go`).

## Live RPC behavior (API “source=live” reads)

- **`LIVE_RPC_TIMEOUT`**: default `15s`. Used by `ethops` caller.
- **`LIVE_RPC_GLOBAL_CACHE_TTL`**: default `5s`. Applied via `ethCaller.SetGlobalCacheTTL(...)` in the API process.

## Indexer

- **`INDEXER_FINALITY_DEPTH`**: default `3`. Used to compute “stable head”.
- **`INDEXER_TICK_INTERVAL_MS`**: default `3s` (duration parse; name suggests ms but it’s parsed as duration).
- **`INDEXER_MAX_BLOCKS_PER_TICK`**: default `10000`. `cmd/indexer/main.go` clamps to `<= 10000` because public RPC often caps `eth_getLogs` span to ~10k blocks.
- **`INDEXER_LOOKBACK_BLOCKS`**: used on first run (when last indexed block is 0). Default `50000`.

## Keeper

Keeper only runs when explicitly enabled.

- **`KEEPER_ENABLED`**: set to `1` to run the keeper loop.
- **`KEEPER_PRIVATE_KEY_FILE`**: file path containing the hot wallet private key hex. Required when `KEEPER_ENABLED=1`.
  - Also accepts legacy alias `KEEPER_SIGNER_PATH` (via envDefault).
- **`KEEPER_POLL_INTERVAL`**: default `5s`. Used both as poll interval and retry backoff default.
- **`KEEPER_RECEIPT_TIMEOUT`**: default `90s`. Waiting for tx receipts.
- **`KEEPER_MAX_RETRY_COUNT`**: default `3`.

## Funding (abstraction + LI.FI wiring)

- **`LIFI_BASE_URL`**: LI.FI API base URL.
- **`LIFI_TIMEOUT`**: default `4s`.
- **`LIFI_WEBHOOK_SECRET`**: if set, `/api/funding/webhooks/lifi` requires `X-Lifi-Webhook-Secret` to match.

Allowlists:

- **`FUNDING_ALLOWED_CHAIN_IDS`**: comma-separated chain IDs.
- **`FUNDING_ALLOWED_TOKENS`**: comma-separated token addresses (lowercased).
- **`FUNDING_ALLOWED_PROVIDERS`**: comma-separated provider names (uppercased in config normalization).

Settlement config:

- **`SETTLEMENT_CHAIN_ID`**: default `8453`.
- **`SETTLEMENT_USDC_ADDRESS`**: required for destination polling correctness.
- **`SETTLEMENT_RECEIVER_ADDRESS`**: receiver address for deposit destination.
- **`MIN_DEPOSIT_USDC`**: default `5000000` (USDC base units).
- **`SOFT_MAX_DEPOSIT_USDC`**: default `500000000`.
- **`HARD_MAX_DEPOSIT_USDC`**: default `2000000000`.
- **`DESTINATION_POLL_INTERVAL`**: default `4s`.
- **`MATCHER_POLL_INTERVAL`**: default `2s`.
- **`MARKET_ENTRY_SAFETY_BUFFER`**: default `90s`. Used to reject balance-based market entry near lock time.

## Faucet relay (optional)

- **`FAUCET_RELAY_ENABLED`**: must be `1` and the key must be set to enable.
- **`FAUCET_RELAYER_PRIVATE_KEY`**: hot key used for faucet relay.
- **`FAUCET_RELAY_DEADLINE_MAX`**: default `15m`.

## Alerts (minimal current wiring)

- **`ALERT_WEBHOOK_URL`**
- **`ALERT_POLL_INTERVAL`**: default `15s`

These exist in config but do not imply a full “alert dispatcher service” is present—treat as implementation-specific.

## Metrics server (indexer/keeper)

- **`METRICS_PORT`**: if set, starts a Prometheus-text server with counters.
- **`METRICS_HOST`**: defaults to `127.0.0.1`.

## Build metadata (optional)

Used by `/api/v1/livez` and `/api/v1/health`.

- **`BUILD_VERSION`** (default `dev`)
- **`BUILD_COMMIT`** (default `unknown`)
- **`BUILD_TIME`** (default `unknown`)

## Notes for Vercel/serverless

`internal/config/config.go` sets `DB_MIN_CONNS=0` by default when `VERCEL` is present (bursty connection behavior).

This does **not** make Vercel a good home for the indexer/keeper; see `PRODUCTION.md` for why the backend is intended to be persistent.

## Source pointers

- `apps/backend/internal/config/config.go`
- `apps/backend/internal/api/cors.go`
- `apps/backend/internal/metrics/metrics.go`

