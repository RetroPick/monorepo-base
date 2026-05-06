# RetroPick Benchmark Specification

## Purpose

This document defines the performance standard for the current RetroPick system and the benchmark workloads required to validate it.

It is written for the current architecture:

- Go API + indexer
- Postgres as source of truth and durable event log
- Next.js frontend with React Query
- WebSocket fanout for realtime market updates
- single-region deployment target

This is a benchmark spec for a consumer realtime trading and prediction-market application. It is not an HFT or colocated exchange-engine spec.

## Executive Summary

The current system is materially faster than the previous implementation because it now has:

- a single-row market read model for hot market reads
- append-only probability history points
- batched websocket replay from durable `realtime_events`
- channel-routed websocket fanout
- frontend cache patching instead of broad invalidation-only behavior
- candle update dedupe fixed so live charts can update within the same bucket

The current system is architecturally in the correct performance class for a retail realtime trading app.

The current system is not yet benchmark-validated under load. As of this document, there are no committed latency reports showing measured p50/p95/p99 values for:

- `GET /api/v1/markets`
- `GET /api/v1/markets/{templateId}`
- `GET /api/v1/markets/{templateId}/probability-history`
- websocket commit-to-browser latency
- concurrent websocket soak capacity

This document therefore defines:

1. the current-system analysis
2. the correct target benchmark for this class of app
3. the benchmark methodology and acceptance criteria
4. the known gaps between current state and target state

## Measured Snapshot

### Environment

Measured on `2026-05-06` against the live local Docker Compose stack:

- `retropick-api` on internal container network
- `retropick-postgres` on internal container network
- benchmark client executed from `retropick-web` container

Caveats:

- container-local measurement removes host-network noise and is appropriate for backend hot-path verification
- it does not measure browser rendering cost
- the API rate limiter is active and materially constrains high-rate public GET benchmarking

### Actual HTTP Measurements

Low-rate pass used to avoid tripping the current rate limiter:

- 12 requests per endpoint
- concurrency `1`
- `250ms` delay between requests

Results:

| Endpoint | Success | p50 | p95 | max |
|---|---:|---:|---:|---:|
| `GET /api/v1/markets` | 12/12 | `7.08ms` | `103.92ms` | `103.92ms` |
| `GET /api/v1/markets/{templateId}` | 12/12 | `6.03ms` | `9.53ms` | `9.53ms` |
| `GET /api/v1/markets/{templateId}/probability-history` | 12/12 | `4.80ms` | `10.18ms` | `10.18ms` |
| `GET /api/v1/markets/{templateId}/chart?interval=300&limit=240` | 12/12 | `4.12ms` | `7.01ms` | `7.01ms` |

Interpretation:

- market detail, probability history, and chart endpoints are already comfortably inside the target latency band on the current dataset
- the markets list endpoint is also fast on average, but shows a wider tail than the others
- the one `~104ms` outlier on `/markets` suggests the list path still has more variance than the fully focused detail/history/chart paths

### Rate-Limiter Findings

High-rate benchmark passes immediately hit the public GET limiter:

- limit is `60 GETs/minute/IP`
- budget is shared across all public GET endpoints
- current implementation:
  - `apps/backend/internal/api/rate_limit.go`

Observed result:

- moderate benchmark traffic produced `429 RATE_LIMITED` responses before the endpoints saturated

Interpretation:

- the current runtime configuration is suitable for abuse protection on low-volume public traffic
- it blocks meaningful throughput benchmarking unless the benchmark client rate stays below the limiter or the limit is raised in a controlled benchmark environment
- benchmark conclusions about maximum API throughput cannot be made from the current default compose configuration

### WebSocket Reachability Findings

WebSocket origin probe results from inside the Docker network:

- `Origin: http://localhost:3000` -> `HTTP/1.1 403 Forbidden`
- `Origin: http://127.0.0.1:3000` -> `HTTP/1.1 403 Forbidden`
- `Origin: http://retropick-web:3000` -> `HTTP/1.1 403 Forbidden`

