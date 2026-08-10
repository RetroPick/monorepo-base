# Markets BFF ↔ PostgreSQL local integration

Deterministic read path for browser verification. The browser must talk to the **Go markets-api BFF** only — not Gamma/CLOB upstream hosts.

## Quick start — apps/web (full Docker, recommended)

Requires Docker daemon running (Docker Desktop on WSL with integration enabled).

```bash
pnpm dev:markets-stack
pnpm smoke:markets-stack
```

| URL | Purpose |
|-----|---------|
| `http://localhost:3001/markets` | Discover (apps/web) |
| `http://127.0.0.1:8080/api/v1/markets/events` | BFF catalog JSON |

Teardown: `pnpm dev:markets-stack:down`

Compose file: [`docker-compose.markets-dev.yml`](../../docker-compose.markets-dev.yml)

## Quick start — fe-v1 (legacy host-run)

```bash
bash scripts/markets-v1-bff-dev.sh populated
```

Environment variables (optional):

| Variable | Default |
|----------|---------|
| `DATABASE_URL` | `postgres://retropick:retropick@127.0.0.1:5433/retropick?sslmode=disable` |
| `MARKETS_HTTP_PORT` | `8080` |
| `VITE_API_URL` | `http://127.0.0.1:8080` |

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
export MARKETS_HTTP_PORT=8080 MARKETS_CATALOG_ENABLED=1 MARKETS_SIGNALS_ENABLED=1
go -C apps/backend run ./cmd/markets-api

cd apps/fe-v1
export VITE_API_URL=http://127.0.0.1:8080
pnpm dev:vite
```

## Verification routes

- Discover: `http://127.0.0.1:5173/app/markets/all`
- Event detail: `http://127.0.0.1:5173/app/events/polymarket%3Aevent%3Aseed-multi`
- Market (valid prices): `http://127.0.0.1:5173/app/market/polymarket%3Amarket%3Aseed-binary`
- Market (unavailable): `http://127.0.0.1:5173/app/market/polymarket%3Amarket%3Aseed-unavailable`
- Signals: `http://127.0.0.1:5173/app/signals`
- Portfolio placeholder: `http://127.0.0.1:5173/app/portfolio`

Network proof: browser devtools should show requests only to `127.0.0.1:8080` (RetroPick BFF), with zero calls to `gamma-api.polymarket.com`, `clob.polymarket.com`, `data-api.polymarket.com`, `bridge.polymarket.com`, or `relayer.polymarket.com`.

### apps/web verification routes

- Discover: `http://localhost:3001/markets`
- Event detail: `http://localhost:3001/markets/events/polymarket%3Aevent%3Aseed-multi`
- Market detail: `http://localhost:3001/markets/m/polymarket%3Amarket%3Aseed-binary`
