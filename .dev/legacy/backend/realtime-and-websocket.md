# Realtime and websocket

RetroPick uses a **durable realtime stream** in Postgres (`realtime_events`) plus **websocket fanout** with replay.

## The durable stream: `realtime_events`

Source: `apps/backend/internal/realtime/realtime.go`

- Insert via `realtime.Insert(...)`:
  - stores `channel`, `type`, `scope`, optional `user_address/template_id/epoch_id`, optional `block_number/tx_hash/log_index`
  - stores `payload` JSON
  - optional `dedupe_key` provides idempotency (`ON CONFLICT (dedupe_key) DO NOTHING`)
  - returns the inserted `seq` (monotonic, `BIGSERIAL`)
- Notify via `realtime.Notify(ctx, pool, seq)`:
  - `SELECT pg_notify('realtime_event', '<seq>')`

## Postgres LISTEN bridge

Source: `apps/backend/internal/pglisten/pglisten.go`

The API process starts `pglisten.Run(...)`, which:

1. Opens a dedicated pg connection (not the pool).
2. `LISTEN realtime_event`
3. On notification:
   - parses payload as `seq`
   - bulk loads events after `lastSeenSeq` (batches of 256) via `realtime.LoadEnvelopesAfter`
   - broadcasts each envelope JSON to the in-memory websocket hub

This design ensures websocket fanout is **not** “fire-and-forget”: the durable table remains the source-of-truth for replay.

## Websocket endpoint `/ws`

Source: `apps/backend/cmd/api/main.go`

### Handshake

- On connect, the server immediately sends:
  - `{ "type": "hello", "channel": "system", "ts": "<rfc3339>" }`
- The server enforces a websocket **Origin** allowlist via `WS_ALLOWED_ORIGINS`.

### Client messages (current)

- **`subscribe`**:
  - `{ "type":"subscribe", "channels":[...], "lastSeq":123, "cursorByChannel": { "channel": 456 } }`
  - Rate-limited: max **30 subscribe messages per minute**.
  - Subscription cap: max **50 channels**.
  - Authorization:
    - public channels (`global:*`, `market:*`, `epoch:*`, `oracle:*`, `chart:*`) are allowed
    - `user:<wallet>` requires an authenticated principal matching wallet
    - `deposit:<intentId>` requires authenticated principal matching intent owner
    - `ops:*` requires operator principal
  - Replay rules:
    - if `lastSeq > 0`, server replays up to 500 envelopes for accepted channels after `lastSeq`
    - for per-channel cursors, it replays up to 500 after each cursor for that channel
  - Response:
    - `{ "type":"subscribed", "channels":[...accepted...] }`
    - or errors such as RATE_LIMITED / CHANNEL_LIMIT

- **`unsubscribe`**:
  - `{ "type":"unsubscribe", "channels":[...] }`
  - Response: `{ "type":"unsubscribed", "channels":[...] }`

- **`resume`**:
  - `{ "type":"resume", "lastSeq":123, "cursorByChannel": { ... } }`
  - Replays missed envelopes similar to subscribe.

- **`ping`**:
  - Response: `{ "type":"pong", "ts":"<rfc3339>" }`

### Server keepalive

- The server sends websocket **control ping** frames every **25s**.
- If ping write fails, it drops the connection.

### Resync semantics

When replay fails (e.g. seq gaps / DB errors), the server sends:

- `{ "type":"resync_required", "channel":"system", "lastSeq":<n> }`
- or `{ "type":"resync_required", "channel":"<channel>", "reason":"SEQUENCE_GAP" }`

Frontend should treat this as: **refetch baseline state via HTTP**, then resume from a new cursor.

## Channel conventions (current)

- `global:markets`: global market-level changes (indexer ticks, pool updates, etc.)
- `market:<templateIdHex>`: per-template updates
- `epoch:<templateIdHex>:<epochId>`: per-epoch updates
- `user:<wallet>`: per-user position/claim updates
- `deposit:<intentId>`: funding lifecycle updates (private; owner-gated)
- `ops:*`: operator-only streams

## Source pointers

- `apps/backend/internal/realtime/realtime.go`
- `apps/backend/internal/pglisten/pglisten.go`
- `apps/backend/cmd/api/main.go` (websocket implementation)

