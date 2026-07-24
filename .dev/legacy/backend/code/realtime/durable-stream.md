# Durable realtime stream (`realtime_events`)

This doc is a code walkthrough of the durable stream model implemented in `apps/backend/internal/realtime/realtime.go`.

## Table model (conceptual)

The backend persists realtime envelopes in `realtime_events`:

- `seq` (monotonic bigint, primary key)\n- `channel`, `type`, `scope`\n- optional `user_address`, `template_id`, `epoch_id`\n- optional `block_number`, `tx_hash`, `log_index`\n- `payload` JSON\n- optional `dedupe_key` for idempotency\n- timestamps

This makes the websocket layer replayable and allows “catch up” without full resync.

## Insert path (`realtime.Insert`)

```mermaid
flowchart TD
  insertReq[InsertEvent] --> normalize[Normalize fields]
  normalize --> marshal[Marshal payload JSON]
  marshal --> insert[INSERT realtime_events ... ON CONFLICT(dedupe_key) DO NOTHING]
  insert -->|inserted| returnSeq[Return seq]
  insert -->|deduped| returnNoRows[Return (0,false,nil)]
```

Important normalizations:\n\n- scope defaults to `public`\n- user address is lowercased\n- template id is stored only if length is 32 bytes\n- `dedupe_key` is optional; if empty, it is stored as NULL and no dedupe occurs

## Notify path (`realtime.Notify`)

`Notify(ctx, pool, seq)` executes:

- `SELECT pg_notify('realtime_event', '<seq>')`

The payload is a string seq; listeners can then load the envelope(s) from DB.

## Load path (replay)

The websocket server and pglisten bridge use:

- `LoadEnvelopesAfter(ctx, pool, afterSeq, limit, channels)`

This returns ordered envelopes by `seq ASC`, optionally filtered by channel list.

Envelope decoding (`scanEnvelope`) normalizes types and returns JSON-ready structures:\n\n- `templateId` becomes a `0x` hex string\n- timestamps are formatted RFC3339\n- payload is unmarshaled into `map[string]any`

## Source pointers

- `apps/backend/internal/realtime/realtime.go`

