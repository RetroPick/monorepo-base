# Phase 1 Backend Handoff — RetroPick Markets V1

## Summary

Backend-first Phase 1 public-read slice is implemented with Phase 1.1 runtime closure
(P1C-001 … P1C-009) on PR #7. The Go BFF exposes versioned Markets V1 read APIs
backed by Polymarket Gamma and CLOB anti-corruption clients, PostgreSQL
projections, deterministic catalog signals (`new_market`, `rule_changed`),
realtime envelope contracts (deferred public bridge), and bounded observability.
Scope is limited by ADR-010: no web/Android UI, trading, custody, signing, or PRISM.

**Draft PR:** https://github.com/RetroPick/monorepo-base/pull/7  
**Status:** `backend_runtime_closure_ready_for_independent_review` — not merge-ready until independent senior review.

## Phase 1.1 closure tasks

| ID | Title |
|----|-------|
| P1C-001 | Degraded worker state precedence in health reporting |
| P1C-002 | Bootstrap from existing PostgreSQL projection |
| P1C-003 | Advisory lock release hardening (hijack on unlock failure) |
| P1C-004 | Checkpoint error classification and scan-cycle safety |
| P1C-005 | Readiness HTTP integration tests (PostgreSQL 16) |
| P1C-006 | OpenAPI 3.1 runtime conformance (`TestOpenAPIRuntimeConformancePhaseOne`) |
| P1C-007 | CI checkout scoped; `scripts/check-gitlinks.sh` |
| P1C-008 | Signal transaction boundary verification |
| P1C-009 | Harness and evidence reconciliation |

## Verification run (closure)

| Command | Result |
|---------|--------|
| `go -C apps/backend test ./internal/markets/... -count=1` | pass |
| `go -C apps/backend test -race ./internal/markets/... -count=1` | pass |
| `go -C apps/backend test ./... -count=1` | pass |
| `go -C apps/backend test ./internal/markets -run TestOpenAPIRuntimeConformancePhaseOne -count=1` | pass |
| `go -C apps/backend build ./... && go vet ./...` | pass |
| `sqlc v1.28.0 generate && git diff --exit-code internal/dbqueries` | pass |
| `bash scripts/check-gitlinks.sh` | pass (archived gitlink documented) |

PostgreSQL integration (`DATABASE_URL`): locker, signals, readiness — CI `migration-v3` job.

## Open issues / blockers

| Issue | Severity | Notes |
|-------|----------|-------|
| Independent senior runtime review | high | Required before merge; PR remains draft |
| Vercel preview quota | external | Not a code blocker |
| Archived gitlink `archive/contracts/legacy-pool-v1/treasury-vault-eth` | low | No `.gitmodules`; documented; non-blocking for Markets CI |
| `price_move` / `liquidity_change` signals | deferred | Phase 1.2+; requires durable market-data observation pipeline |
| CLOB WebSocket public realtime bridge | deferred | `capabilities.realtime=false` |

## Suggested next step

Request **independent senior review** of PR #7 while keeping it draft. Do not start web/Android/wallet/trading until review completes and PR merges.

## Implementation notes

- Monetary values are decimal strings end-to-end; never float64 in public models.
- Realtime envelopes set `sequence` to null; consistency uses snapshot hash and forced resnapshot.
- Production config rejects non-official or non-HTTPS Gamma/CLOB hosts.
- Legacy epoch APIs remain frozen at `/api/v1/legacy/markets/*`.

## Related documents

- [AGENT_OPERATING_CONTRACT.md](AGENT_OPERATING_CONTRACT.md)
- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
- [PHASE-1-FOUNDATION-AND-READ-MARKETS.md](../phases/PHASE-1-FOUNDATION-AND-READ-MARKETS.md)
