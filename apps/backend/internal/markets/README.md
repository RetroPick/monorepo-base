# Markets backend (Polymarket BFF)

Greenfield bounded context for RetroPick Markets. It does not import or extend
the archived epoch market domain. Polymarket remains the venue and settlement
authority; these records are read projections.

Canonical contract: `schemas/openapi/markets-v1.yaml`.

## Public endpoints

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/v1/markets/eligibility` | Fail-closed future transaction gate |
| GET | `/api/v1/markets/capabilities` | Runtime capability metadata |
| GET | `/api/v1/markets/events` | Paginated Gamma event catalog |
| GET | `/api/v1/markets/events/{eventId}` | Event and normalized markets |
| GET | `/api/v1/markets/markets/{marketId}` | Market, outcomes, and resolution provenance |
| GET | `/api/v1/markets/markets/{marketId}/orderbook?tokenId=...` | CLOB snapshot with freshness |
| GET | `/api/v1/markets/markets/{marketId}/history?tokenId=...` | Sparse CLOB price history |
| GET | `/api/v1/markets/markets/{marketId}/health?tokenId=...` | Deterministic liquidity components |
| GET | `/api/v1/markets/intelligence/signals` | Deterministic signal envelopes |
| GET | `/api/v1/health/live` | Process liveness |
| GET | `/api/v1/health/ready` | Dependency readiness/degraded state |

Prices and sizes are decimal strings. A stale, invalid, unavailable, or
resynchronizing order book is never labeled live.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `MARKETS_GAMMA_API_URL` | `https://gamma-api.polymarket.com` | Production validates the official HTTPS host |
| `MARKETS_CLOB_API_URL` | `https://clob.polymarket.com` | Production validates the official HTTPS host |
| `MARKETS_CATALOG_ENABLED` | `1` | Set `0` to disable catalog reads |
| `MARKETS_MARKET_DATA_ENABLED` | `1` | Set `0` to disable order-book/history reads |
| `MARKETS_BOOK_MAX_AGE` | `10s` | Snapshot age before explicit stale state |

## Degraded behavior

- Gamma failure: return a structured upstream error unless a bounded persisted
  projection is available.
- CLOB failure: mark the market-data capability unavailable; never synthesize a
  book or forward-fill history.
- Realtime disconnect, hash mismatch, or backward timestamp: mark the session
  `resyncing` and require an authoritative REST snapshot.
- Signal engine failure: catalog and market-data reads remain independent.
- `/api/v1/health/live` does not depend on Polymarket availability.

## Verification

```bash
go test ./internal/markets/... -count=1
go test ./internal/config -count=1
go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.28.0 generate
git diff --exit-code internal/dbqueries
```

PostgreSQL integration tests require `DATABASE_URL`; CI uses PostgreSQL 16.
