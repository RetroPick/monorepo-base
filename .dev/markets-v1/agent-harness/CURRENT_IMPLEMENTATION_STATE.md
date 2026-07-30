# Current Implementation State

- **Branch:** `cursor/markets-v1-backend-phase1-5b74`
- **PR:** https://github.com/RetroPick/monorepo-base/pull/7 (draft)
- **Base SHA:** `05d85e1e0c95e8507a2b62dc316b00768b532d7a` (main after PR #6 squash)
- **Remediation task set:** `MKT-P1R-FIX-001` … `MKT-P1R-FIX-010`
- **Status:** `backend_runtime_remediation_complete_pending_ci` — not merge-ready until GitHub Actions green + independent review

## Remediation completed (this session)

| Task | Fix |
|------|-----|
| FIX-001 | `CatalogWorker` implements live `CatalogWorkerState`; composition passes worker directly |
| FIX-002 | `CatalogLocker` pins one pool connection for session advisory lock lease |
| FIX-003 | Scan cycle resets cursor to `0` on short/empty terminal page; cycle metadata in checkpoint |
| FIX-004 | `CatalogSignalProducer` emits `new_market` / `rule_changed` inside `ApplyPage` transaction |
| FIX-005 | Single-read weak ETag on events list (`W/"..."`) with comma-separated `If-None-Match` |
| FIX-006 | OpenAPI tests reclassified as runtime smoke; full 3.1 conformance deferred |
| FIX-007 | Health reports operational signals/marketData; config rejects invalid ints and realtime |
| FIX-008 | `ListMarketsCatalogEventSummaries` join removes N+1; checkpoint metadata preserved on apply |
| FIX-009 | sqlc regenerated with **v1.28.0** |
| FIX-010 | Unit + integration tests (locker, signals, worker state, etag, health, sync cycle) |

## Verification (local)

```bash
go -C apps/backend test ./internal/markets/... -count=1          # pass
go -C apps/backend test -race ./internal/markets/... -count=1    # pass
go -C apps/backend test ./... -count=1                             # pass
go -C apps/backend build ./...                                     # pass
go -C apps/backend vet ./...                                       # pass
sqlc v1.28.0 generate (apps/backend)                               # pass, no drift after commit
```

PostgreSQL integration tests (`DATABASE_URL` set) cover locker exclusivity and signal idempotency in CI `migration-v3` job.

## Deferred / honest capability flags

- `capabilities.realtime=false` — `public_realtime_deferred`
- `price_move` / `liquidity_change` signals not produced (no durable market-data observation producer)
- Full OpenAPI 3.1 runtime conformance gate still open

## Blockers

- GitHub Actions merge gate not confirmed green on this push
- Vercel preview quota (external)
- Independent senior runtime review requested before squash-merge

## Next action

Push branch, inspect PR #7 CI, keep draft until human review.
