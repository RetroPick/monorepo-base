# P13C-001 Verification Evidence

**Date:** 2026-08-06  
**Task:** Catalog-backed token registry wiring and fail-closed validation  
**Worktree branch:** `codex/p13c-001-catalog-token-registry`  
**Verdict:** ACCEPTED (independent review + security review PASS)

## Error classification decision

AsyncAPI control `error.code` is free-form. Client treats all error events as polling fallback.

| Condition | `code` | Fail-closed |
|---|---|---|
| Nil validator / registry not bootstrapped or not ready | `validation_unavailable` | Yes |
| Unknown token or wrong market after successful bootstrap | `invalid_token` | Yes |
| All rejection paths | Hub, Planner, `OnSubscribe` = 0 invocations | Yes |

Implementation: `SubscribeErrorCode()` in `apps/backend/internal/markets/realtime/validation.go`; production validator is `*CatalogTokenRegistry.ValidateToken`.

## Refresh failure decision

Failed bootstrap/refresh builds a replacement map in memory but swaps only on success. On error after prior bootstrap: `ready=false`, prior snapshot preserved, `ValidateToken` returns `ErrRegistryNotReady`. `main.go` calls `SetRegistryReady(false)` when catalog-sync refresh fails.

## PostgreSQL (local WSL)

| Item | Value |
|---|---|
| Version | PostgreSQL 16.14 (Ubuntu) |
| Data dir | `$HOME/tmp/retropick-p13c001-pgdata` |
| Port | 5434 |
| Migration | `db.RunMigrations(DATABASE_URL)` via integration test harness (same embedded migrations as CI) |

## CatalogToken DB-backed tests (non-skipped)

| Run | PASS | SKIP | FAIL |
|---|---:|---:|---:|
| `-run CatalogToken -count=1 -v` | 14 | 0 | 0 |
| `-run CatalogToken -race -count=1 -v` | 14 | 0 | 0 |
| `-run CatalogToken -shuffle=on -count=10` | 10 packages ok | 0 | 0 |

Proofs covered: bootstrap, open-market filter, closed/tombstoned exclusion, exact pairing, unknown-token rejection, refresh add/remove/replace, multi-page pagination, failed bootstrap/refresh snapshot integrity, lookup cannot mark bootstrapped/ready.

## Additional verification (2026-08-06)

- `go -C apps/backend test -mod=readonly -race ./internal/markets/postgres ./internal/markets/realtime -count=1` — PASS
- `go -C apps/backend test -mod=readonly ./internal/markets/... -count=1` — PASS
- `go -C apps/backend test -mod=readonly ./... -count=1` — PASS
- `go -C apps/backend vet -mod=readonly ./internal/markets/...` — PASS
- Node 22: `@retropick/markets-v1` 75 tests PASS; `@retropick/polymarket` 20 tests PASS
- OpenAPI drift — PASS; AsyncAPI drift — PASS
- Security review — PASS; independent review — ACCEPTED after `subscribeErrorMessage` alignment fix

## BLK-003 resolution

CatalogTokenRegistry is bootstrapped/refreshed in `markets-api` main; realtime handler validates against snapshot-only registry with fail-closed error taxonomy.
