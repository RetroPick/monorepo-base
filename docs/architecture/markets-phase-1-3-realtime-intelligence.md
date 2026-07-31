# Markets V1 Phase 1.3 — Realtime Data and Deterministic Intelligence

**Status:** Contract frozen for implementation review  
**Baseline:** `64bce05ae16229d22405ff1b72893352ca9e15a8` (PR #8 merge)  
**Deployment model:** Single-active-replica realtime ingestion (low-cost VPS)

## Component ownership

| Component | Owner package | Responsibility |
|-----------|---------------|----------------|
| Upstream WS supervisor | `internal/markets/upstream/ws` | Polymarket public market channel lifecycle |
| Order-book reconciler | `internal/markets/marketdata` | Snapshot-first book state machine |
| Signal observatory | `internal/markets/signals` | Deterministic price/liquidity rules |
| Public WS hub | `internal/markets/realtime` | BFF fan-out, backpressure, security |
| Persistence | `internal/markets/postgres` | Observations, signals, evidence |
| Frontend client | `apps/fe-v1`, `packages/polymarket` | Connect-on-demand, honest labels |

## Upstream protocol evidence

**Endpoint:** `wss://ws-subscriptions-clob.polymarket.com/ws/market`

**Subscription (initial):**
```json
{"assets_ids": ["<token_id>"], "type": "market"}
```

**Dynamic update:**
```json
{"operation": "subscribe|unsubscribe", "assets_ids": ["<token_id>"]}
```

**Heartbeat:** Client sends `PING` text frame; server responds `PONG`.

**Standard events (snake_case wire):** `book`, `price_change`, `last_trade_price`, `tick_size_change`

**Critical finding:** Polymarket does not document an authoritative monotonic sequence number. `price_change.hash` is per-change evidence, not a hash-chain link. RetroPick keeps `sequence: null` and uses snapshot replacement plus REST revalidation.

**price_change semantics (safe policy):** Each change is an absolute price-level replacement. `size: "0"` removes the level. Hash is retained as upstream evidence only.

## Public BFF WebSocket protocol

**Route:** `GET /api/v1/markets/realtime` (WebSocket upgrade)

**Client commands:**
- `subscribe` — `{ "command": "subscribe", "marketId": "...", "tokenId": "..." }`
- `unsubscribe` — `{ "command": "unsubscribe", "marketId": "...", "tokenId": "..." }`

**Server messages:** `hello`, `subscribed`, `unsubscribed`, `orderbook.snapshot`, `orderbook.delta`, `trade.executed`, `market.tick_size_changed`, `market.updated`, `signal.created`, `signal.retracted`, `resync.required`, `error`

**Envelope fields:** `schemaVersion`, `eventId`, `eventType`, `source`, `marketId`, `upstreamId`, `tokenId`, `snapshotHash`, `sequence` (always null), `streamEpoch`, `deliveryCounter`, `observedAt`, `publishedAt`, `payload`

### streamEpoch and deliveryCounter

- `streamEpoch` increments on upstream reconnect or explicit resnapshot for a token.
- `deliveryCounter` is monotonic within a single `streamEpoch` per token stream.
- A changed `streamEpoch` requires clients to discard prior deltas and wait for a new snapshot.
- A `deliveryCounter` gap requires `resync.required`.
- These are RetroPick transport metadata — never Polymarket sequence numbers.

## Reconciler state machine

```
UNINITIALIZED → SNAPSHOT_LOADING → SYNCHRONIZED ⇄ DEGRADED
                      ↑                    ↓
                      └── RESYNC_REQUIRED ─┘
```

Rules:
1. Bootstrap from WS `book` or CLOB REST `/book`.
2. Apply `price_change` only after a valid baseline (SYNCHRONIZED).
3. Reconnect increments `streamEpoch` and forces SNAPSHOT_LOADING.
4. Periodic REST validation; resnapshot on mismatch or excessive staleness.
5. Never apply events for one token to another token's book.

## Signal mathematics (rule version `signals-v1-p13`)

**Price observation:** `p(t) = (bestBid + bestAsk) / 2` when book not crossed; else last trade within freshness bound; else no observation.

**Price move:** `delta_pp = 100 × (p(t) - p(ref))`; trigger UP/DOWN with hysteresis, cooldown, expiry.

**Liquidity:** Band depth within epsilon of best bid/ask; relative depth change vs baseline; spread widening detection.

All rules deterministic, versioned, idempotent via canonical idempotency keys.

## Security boundaries

- No Polymarket credentials in `apps/fe-v1`.
- Public market channel only (no user-channel auth).
- Origin allowlist on public hub.
- Catalog-backed token validation (reject arbitrary token IDs).
- Bounded queues; slow consumers disconnected without blocking ingestion.
- **SEC-P13-001:** Production release blocked until exposed credential rotated/revoked.

## Resource limits

| Limit | Default |
|-------|---------|
| Max subscribed assets | 200 |
| Max assets per upstream connection | 50 |
| Max hub connections | 500 |
| Max subscriptions per client | 20 |
| Max client command rate | 10/s |
| Max frame size | 64 KiB |
| Client output queue | 64 messages |

## Observability

Bounded-cardinality Prometheus metrics for upstream state, reconnects, coverage ratio, book states, hub connections, queue overflow, signal counts. No market/token IDs in labels.

## Health semantics

| Check | Liveness | Readiness |
|-------|----------|-----------|
| Database | — | required |
| Catalog projection | — | required |
| Market data REST | — | optional (degraded) |
| Realtime hub | independent | degraded if unavailable |
| Signals | — | disabled OK in Phase 1.3 partial |

`capabilities.features.realtime = true` only when hub and ingestion operational.

## Test strategy

- Fake upstream WebSocket server (deterministic fixtures)
- Reconciler unit tests (snapshot, delta, reconnect, wrong token)
- Hub tests (limits, overflow, snapshot-first ordering)
- Signal replay/idempotency tests
- Frontend state machine tests
- E2E: fake upstream → markets-api → PostgreSQL → browser

## Deployment limitations

- **Single active realtime replica.** Multiple `markets-api` replicas without shared ingestion bus will duplicate upstream subscriptions. Phase 1.3 documents this; leader election is deferred.
- No Kafka/NATS/Redis Streams.
- No persistent envelope replay.

## Deferred scope

- Trading, Builder orders, authenticated user channels
- Whale/large-trade classification
- Multi-replica HA realtime
- Custom Polymarket events (`best_bid_ask`, `new_market` via WS)
