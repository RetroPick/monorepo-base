# P13C-002 Verification Evidence

**Date:** 2026-08-08  
**Task:** Transactional observation and live signal pipeline (ADR-014 closure)  
**Worktree branch:** `codex/p13c-002-transactional-signal-pipeline`  
**Baseline SHA:** `0a871567b` (P13C-001 accepted)  
**Verdict:** ACCEPTED

## Summary

PR #9 landed `LiveSignalCommitter`, `SignalPipeline`, and `main.go` wiring. P13C-002 closes ADR-014 by adding postgres integration tests that prove the atomic transaction invariant, rollback safety, idempotency, fixed-point thresholds, and liquidity path — without changing production committer logic (tests pass against existing implementation).

## ADR-014 status

| Deliverable | Path | Status |
|-------------|------|--------|
| Observation tables | `000017_markets_v1_realtime.up.sql`, `000018_liquidity_epsilon_text.up.sql` | done |
| sqlc upsert/list queries | `apps/backend/sql/queries/markets_queries.sql` | done |
| Transactional committer | `apps/backend/internal/markets/postgres/live_signal_commit.go` | done |
| Pipeline wiring | `apps/backend/internal/markets/realtime/signal_pipeline.go`, `cmd/markets-api/main.go` | done |
| Integration proof | `apps/backend/internal/markets/postgres/live_signal_commit_test.go` | done (P13C-002) |

**Transactional invariant:** observation + signal + evidence share one `pgx` transaction; `TestHook` rollback proves no partial rows.

**Idempotency:** `UpsertMarketsSignal` on `idempotency_key`; evidence `ON CONFLICT (signal_id, evidence_index) DO NOTHING`.

**Replay:** duplicate bucket commits return same idempotency key; one effective signal row.

## PostgreSQL (local WSL)

| Item | Value |
|---|---|
| Version | PostgreSQL 16.14 (Ubuntu) |
| Data dir | `$HOME/tmp/retropick-p13c001-pgdata` |
| Port | 5434 |
| `DATABASE_URL` | `postgres://retropick:retropick@127.0.0.1:5434/retropick?sslmode=disable` |
| Migration | `db.RunMigrations(DATABASE_URL)` via integration test harness |

## Live signal commit tests

| Test | Category | Result |
|------|----------|--------|
| `TestLiveSignalCommitRollbackOnEvidenceFailure` | Rollback — zero partial rows | PASS |
| `TestLiveSignalCommitPersistsObservationOnlyWhenNoSignal` | Observation-only | PASS |
| `TestLiveSignalCommitPriceMoveAtomic` | Signal + evidence atomicity | PASS |
| `TestLiveSignalCommitPriceMoveIdempotentReplay` | Idempotent replay | PASS |
| `TestLiveSignalCommitPriceMoveConcurrentDuplicate` | Concurrent duplicate | PASS |
| `TestLiveSignalCommitPriceThresholdBoundary` | Fixed-point boundary | PASS |
| `TestLiveSignalCommitLiquidityChangeAtomic` | Liquidity path | PASS |
| `TestLiveSignalCommitLiquidityIdempotentReplay` | Liquidity replay | PASS |

## Verification commands

| Command | Result |
|---------|--------|
| `go -C apps/backend test ./internal/markets/postgres -run Signal -count=1 -v` | PASS (8 LiveSignal + catalog signal tests) |
| `go -C apps/backend test ./internal/markets/signals -count=1` | PASS |
| `go -C apps/backend test ./internal/markets/realtime -count=1` | PASS |
| `go -C apps/backend test ./internal/markets/... -count=1` | PASS |
| `go -C apps/backend test -race ./internal/markets/postgres ./internal/markets/signals ./internal/markets/realtime -count=1` | PASS |
| `go -C apps/backend build ./...` | PASS |
| `bash scripts/check-markets-openapi-drift.sh` | PASS |
| `bash scripts/check-markets-realtime-asyncapi-drift.sh` | PASS |

Toolchain: Go 1.26.5 (`~/toolchain/go1.26.5/bin/go`).

## Files changed

| File | Change |
|------|--------|
| `apps/backend/internal/markets/postgres/live_signal_commit_test.go` | Expanded ADR-014 integration test suite |

No schema, sqlc, or production committer changes required.

## Security review

| Severity | Finding |
|----------|---------|
| CRITICAL | None |
| HIGH | None |
| MEDIUM | None |

Notes: committer uses fixed-point domain types; bounded evidence (no raw WS payloads); `TestHook` is test-only; transactions scoped to DB only (no network I/O inside tx).

## Regression status

| Area | Status |
|------|--------|
| Catalog sync / catalog signals | PASS |
| Phase 1 REST reads | PASS |
| fe-v1 polling fallback | PASS (unchanged) |
| Realtime hub/runtime | PASS |
| OpenAPI / AsyncAPI drift | PASS |

## Known limitations

- `capabilities.features.intelligence` remains `false` until P13C-004 (not in P13C-002 scope).
- Phase 1.3 not complete — P13C-003 … P13C-008 remain open.
- BLK-006 single-replica limitation unchanged.

## BLK-004 resolution

Live observation-to-signal transactional wiring is implemented and evidenced. BLK-004 resolved under P13C-002.

## Remaining Phase 1.3 closure tasks

P13C-003 (E2E upstream→hub), P13C-004 (capability flags), P13C-005 (reconnect/resnapshot), P13C-006 (single-replica guard), P13C-007 (SEC-P13-001 owner rotation), P13C-008 (harness closure evidence).

## Next exact action

P13C-003 — upstream to hub end-to-end integration (may run in parallel with P13C-002 handoff review).
