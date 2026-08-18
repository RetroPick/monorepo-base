# ADR-R5: Live backend is Markets V1 only

**Status:** Accepted  
**Date:** 2026-08-18  
**Completes:** [ADR-R4](ADR-R4-LEGACY-ARCHIVED.md)

## Context

ADR-R4 moved epoch **cmds** and `internal/legacy/domain` to `archive/`, but the live Go module still contained epoch libraries (`indexer`, `keeper`, `funding`, `internal/api`, …), epoch-first migrations `000001`–`000015`, and Compose services whose `cmd/` folders no longer existed. `cmd/api` mounted Markets routes without a catalog projection.

## Decision

1. **Entrypoint:** `apps/backend/cmd/markets-api` is the only HTTP product binary. Live `cmd/api` is deleted.
2. **Libraries:** Remaining epoch packages are copied under `archive/apps/backend/internal/` (see `archive/apps/backend/RESTORE_MARKETS_CLEANUP.md`) and removed from the live tree.
3. **Schema:** Live migrator applies a Markets-only baseline (`markets_*` tables). Epoch SQL lives in archive. Existing epoch databases are **recreated**, not dual-upgraded.
4. **Compose/CI:** `SERVICE=markets-api`; no indexer, keeper, funding-worker, price-worker, or alert.
5. **Auth:** SIWE/epoch wallet auth is not part of the live BFF. Markets identity returns in a later phase.

## Consequences

- `go test ./...` in `apps/backend` is Markets-only.
- Restore of MarketEngine requires copying archived cmds **and** libraries back into the live module (archive has no `go.mod`).
- Health probes are `/api/v1/health/live` and `/api/v1/health/ready`.

## Follow-up (2026-08-18 legacy cleanup Slice F)

Slice F completes the migration/sqlc baseline: epoch migrations `000001`–`000015` live under `archive/apps/backend/migrations/epoch/`; the live chain is `000001`–`000010` Markets-only. Existing epoch databases must be recreated (`docker compose down -v` + fresh migrate). See `archive/apps/backend/RESTORE_MARKETS_CLEANUP.md`.
