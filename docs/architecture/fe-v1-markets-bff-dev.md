# fe-v1 ↔ BFF ↔ PostgreSQL local integration

Deterministic Phase 1.2 read path for browser verification. The browser must talk to the **Go markets-api BFF** only — not Gamma/CLOB upstream hosts.

## Prerequisites

- Docker (for PostgreSQL)
- Go toolchain
- `pnpm install` at repo root

## Quick start (populated catalog)

```bash
# Terminal 1 — stack orchestrator (postgres + seed + markets-api + fe-v1)
bash scripts/markets-v1-bff-dev.sh populated
```

Environment variables (optional):

| Variable | Default |
|----------|---------|
| `DATABASE_URL` | `postgres://retropick:retropick@127.0.0.1:5433/retropick?sslmode=disable` |
| `MARKETS_HTTP_PORT` | `8090` |
| `VITE_API_URL` | `http://127.0.0.1:8090` |

## Seed scenarios

```bash
# Populate multiple events/markets (binary, unavailable price, closed market)
DATABASE_URL=postgres://retropick:retropick@127.0.0.1:5433/retropick?sslmode=disable \
  go -C apps/backend run ./cmd/markets-seed -scenario populated

# Empty catalog
go run ./scripts/markets-v1-bff-dev-seed -scenario empty

# Degraded/stale freshness
go run ./scripts/markets-v1-bff-dev-seed -scenario degraded
```

### Seeded IDs (populated)

| Resource | ID |
|----------|-----|
| Multi-market event | `polymarket:event:seed-multi` |
| Single-market event | `polymarket:event:seed-single` |
| Binary w/ prices | `polymarket:market:seed-binary` |
| Unavailable prices | `polymarket:market:seed-unavailable` |
| Closed market | `polymarket:market:seed-closed` |

Canonical ID grammar uses the `polymarket:` prefix (see `apps/backend/internal/markets/postgres/catalog_reader.go`, OpenAPI fixtures, and `packages/polymarket/fixtures/events-list.json`).

## Manual component startup

```bash
docker compose up -d postgres
export DATABASE_URL=postgres://retropick:retropick@127.0.0.1:5433/retropick?sslmode=disable
go -C apps/backend run ./cmd/markets-seed -scenario populated

cd apps/backend
export MARKETS_HTTP_PORT=8090 MARKETS_CATALOG_ENABLED=1 MARKETS_SIGNALS_ENABLED=1
go run ./cmd/markets-api

cd apps/fe-v1
export VITE_API_URL=http://127.0.0.1:8090
pnpm dev:vite
```

## Verification routes

- Discover: `http://127.0.0.1:5173/app/markets/all`
- Event detail: `http://127.0.0.1:5173/app/events/polymarket%3Aevent%3Aseed-multi`
- Market (valid prices): `http://127.0.0.1:5173/app/market/polymarket%3Amarket%3Aseed-binary`
- Market (unavailable): `http://127.0.0.1:5173/app/market/polymarket%3Amarket%3Aseed-unavailable`
- Signals: `http://127.0.0.1:5173/app/signals`
- Portfolio placeholder: `http://127.0.0.1:5173/app/portfolio`

Network proof: browser devtools should show requests only to `127.0.0.1:8090` (RetroPick BFF), with zero calls to `gamma-api.polymarket.com`, `clob.polymarket.com`, `data-api.polymarket.com`, `bridge.polymarket.com`, or `relayer.polymarket.com`.