Relevant code:

- origin check:
  - `apps/backend/cmd/api/main.go`
- config load:
  - `apps/backend/internal/config/config.go`

Runtime finding:

- the running API container has no `WS_ALLOWED_ORIGINS` configured
- with an empty allowlist, websocket upgrades are effectively unreachable in the current compose environment

Interpretation:

- realtime browser-path benchmarking is currently blocked by configuration, not by measured fanout latency
- before any websocket latency SLA can be validated, `WS_ALLOWED_ORIGINS` must be set correctly for the active frontend origin

### Query Plan Findings

Measured with `EXPLAIN (ANALYZE, BUFFERS)` on the live local Postgres:

#### `market_read_models`

- current read path executes in roughly `0.306ms`
- current plan is a sequential scan
- shared buffers hit: `8`

Interpretation:

- on the current small dataset, this is excellent
- as market count grows materially, this path should be rechecked because sequential scan behavior is currently cheap only because the table is small

#### `probability_points`

- current filtered read path executes in roughly `0.229ms`
- current plan is sequential scan + sort on the current small dataset
- shared buffers hit: `10`

Interpretation:

- on the current dataset, the history path is extremely cheap
- the table is still small enough that the planner prefers a sequential scan despite the lookup index
- this must be revalidated once history volume grows

## System Analysis

### Current Hot-Path Architecture

#### 1. Market hot reads

The system now stores a market hot read model in `market_read_models` with embedded `outcomes_json`.

Relevant implementation:

- schema: `apps/backend/sql/schema.sql`
- table: `market_read_models`
- query load path: `apps/backend/internal/marketdata/service.go`
- API usage: `apps/backend/cmd/api/main.go`

This is the right direction because market list/detail requests no longer need to rebuild the full display state from many lower-level rows per request.

#### 2. Probability history

The system now stores probability history in `probability_points`.

Relevant implementation:

- schema: `apps/backend/sql/schema.sql`
- table: `probability_points`
- indexer writes on probability change:
  - `apps/backend/internal/indexer/indexer.go`
- API read path:
  - `apps/backend/cmd/api/main.go`

This is the correct model for chart history because request-time replay from `chain_events` is too expensive and too burst-sensitive for hot market pages.

#### 3. Realtime transport

The durable event bus remains `realtime_events`, with Postgres `NOTIFY` used as a wake-up signal.

Relevant implementation:

- durable event insert/load:
  - `apps/backend/internal/realtime/realtime.go`
- listener batch load after last seen seq:
  - `apps/backend/internal/pglisten/pglisten.go`
- channel-routed fanout:
  - `apps/backend/internal/wshub/hub.go`
- websocket replay path:
  - `apps/backend/cmd/api/main.go`

This is appropriate for single-region early-stage scale. It avoids introducing Redis, NATS, or Kafka before they are justified by measured limits.

#### 4. Frontend realtime state

The frontend now patches React Query caches directly for market and chart updates and persists replay cursors per channel.

Relevant implementation:

- websocket hook:
  - `apps/fe-v1/src/hooks/useIndexerWebSocket.ts`

This is much better than broad invalidation-only behavior because cards and charts can update with lower UI churn and fewer unnecessary refetches.

### Current Strengths

- Market list/detail data has a precomputed read model.
- Probability history is direct-read and append-only.
- WebSocket replay is batch-based instead of row-by-row.
- Fanout is routed by channel map instead of effectively scanning every client.
- Price candle updates can now emit repeatedly within the same bucket.
- Frontend caches can be patched immediately on event receipt.

### Current Performance Risks

These are the main remaining performance risks in the current codebase.

#### 1. `GET /api/v1/markets` is still hybrid, not truly single-source

The endpoint still:

- loads template metadata separately
- loads hidden-template state separately
- loads projection snapshots separately
- merges in memory

This is much better than the old N+1 shape, but it is not yet the thinnest possible SQL path.

Relevant code:

- `apps/backend/cmd/api/main.go`

#### 2. WebSocket gateway still lives inside the API process

