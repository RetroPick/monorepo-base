# Current Implementation State

- **Branch:** `cursor/markets-v1-backend-phase1-5b74`
- **PR:** https://github.com/RetroPick/monorepo-base/pull/7 (draft)
- **Base SHA:** `05d85e1e0c95e8507a2b62dc316b00768b532d7a`
- **Final HEAD:** `14725abd3312889f253410835ec4ad653416ed98`
- **Closure task set:** `P1C-001` … `P1C-009` (Phase 1.1 runtime + CI closure)
- **Status:** `backend_runtime_closure_ready_for_independent_review` — draft PR; human review before merge

## Phase 1.1 closure (P1C)

| Task | Outcome |
|------|---------|
| P1C-001 | Degraded precedence in `evaluateCatalogHealth`; `ProjectionReadiness` semantics documented |
| P1C-002 | `CatalogWorker.Bootstrap` + passive replica projection refresh from durable state |
| P1C-003 | Advisory unlock failure hijacks connection; idempotent `Release`; pool stability tests |
| P1C-004 | `ErrCheckpointNotFound` vs DB errors; invalid cursor rejected; cycle reset preserves high watermark |
| P1C-005 | Readiness integration tests (Postgres 16): no projection → 503, bootstrap → 200, degraded → 200, over-age → 503, liveness → 200 |
| P1C-006 | `TestOpenAPIRuntimeConformancePhaseOne` validates all Phase 1 public endpoints via kin-openapi v0.145 |
| P1C-007 | Main CI checkout: removed recursive submodules; `scripts/check-gitlinks.sh` audits gitlinks |
| P1C-008 | Signal transaction boundaries verified: `new_market` / `rule_changed` in `ApplyPage` txn; price/liquidity deferred |
| P1C-009 | Harness, handoff, and PR evidence updated |

## Capability honesty

- `capabilities.realtime=false` — `public_realtime_deferred`
- Operational signals: `new_market`, `rule_changed` only (catalog-driven)
- `price_move` / `liquidity_change` explicitly deferred (no durable market-data observation producer)

## Verification (local, closure push)

```bash
go -C apps/backend test ./internal/markets/... -count=1                    # pass
go -C apps/backend test -race ./internal/markets/... -count=1              # pass
go -C apps/backend test ./internal/config ./internal/api ./migrations -count=1  # pass
go -C apps/backend test ./... -count=1                                       # pass
go -C apps/backend build ./... && go -C apps/backend vet ./...                # pass
sqlc v1.28.0 generate (apps/backend) && git diff --exit-code internal/dbqueries  # pass
bash scripts/check-gitlinks.sh                                               # pass (archived gitlink documented)
```

PostgreSQL integration (`DATABASE_URL`): locker, signals, readiness transitions — run in CI `migration-v3` job.

pnpm `--frozen-lockfile` fails locally (lockfile drift vs `apps/web/package.json`); rely on GitHub Actions `ci` job after checkout fix.

## Blockers

- Independent senior runtime review requested before squash-merge
- Vercel preview quota (external, not code)
- Archived unregistered gitlink `archive/contracts/legacy-pool-v1/treasury-vault-eth` — documented, non-blocking for Markets CI

## Next action

Inspect PR #7 GitHub Actions after push; keep draft; request independent review.
