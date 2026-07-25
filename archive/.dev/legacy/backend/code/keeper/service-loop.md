# Keeper service loop (claim → preflight → execute → record)

This doc explains the keeper orchestration loop in `apps/backend/internal/keeper/service.go`, and how it uses the Postgres repository in `internal/keeper/postgres.go`.

## Core loop: `Service.RunOnce`

`RunOnce(ctx)` does **one** unit of work:

1. Determine `now` (UTC).\n2. Claim a due job: `repo.ClaimDueJob(workerId, now)`.\n3. If no job, return `(false, nil)`.\n4. If `now > job.WindowEndAt`, mark missed window.\n5. Preflight.\n6. Execute tx.\n7. Record execution + mark schedule completed.\n8. Return `(true, nil)` when a job was processed.

The process-level binary (`cmd/keeper/main.go`) repeatedly calls `RunOnce` until no work is found, then sleeps.

## Claiming semantics (`PostgresRepository.ClaimDueJob`)

Claim uses a SQL transaction with:

- `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1` over pending jobs ordered by `scheduled_at` then `id`
- then `UPDATE keeper_schedule SET status='claimed', claimed_by=?, claimed_at=?, attempt_count=attempt_count+1`

SKIP LOCKED enables multiple keeper workers to run concurrently without fighting over the same job.

## Window semantics

If `now.After(job.WindowEndAt)`, keeper records:

- `keeper_executions.result = missed_window`\n- schedule row is marked `failed`\n- an incident is inserted (high severity)

This is the “fail loudly” guarantee: missed windows become operator-visible incidents.

## Preflight semantics

`executor.Preflight(ctx, action, templateId, epochId)` returns:

- `snapshot` (a map) on success\n- or an error plus snapshot on failure

Preflight failures are recorded as:\n\n- execution result: `preflight_failed`\n- an incident with severity `medium`

## Execute semantics

`executor.Execute(...)` returns `TxResult` (hash, timings, gas, receipt summary, chain id, nonce).

Execute errors are recorded as:\n\n- execution result: `failed`\n- incident severity `high`

## Retry/expire rules

On failure:

- if attempts >= max retry count **or** next retry would pass window end:\n  - mark schedule `failed` (expired)\n- else:\n  - mark schedule `pending` again and move `scheduled_at = now + retryBackoff`

This guarantees retries happen only within the safety window.

## Success path

On success:

- insert an execution record (`succeeded`)\n- mark schedule row `completed` and clear claim fields

## Flowchart

```mermaid
flowchart TD
  claim[ClaimDueJob] -->|none| noWork[Return false]
  claim --> windowCheck{now <= windowEnd?}
  windowCheck -->|no| missed[InsertExecution(missed_window)+Incident+MarkExpired]
  windowCheck -->|yes| preflight[Preflight snapshot]
  preflight -->|err| preflightFail[InsertExecution(preflight_failed)+Incident]
  preflight -->|ok| execute[Execute tx]
  execute -->|err| execFail[InsertExecution(failed)+Incident]
  execute -->|ok| success[InsertExecution(succeeded)+MarkCompleted]
  preflightFail --> retryOrExpire{Retry?}
  execFail --> retryOrExpire
  retryOrExpire -->|retry| markRetry[MarkRetry(scheduled_at=now+backoff)]
  retryOrExpire -->|expire| markExpired[MarkExpired]
```

## Source pointers

- `apps/backend/internal/keeper/service.go`\n- `apps/backend/internal/keeper/postgres.go`\n- `apps/backend/internal/keeper/types.go`