The plan target calls for a separate stream gateway process. The current implementation still serves `/ws` from `cmd/api`.

That is acceptable at small scale, but it means:

- API and websocket workloads still compete for process resources
- connection-heavy fanout can affect REST tail latency

#### 3. Marketdata ingestion still opens one transaction per interval per tick

Current behavior:

- for each incoming tick
- loop intervals `60, 300, 900, 3600, 86400`
- begin transaction
- upsert candle
- insert realtime event
- commit

Relevant code:

- `apps/backend/internal/marketdata/service.go`

This is good enough for hackathon-to-seed volume, but it is not the final batched flush design from the plan.

#### 4. Probability point sequence generation is simple and durable, but not yet optimized

Current implementation computes:

- `SELECT COALESCE(MAX(seq), 0) + 1 FROM probability_points`

inside the projection write path.

That is acceptable for current scale but can become a write-contention point at higher update rates.

#### 5. No measured load evidence yet

The system currently has correctness tests and limited local benchmark evidence, but still lacks benchmark evidence for:

- endpoint latency under concurrency
- websocket soak
- reconnect/replay pressure
- query-count regression detection

#### 6. WebSocket benchmarking is blocked by current origin config

The current compose environment rejects websocket upgrades from the tested frontend origins because `WS_ALLOWED_ORIGINS` is unset.

That means:

- realtime latency cannot be validated end to end in the current default local runtime
- any claim about current websocket performance would be speculative until config is corrected

## Performance Class Validation

### What class of app is this?

RetroPick should be benchmarked as a consumer realtime trading/prediction app:

- low-latency market-data updates
- low-latency hot reads
- responsive browser interaction
- reliable reconnect/replay

It should not be benchmarked as:

- a colocated exchange core
- HFT order-entry infrastructure
- sub-millisecond matching engine

### External Baselines

The benchmark targets below are consistent with public baselines from modern web and market-data systems.

- Web interaction responsiveness:
  - INP good at `<= 200ms` p75
  - https://web.dev/inp/
- Web page loading:
  - LCP good at `<= 2.5s` p75
  - https://web.dev/articles/lcp
- Visual stability:
  - CLS good at `<= 0.1` p75
  - https://web.dev/optimize-cls
- Market-data websocket baseline:
  - Massive/Polygon publishes average websocket latency under tens of milliseconds on provider side
  - https://massive.com/knowledge-base/article/what-is-the-average-latency-for-massives-websockets
- Market-data throughput expectations:
  - Massive/Polygon publishes high sustained trade/quote throughput expectations on market-data streams
  - https://massive.com/knowledge-base/article/how-much-data-is-streamed-through-massives-websockets
- Exchange API class separation:
  - Coinbase distinguishes general REST usage from higher-frequency market-data/order-entry interfaces
  - https://docs.cdp.coinbase.com/exchange/introduction/welcome

These sources should not be interpreted as an end-to-end browser-app SLA. They are used to validate that RetroPick’s target class is a low-latency retail trading app, not an HFT engine.

## Benchmark Targets

### Backend API Targets

#### `GET /api/v1/markets`

- p50: `< 25ms`
- p95: `< 80ms`
- p99: `< 150ms`

#### `GET /api/v1/markets/{templateId}`

- p50: `< 35ms`
- p95: `< 100ms`
- p99: `< 180ms`

#### `GET /api/v1/markets/{templateId}/probability-history`

- p50: `< 50ms`
- p95: `< 120ms`
- p99: `< 220ms`

#### `GET /api/v1/markets/{templateId}/chart`

- p50: `< 40ms`
- p95: `< 100ms`
- p99: `< 180ms`

### Realtime Targets

Measure from event commit to browser receive.

- p50: `< 100ms`
- p95: `< 250ms`
- p99: `< 500ms`

This is the primary realtime KPI.

### Frontend Interaction Targets

These are the app-level targets, stricter than generic web averages where appropriate.

