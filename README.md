# RetroPick

**RetroPick** is a product suite for prediction-market discovery and structured outcomes:

| Product | Description | Client |
|---------|-------------|--------|
| **Markets** | Polymarket-native discovery, trading, portfolio (V1 in progress) | Web, Android |
| **PRISM** | Fully collateralized structured-outcome derivatives (future) | Web, Android |
| **Android** | Native Markets client (Kotlin + Jetpack Compose) | Mobile |

Legacy epoch v1 (MarketEngine) is **archived** under [`archive/`](archive/) — not part of the active build.

## Quick start

```bash
pnpm install

# Markets web (default)
pnpm dev:web

# Go Markets BFF (requires DATABASE_URL, REGISTRY_PATH)
go -C apps/backend run ./cmd/api

# Android scaffold prompt
# See apps/android/.dev/BUILD_SESSION_PROMPT.md
```

Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8080` for web → BFF catalog.

## Documentation

| Resource | Path |
|----------|------|
| Product suite | [`.dev/README.md`](.dev/README.md) |
| Markets V1 harness | [`.dev/markets-v1/`](.dev/markets-v1/) |
| Architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| OpenAPI | [`schemas/openapi/markets-v1.yaml`](schemas/openapi/markets-v1.yaml) |
| Agent contract | [`.dev/markets-v1/agent-harness/AGENT_OPERATING_CONTRACT.md`](.dev/markets-v1/agent-harness/AGENT_OPERATING_CONTRACT.md) |
| Archive (epoch v1) | [`archive/README.md`](archive/README.md) |

## Monorepo layout

```text
apps/web          Markets + PRISM web shells
apps/android      Markets Android (scaffold)
apps/backend      Go API — Markets BFF (internal/markets)
packages/polymarket  Shared TS types
schemas/openapi   Web + Android API contract
contracts/prism   Future PRISM contracts
archive/          Frozen epoch v1 code and docs
```

## Verify

```bash
pnpm --filter web typecheck
pnpm --filter web test
go -C apps/backend test ./internal/markets/...
```
