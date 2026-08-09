# Markets web (Next.js shell)

Greenfield RetroPick Markets V1 web app with fe-v1 prediction-market UI/UX.

## Routes

| Path | Page |
|------|------|
| `/markets` | Events discover |
| `/markets/events/:eventId` | Event detail |
| `/markets/m/:marketId` | Market detail (read-only) |
| `/markets/portfolio` | Guest portfolio dashboard shell |

Product module: `src/products/markets/` (PHASE-1 read hooks unchanged).

## Development

### One-button full Docker stack (recommended)

Requires **Docker daemon running** (Docker Desktop on WSL with integration enabled).

From repo root:

```bash
pnpm dev:markets-stack          # Postgres + seed + markets-api + apps/web
pnpm smoke:markets-stack        # verify BFF + seeded catalog
pnpm dev:markets-stack:down     # stop stack
```

Open **http://localhost:3001/markets** (Discover).

Equivalent commands:

```bash
bash scripts/markets-dev-up.sh
retro stack markets up
retro stack markets smoke
retro stack markets down
```

Docker Desktop hairpin issues: `docker compose --env-file compose.desktop-hairpin.env -f docker-compose.markets-dev.yml up --build -d`

### Host-run web (BFF already up)

Copy [`.env.local.example`](.env.local.example) → `.env.local` if overriding API URL.

In non-production, `apps/web` defaults to `http://127.0.0.1:8080` when unset.

```bash
cd apps/web
pnpm dev          # http://localhost:3001
pnpm typecheck
pnpm test:markets
```

### Manual BFF (Go on host)

Go module is `apps/backend/` (not repo root):

```bash
docker compose up -d postgres   # or use markets-dev postgres on :5433
export DATABASE_URL=postgres://retropick:retropick@127.0.0.1:5433/retropick?sslmode=disable
export MARKETS_CATALOG_ENABLED=1
go -C apps/backend run ./cmd/markets-seed -scenario populated
go -C apps/backend run ./cmd/markets-api
```

Legacy fe-v1 + host BFF: `bash scripts/markets-v1-bff-dev.sh populated` (Vite on `:5173`).

Deploy env template: [`deploy/web-markets/.env.example`](../../deploy/web-markets/.env.example).