- market page INP p75: `<= 200ms`
- market page LCP p75: `<= 2.5s`
- market page CLS p75: `<= 0.1`
- timeframe switch to updated chart render p95: `< 150ms`
- watchlist toggle optimistic feedback p95: `< 75ms`
- trade ticket state-change response p95: `< 100ms`

### Capacity Targets

#### WebSocket Soak

- `1000` concurrent clients
- mixed subscriptions across:
  - `global:markets`
  - `market:{templateId}`
  - `epoch:{templateId}:{epochId}`
  - `user:{wallet}`
- stable connection duration: `30m`
- no crash
- no reconnect storm
- slow-consumer disconnect behavior remains controlled

Acceptance:

- `resync_required` under normal soak: `< 0.1%` of delivered event paths
- slow-consumer forced disconnects: `< 1%` under nominal benchmark conditions
- replay success after short disconnect: `> 99%`

#### API Concurrency

- `GET /api/v1/markets`: 100 VUs steady
- `GET /api/v1/markets/{templateId}`: 50 VUs steady
- `GET /api/v1/markets/{templateId}/probability-history`: 30 VUs steady
- mixed hot-endpoint run: 150 VUs total

### Data Semantics Targets

- `volume` means cumulative traded notional, not current pool size
- `totalPool` means current liquidity depth
- no live RPC calls on list/detail/history hot paths
- probability history must be served from `probability_points`, not `chain_events`

## Measurement Methodology

## Environment

Use a single-region environment close to the database.

Minimum benchmark environment:

- API and websocket in same region as Postgres
- warm database
- representative production-like env vars
- frontend built in production mode for browser measurements

Do not use:

- local dev mode for final latency claims
- browser dev server timings for SLA decisions
- cold-start traces as steady-state numbers

## Required Metrics

### Backend

Instrument:

- request count by route
- p50/p95/p99 latency by route
- DB rows read by hot route
- DB query count by hot route
- websocket connected clients
- subscriptions per channel
- event backlog size
- event replay batch size
- indexer lag by block and seconds
- candle ingestion lag
- `resync_required` count
- slow-consumer disconnect count

### Frontend

Instrument:

- websocket message receive time
- cache patch apply time
- chart rerender time after event receipt
- trade ticket UI response timings
- Web Vitals:
  - INP
  - LCP
  - CLS

## Workloads

### Workload A: Market list hot read

Goal:

- validate `GET /api/v1/markets` hot-path latency
- validate no regressions to N+1 behavior

Traffic shape:

- 100 VUs
- 5 minute warm run
- 10 minute measured run
- realistic filters disabled if endpoint has no heavy query params

Pass criteria:

- p95 under target
- no live RPC calls
- stable query count per request

### Workload B: Market detail with history

Goal:

- validate detail page load path

Traffic shape:

- `GET /api/v1/markets/{templateId}`
- `GET /api/v1/markets/{templateId}/probability-history`
- `GET /api/v1/markets/{templateId}/chart`

Mix:

- 50 detail requests
- 30 probability history requests
- 30 chart requests

Pass criteria:

- each endpoint within target p95
- no replay from `chain_events` on history path

### Workload C: Realtime fanout

Goal:

- validate websocket latency and routing correctness

Traffic shape:

- 1000 concurrent clients
- 50% subscribed to `global:markets`
- 30% subscribed to `market:{templateId}`
- 10% subscribed to `epoch:{templateId}:{epochId}`
- 10% subscribed to user/deposit channels

Publish pattern:

- 5 to 20 market update events/sec
- burst window: 100 events over 5 seconds

Pass criteria:

- commit-to-browser p95 under 250ms
- no mass disconnects
- low `resync_required`

### Workload D: Reconnect and replay

Goal:

- validate per-channel cursor resume path

Traffic shape:

- disconnect subsets of clients for:
  - 5s
  - 15s
  - 60s
- reconnect with stored channel cursors

Pass criteria:

- short disconnects replay successfully
- long disconnects either replay correctly or explicitly resync without client corruption

### Workload E: Frontend live chart responsiveness

Goal:

- validate visual freshness of market detail charts

