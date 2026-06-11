# Postgres LISTEN bridge (`pglisten`)

This doc explains how the API process bridges Postgres `NOTIFY` events into the in-memory websocket hub.

## Where it runs

- Spawned as a goroutine in `apps/backend/cmd/api/main.go`:\n  - `go pglisten.Run(ctx, cfg.DatabaseURL, pool, hub, log)`

## Core algorithm

Source: `apps/backend/internal/pglisten/pglisten.go`

```mermaid
flowchart TD
  connect[pgx.Connect(databaseURL)] --> listen[LISTEN realtime_event]
  listen --> wait[WaitForNotification]
  wait --> parse[Parse payload as seq]
  parse --> batchLoop[LoadEnvelopesAfter(lastSeenSeq, 256)]
  batchLoop --> broadcast[hub.Broadcast(JSON(env))]
  broadcast --> advance[Set lastSeenSeq=env.Seq]
  advance --> batchLoop
  batchLoop --> wait
```

## Why it bulk-loads after `lastSeenSeq`

`NOTIFY` delivers only the seq string; it is not guaranteed to deliver every message if the listener is disconnected, and notifications can arrive out of order under reconnection.\n\nBy using `LoadEnvelopesAfter`, the bridge:\n\n- catches up if multiple events were inserted quickly\n- catches up if the listener was temporarily disconnected\n- reduces per-notify DB roundtrips by batching

## Failure behavior

- If `WaitForNotification` errors and the context is not canceled, the loop logs a warning and continues.
- If envelope loading fails, it logs a warning and breaks the batch loop, then waits for the next notification.

## Scope filtering

The bridge calls `LoadEnvelopesAfter(..., channels=nil)` so it loads **all channels**.\n\nPer-client filtering is done later in the websocket hub via per-client subscription sets.

## Source pointers

- `apps/backend/internal/pglisten/pglisten.go`
- `apps/backend/internal/realtime/realtime.go`
- `apps/backend/internal/wshub/hub.go`

