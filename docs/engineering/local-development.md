# Local Development

## Prerequisites

- Node.js 22+
- pnpm 10
- Go 1.26+
- Docker (recommended for Postgres + BFF + web)

Foundry is only required for **archived** epoch contracts under `archive/contracts/legacy-pool-v1/`.

## Common Commands

- `pnpm dev:markets-stack`: start Postgres + `markets-api` + `apps/web` (canonical local stack).
- `pnpm dev:web`: run Markets web only (`@retropick/markets-web`, port 3001).
- `go -C apps/backend run ./cmd/markets-api`: run BFF against local Postgres.
- `pnpm docker:up` / `pnpm docker:down`: alias to markets-dev up/down scripts.
- `pnpm smoke`: run backend Go tests.
- `pnpm contracts:test`: Foundry tests against `archive/contracts/legacy-pool-v1` (epoch reference only).

## Environment

Use [`.env.example`](../../.env.example) and [`.env.markets-dev.example`](../../.env.markets-dev.example) as templates. Local `.env` files, private keys, mnemonics, and webhook secrets must stay uncommitted.

Markets BFF requires `MARKETS_AUTH_SESSION_SECRET` and `MARKETS_AUTH_ALLOWED_DOMAINS` when using compose (see `docker-compose.markets-dev.yml`).