Traffic shape:

- load market detail page
- inject/update candle and probability events
- measure:
  - receive time
  - cache patch time
  - chart rerender visible time

Pass criteria:

- chart update visible p95 under 150ms after client receive

## Suggested Benchmark Tooling

### Backend load

Recommended:

- `k6` for HTTP load
- `k6/ws` or a dedicated Go websocket harness for soak
- optional `vegeta` for quick route-only latency checks
- repo helper scripts:
  - `scripts/benchmark/http-benchmark.mjs`
  - `scripts/benchmark/ws-origin-probe.mjs`

### Browser/UI

Recommended:

- Playwright for interaction timing and reconnect scenarios
- `web-vitals` collection in production build

### Database

Recommended:

- `pg_stat_statements`
- Postgres slow query logs
- route-level query counting in application metrics

## Example Benchmark Matrix

| Area | Metric | Target |
|---|---:|---:|
| Markets list | p95 latency | `< 80ms` |
| Market detail | p95 latency | `< 100ms` |
| Probability history | p95 latency | `< 120ms` |
| Chart endpoint | p95 latency | `< 100ms` |
| WebSocket | commit-to-browser p95 | `< 250ms` |
| Market page | INP p75 | `<= 200ms` |
| Market page | LCP p75 | `<= 2.5s` |
| WebSocket soak | concurrent clients | `1000` |
| Replay reliability | short reconnect replay | `> 99%` |

## Benchmark Gaps To Close

These items should be completed before claiming the system is benchmark-proven.

### Must-have

- add route-level latency histograms
- add websocket latency measurement from commit to send and from send to browser receive
- add query-count instrumentation on hot endpoints
- add websocket soak harness
- add browser-side live update timing capture

### Should-have

- separate stream gateway from API process
- batch marketdata flushes instead of per-interval per-tick transactions
- reduce `GET /api/v1/markets` to a thinner SQL path if list size grows materially
- replace `MAX(seq)+1` on `probability_points` if update rate becomes materially higher

## Current Validation Status

What is validated now:

- correctness-oriented Go tests pass
- focused frontend websocket patching tests pass
- architecture now matches the intended low-latency shape much more closely than before
- low-rate container-local HTTP measurements show strong hot-path latency on the current dataset
- Postgres `EXPLAIN ANALYZE` shows sub-millisecond execution for the current read-model and probability-history queries

What is not validated yet:

- sustained concurrent p50/p95/p99 route latency without rate-limit interference
- measured websocket end-to-end latency
- measured soak capacity
- measured browser Web Vitals on production build under representative traffic

## Senior Engineering Judgment

The current system is in the correct architecture class for a fast retail realtime trading application.

It is likely capable of meeting the target latency range in a single-region deployment at early-stage scale, because:

- hot reads are precomputed
- probability history is no longer reconstructed on demand
- realtime replay is batched and durable
- fanout is routed by channel
- frontend state updates are more incremental and targeted

Measured evidence now supports a narrower statement:

- the hot read paths are already fast on the current local dataset
- the API rate limiter is currently a stronger bottleneck for benchmark throughput than the endpoint handlers themselves
- websocket performance cannot be signed off because the current local runtime rejects websocket upgrades

However, no senior engineer should sign off on “the whole system is fast” without measured evidence across the realtime path. The right statement today is:

- the architecture is benchmark-worthy
- the HTTP hot paths look healthy on the current dataset
- the benchmark targets in this document are appropriate
- websocket validation and sustained-load validation still need to be executed before whole-system performance claims become factual

## Next Step

Implement benchmark harnesses and reporting for:

1. API route latency
2. websocket soak and replay
3. browser-side live update timing
4. query-count and rows-read visibility

Immediate priority order:

1. set `WS_ALLOWED_ORIGINS` correctly in the benchmark environment
2. rerun websocket handshake validation
3. run websocket latency and soak harnesses
4. run HTTP load in a benchmark environment with a benchmark-appropriate public GET limit

Only after those runs should the project publish official whole-system performance numbers.
