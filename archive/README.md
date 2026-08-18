# Archive — Legacy epoch v1 and superseded code

**Archived:** 2026-07-24
**Policy:** Active code MUST NOT import from `archive/`. Restore only via explicit ADR and `git mv` reversal.

## Manifest

| Active path (before) | Archive path |
|----------------------|--------------|
| `contracts/legacy-pool-v1/` | `archive/contracts/legacy-pool-v1/` |
| `packages/legacy/` | `archive/packages/legacy/` |
| `.dev/legacy/` | `archive/.dev/legacy/` |
| `apps/backend/internal/legacy/` | `archive/apps/backend/internal/legacy/` |
| `apps/backend/cmd/{indexer,keeper,...}/` | `archive/apps/backend/cmd/*/` |
| `apps/backend/cmd/api/main.go` (epoch) | `archive/apps/backend/cmd/api/main_epoch.go` |
| `apps/backend/internal/api/v3_routes.go` | `archive/apps/backend/internal/api/v3_routes.go` |
| `apps/ops-web/` | `archive/apps/ops-web/` |
| `apps/web/src/features/`, `views/`, `hooks/`, etc. | `archive/apps/web/*/` |
| `apps/web/src/products/legacy/` | `archive/apps/web/products/legacy/` |
| `docs/technical/current-implementation/` | `archive/docs/epoch-v1/current-implementation/` |
| `docs/upgrade-v3/` | `archive/docs/epoch-v3/upgrade-v3/` |

## Restore epoch API locally

1. Copy `archive/apps/backend/cmd/api/main_epoch.go` → `apps/backend/cmd/api/main.go` (or merge routes).
2. Restore `apps/backend/internal/legacy/` from archive.
3. Set `INDEXER_ENABLED=1`, `KEEPER_ENABLED=1` and run archived workers from `archive/apps/backend/cmd/`.

## Foundry (archived contracts)

```bash
forge build --root archive/contracts/legacy-pool-v1
forge test --root archive/contracts/legacy-pool-v1
```

Or `pnpm contracts:build` / `pnpm contracts:test` at repo root (points to archive).

## Ultra-clean pass (2026-08-17)

Live `apps/backend` is Markets-only (`cmd/markets-api`). Remaining epoch
**libraries** (indexer, keeper, funding, ethops, full `internal/api`, …),
epoch migrations `000001`–`000015`, and sqlc `queries.sql` / `v3_queries.sql`
were copied under `archive/apps/backend/` (see
`archive/apps/backend/RESTORE_MARKETS_CLEANUP.md`).

Archive is still not a buildable Go module. Restore by copying packages back
into the live `apps/backend` module.

## Legacy cleanup pass (2026-08-18, post ADR-R4/R5)

| Active path (before) | Archive path |
|----------------------|--------------|
| `docker-compose.alfajores.yml`, `compose.alfajores.env` | `archive/docker/` |
| Epoch smokes (`smoke-production.sh`, `RETRODEPLOYER`, …) | `archive/scripts/` |
| `packages/contracts`, `packages/types`, `package/abi/` | `archive/packages/legacy/` |
| Epoch normative docs (`PRODUCTION.md`, `ORCHESTRATOR.md`, …) | `archive/docs/` |
| Legacy `.harness/agents/*.agent.md` (non `rp-*`) | `archive/harness/agents/` |
| Epoch migrations `000001`–`000015` | `archive/apps/backend/migrations/epoch/` |
| `BENCHMARK.md` (epoch perf baseline) | `archive/docs/epoch-v1/BENCHMARK.md` |

Live Markets stack: `cmd/markets-api`, `apps/web`, `docker-compose.markets-dev.yml`.

## Docs and artifacts pass (2026-08-18, post A–F)

| Active path (before) | Archive path |
|----------------------|--------------|
| `docs/archive/` | `archive/docs/legacy-docs-archive/` |
| `docs/product/*` | `archive/docs/product/` |
| `docs/feature/operator-backend-surface/` | `archive/docs/feature/` |
| `apps/docs/` (epoch protocol Next.js site) | `archive/apps/docs/` |
| `scripts/market/` | `archive/scripts/market/` |
| `.harness/skills/retropick-market-engine/` | `archive/harness/skills/` |
| `.harness/tasks/done/` (epoch tasks) | `archive/harness/tasks/done/` |
| `.marketTypes.md`, `.business/*`, `.retropick-emergency/` | `archive/docs/product/`, `archive/docs/business/`, `archive/ops/` |
| `docker/anchor.Dockerfile` | `archive/docs/product/` (with market types) |

Live docs: `.dev/markets-v1/`, `docs/ARCHITECTURE.md`. Stub: `apps/docs/README.md`.
