# Keeper job model (tables + invariants)

This doc explains the keeper’s DB model: which tables it reads/writes and what invariants are assumed by the service loop.

## Tables

Created by migrations (see `apps/backend/migrations/000009_keeper_runtime_and_alerting.*.sql`) and mirrored in `apps/backend/sql/schema.sql`:

- `keeper_schedule`: the work queue\n- `keeper_executions`: append-only history of attempts and outcomes\n- `incidents`: incident log (shared with indexer rewind + other operational events)

## `keeper_schedule` (work queue)

Key fields:

- `id`: bigserial\n- `template_id` (nullable)\n- `epoch_id` (nullable)\n- `action`: string (`lockEpoch`, `resolveEpoch`, `genesisLockRolling`, `executeRollingRound`)\n- `scheduled_at`: earliest execution time\n- `window_end_at`: hard cutoff\n- `status`: `pending`, `claimed`, `completed`, `failed`, etc. (string enum-ish)\n- claim fields: `claimed_by`, `claimed_at`\n- retries: `attempt_count`, `last_error`, and a computed next scheduled time (stored on retry)\n- `preflight_snapshot`: JSONB

Invariants:

- a job should never execute after `window_end_at`\n- a claimed job should either be completed/expired/retried within a bounded time (watch for stuck claims)

## `keeper_executions` (attempt history)

Each attempt records:

- which schedule row it came from\n- result: `succeeded`, `failed`, `preflight_failed`, `missed_window`\n- tx hash (if submitted)\n- timing (started/submitted/mined)\n- receipt JSON and gas used\n- preflight snapshot\n- error message when applicable

The keeper inserts an execution record for every terminal outcome (including missed windows).

## `incidents`

Keeper inserts incidents for:\n\n- missed windows\n- failed execution\n- preflight failure\n\nIt chooses severity based on result type (`preflight_failed` → medium; otherwise high).

## Source pointers

- `apps/backend/internal/keeper/types.go`\n- `apps/backend/internal/keeper/postgres.go`\n- `apps/backend/internal/keeper/service.go`\n- `apps/backend/sql/schema.sql`

