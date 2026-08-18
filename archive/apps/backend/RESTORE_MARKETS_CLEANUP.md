# Restoring epoch backend after Markets-only cleanup (2026-08-17)

ADR-R4 originally moved worker **cmds** and `internal/legacy/domain`. The
2026-08-17 ultra-clean pass also archived the remaining epoch **libraries**
that had been left in the live module.

## What lives where

| Path | Contents |
|------|----------|
| `archive/apps/backend/cmd/` | Epoch worker entrypoints + `main_epoch.go` |
| `archive/apps/backend/cmd/api-live-stub-snapshot/` | Pre-cleanup slim `cmd/api` (markets-bff stub) |
| `archive/apps/backend/internal/` | Epoch packages (`indexer`, `keeper`, `funding`, `ethops`, …) |
| `archive/apps/backend/internal/epoch-libs/api/` | Full live `internal/api` at cleanup (archive already had partial `internal/api`) |
| `archive/apps/backend/internal/legacy/` | Domain packages from earlier R4 |
| `archive/apps/backend/migrations/epoch-000001-000015/` | Epoch SQL migrations |
| `archive/apps/backend/migrations/pre-cleanup-full/` | Full 000001–000018 snapshot |
| `archive/apps/backend/sql/` | `queries.sql`, `v3_queries.sql`, `schema-pre-cleanup.sql` |

## Restore (not a standalone module)

`archive/apps/backend` has **no** `go.mod`. To restore epoch:

1. Copy needed packages from `archive/apps/backend/internal/` back into `apps/backend/internal/`.
2. Copy worker cmds from `archive/apps/backend/cmd/` into `apps/backend/cmd/`.
3. Restore epoch migrations / sqlc queries from the snapshots above (or use `pre-cleanup-full`).
4. Point `cmd/api` at `main_epoch.go` (or the stub under `api-live-stub-snapshot` for Markets-only façade).
5. Rebuild from the live `apps/backend` module.

Do **not** expect `go build` to succeed from inside `archive/` alone.

## Live tree after cleanup

Active Markets V1 entrypoint: `apps/backend/cmd/markets-api`.
