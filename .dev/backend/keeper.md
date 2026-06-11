# Keeper automation

The keeper is a **persistent automation worker** that executes epoch lifecycle transactions from a hot wallet, based on jobs scheduled in Postgres.

## Where it lives

- Entrypoint: `apps/backend/cmd/keeper/main.go`
- Service: `apps/backend/internal/keeper/service.go`
- Repository: `apps/backend/internal/keeper/postgres.go`
- Executor: `apps/backend/internal/keeper/executor.go`

## Enablement and signer

Keeper does nothing unless enabled:

- `KEEPER_ENABLED=1`
- `KEEPER_PRIVATE_KEY_FILE=/path/to/key` (required when enabled)

The key file must contain a hex private key (trimmed). The keeper uses it to construct a hot wallet executor.

## Data model

Tables (created by migrations; mirrored in `apps/backend/sql/schema.sql`):

- `keeper_schedule`: due jobs with claim state, attempt count, error, tx hash
- `keeper_executions`: immutable-ish execution records and receipts
- `incidents`: incident log created on failure/missed windows/reorg rewinds

## Job lifecycle (as implemented)

```mermaid
flowchart TD
  pending[status=pending] --> claim[ClaimDueJob(workerId, now)]
  claim --> preflight[Executor.Preflight]
  preflight -->|ok| execute[Executor.Execute]
  preflight -->|err| recordPreflightFail[InsertExecution(preflight_failed)+Incident]
  execute -->|ok| recordSuccess[InsertExecution(succeeded)+MarkCompleted]
  execute -->|err| recordFail[InsertExecution(failed)+Incident]
  claim -->|windowExpired| recordMiss[InsertExecution(missed_window)+Incident+MarkExpired]
  recordPreflightFail --> retryOrExpire{Retry?}
  recordFail --> retryOrExpire
  retryOrExpire -->|retry| markRetry[MarkRetry(next_scheduled_at=now+backoff)]
  retryOrExpire -->|expire| markExpired[MarkExpired]
```

### Window semantics

Each job has:

- `scheduled_at`: earliest execution time
- `window_end_at`: hard cutoff

If `now > window_end_at` when the job is claimed, it is marked as a missed window (`missed_window`) and an incident is created.

### Retry semantics

On preflight/execute failure, the keeper will retry iff:

- `attempt_count < MaxRetryCount`, **and**
- `now + RetryBackoff` is still before `window_end_at`

Otherwise it expires the job.

## Actions

Action names are defined as strings in `internal/keeper/service.go`:

- `lockEpoch`
- `resolveEpoch`
- `genesisLockRolling`
- `executeRollingRound`

Jobs are scheduled by the indexer when lifecycle events occur (see `indexer.md`).

## Operational runbook (minimal)

### If keeper is not running

- Confirm `KEEPER_ENABLED=1`.
- Confirm the key file path exists and is readable by the service user.
- Confirm API/indexer are writing rows to `keeper_schedule`.

### If keeper is running but doing nothing

- Check `keeper_schedule` for:
  - no `pending` jobs due yet
  - jobs stuck `claimed` (should be released on failure; investigate if worker crashed mid-claim)
- Check `incidents` for repeated failures.

### If keeper is missing windows

- Look for `missed_window` in `keeper_executions`.
- Check chain RPC latency / error rates (public RPC may be insufficient at some times).
- Check `KEEPER_RECEIPT_TIMEOUT` and consider increasing if receipts are slow.

### Disabling safely

- Set `KEEPER_ENABLED=0` (or omit) and restart the keeper process.
- Leaving scheduled jobs in DB is acceptable; they will not be claimed.

## Operator smoke (pre-rotation / handoff)

Use this **before** rotating RPC, upgrading the keeper binary, or touching the hot wallet. Nothing here puts secrets on the shell argv.

### One command (recommended)

From the repo root (API base only; JWT **only** via env):

```bash
export RETROPICK_API_BASE="https://your-api.example.com"
# Optional — enables /api/v1/ops/keeper/* (same JWT as ops dashboard / RETROPICK_OPS_JWT for smoke scripts)
# export RETROPICK_OPS_JWT="$(cat ~/.config/retropick/ops.jwt)"   # example; use your store

./scripts/keeper-operator-smoke.sh
```

The script probes, in order:

1. **Public:** `GET /api/v1/livez`, `readyz`, `health`, `markets` (no auth).
2. **If `RETROPICK_OPS_JWT` is set:** `GET /api/v1/ops/global-state`, `GET /api/v1/ops/keeper/schedule?limit=50`, `GET /api/v1/ops/keeper/executions?limit=50`.

### Copy-paste curls (manual)

Replace `API` and optionally set `JWT` from your secret store.

```bash
API="https://your-api.example.com"

curl -fsS "$API/api/v1/health" | head -c 400; echo

# Requires operator JWT (same as apps/ops; prefer RETROPICK_OPS_JWT — see PRODUCTION.md scripted smoke)
JWT="your-operator-jwt"
curl -fsS -H "Authorization: Bearer $JWT" "$API/api/v1/ops/keeper/schedule?limit=20"
curl -fsS -H "Authorization: Bearer $JWT" "$API/api/v1/ops/keeper/executions?limit=20"
```

Interpretation:

- **`health`**: confirm `ok`, `schemaVersion`, `indexer.lastIndexedBlock`, and `contracts.marketEngineProxy` look sane vs chain head (see [operations-runbook.md](operations-runbook.md)).
- **`keeper/schedule`**: pending / claimed jobs with `scheduledAt` / `windowEndAt` — empty is fine if no lifecycle work is due.
- **`keeper/executions`**: recent `result` values; spikes in `preflight_failed`, `failed`, or `missed_window` warrant indexer/RPC review before you rotate infra.

See also: [operations-runbook.md — Diagnosing keeper issues](operations-runbook.md#diagnosing-keeper-issues).

