# Operations runbook (persistent backend)

**Related docs (same repo):**

- [Ops admin dashboard workflow](../../docs/feature/ops-admin-operator-workflow.md) — `apps/ops` routes, API mapping, recommended operator sequence, harness agent owners
- [ORCHESTRATOR.md](../../ORCHESTRATOR.md) — phased engineering plan and verification commands
- [PRODUCTION.md](../../PRODUCTION.md) — supported stacks, cost model, deployment policy (this runbook assumes the **persistent VPS** shape described there)

This runbook assumes the recommended production shape from `PRODUCTION.md`: **persistent VPS** backend processes with Postgres, using public RPC by default and upgrading only when needed.

## What “healthy” means

At minimum:

- API responds:
  - `GET /api/v1/livez` returns `ok:true`
  - `GET /api/v1/readyz` returns `ok:true`, `db:true`, and ideally `rpc:true`
  - `GET /api/v1/health` returns `ok:true`, `schemaVersion: "retropick.health.v1"`, top-level `lastIndexedBlock` / `lastSyncAt`, plus `environment`, `chainId`, nested `indexer` (same keys as `/api/v1/ops/global-state`), and `contracts.marketEngineProxy`
- Indexer is advancing `indexer_state.last_block` and `indexer_state.last_indexed_at`
- Price worker is persisting fresh `oracle_feed_health` rows and `price_candles`
- Websocket stream is delivering increasing `seq` envelopes for active channels

## Day-0 checklist

- **Database**:
  - migrations applied (`cmd/migrator` or equivalent)
  - `schema_migrations` not dirty
- **API**:
  - has correct `DATABASE_URL`
  - has correct `RPC_URL` + fallbacks
  - `WS_ALLOWED_ORIGINS` set for the deployed frontend origin(s)
  - CORS configured (`CORS_STRICT=1` in production + explicit allowlist)
- **Indexer**:
  - configured with sane tick interval and max blocks per tick (<= 10k for public Base RPC)
- **Price worker**:
  - `PRICE_POLL_INTERVAL` is set to a measured RPC-safe cadence (`15s` default)
  - `GET /api/v1/ops/oracle/health` shows fresh indexed Chainlink rows
- **Keeper** (only if used):
  - `KEEPER_ENABLED=1`
  - signer key file mounted and readable
  - wallet is funded with gas

## Core endpoints to use

- **Liveness**: `GET /api/v1/livez`
- **Readiness**: `GET /api/v1/readyz`
- **Indexer freshness**: `GET /api/v1/health` (single-call probe: compare `indexer.lastIndexedBlock` to chain head; on DB outage the body still includes `environment` / `chainId` for routing)
- **Market list (sanity)**: `GET /api/v1/markets`

## Diagnosing indexer lag

Symptoms:

- `/api/v1/health` top-level `lastSyncAt` or nested `indexer.lastSyncAt` is old
- market pages show stale `lastIndexedBlock`

Actions:

- Confirm indexer process is running and not crash-looping.
- Check RPC reliability (public RPC can rate limit or drop connections).
- Confirm `INDEXER_MAX_BLOCKS_PER_TICK <= 10000`.
- If reorgs are frequent, `incidents` will show “indexer reorg rewind” and the indexer may churn rebuilding projections.

Policy (from `PRODUCTION.md`):

- Start with public RPC.
- Upgrade to paid RPC when sustained lag/error rates show it’s necessary.

## Diagnosing websocket staleness

Symptoms:

- Clients stop updating without refresh
- Clients receive `resync_required`

Actions:

- Ensure API’s `pglisten` goroutine is running (it logs “postgres listen”).
- Ensure the indexer is inserting into `realtime_events` and calling `pg_notify`.
- If notifications are flowing but clients are stale, verify:
  - `WS_ALLOWED_ORIGINS` is correct for your frontend origin
  - reverse proxy (if any) supports websocket upgrades

## Diagnosing stale chart prices

- Confirm `price-worker` is running and its `9094/metrics` endpoint increments successful polls.
- Check indexed feed health through `GET /api/v1/ops/oracle/health`.
- If every feed errors, verify `RPC_URL`, the configured chain id, and the curated feed registry.
- Query `price_candles` only after feed health is clean; chart routes intentionally serve persisted data.

## Diagnosing keeper issues

### Pre-rotation / handoff smoke (API)

Before RPC rotation, keeper deploy, or hot-wallet changes, run the repo script (JWT **only** via `RETROPICK_OPS_JWT`, never on argv):

- **`scripts/keeper-operator-smoke.sh`** — public `livez` / `readyz` / `health` / `markets`, then optional ops `global-state` + `keeper/schedule` + `keeper/executions` when JWT is set.
- Full narrative: [keeper.md](keeper.md#operator-smoke-pre-rotation--handoff).

### Keeper not running

- Confirm `KEEPER_ENABLED=1`.
- Confirm `KEEPER_PRIVATE_KEY_FILE` is set and readable.

### Keeper running but no jobs processed

- Check `keeper_schedule` for pending jobs.
- Confirm indexer is scheduling jobs when lifecycle events occur.

### Keeper failures / missed windows

- Check `incidents` table for keeper-related incidents.
- Check `keeper_executions` for `preflight_failed`, `failed`, `missed_window`.
- If failures correlate with RPC issues, consider:
  - using RPC fallbacks
  - upgrading to paid RPC
  - increasing `KEEPER_RECEIPT_TIMEOUT` if receipts are slow

## Backups and durability (DB-centric)

Because projections, funding state, and realtime envelopes are persisted in Postgres, database durability is critical.

Use the guidance in `PRODUCTION.md` for snapshot/backups appropriate to your deployment.

## Source pointers

- Health endpoints: `apps/backend/internal/api/health.go`
- Indexer state: `apps/backend/internal/indexer/indexer.go`
- Realtime notify: `apps/backend/internal/realtime/realtime.go`
- PG listen bridge: `apps/backend/internal/pglisten/pglisten.go`
- Chainlink price worker: `apps/backend/internal/priceworker`
- Keeper: `apps/backend/internal/keeper/service.go`
