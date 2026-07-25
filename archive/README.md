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
