# Current Implementation State

- **Branch:** `cursor/markets-v1-backend-phase1-5b74`
- **PR:** https://github.com/RetroPick/monorepo-base/pull/7 (draft)
- **Base SHA:** `05d85e1e0c95e8507a2b62dc316b00768b532d7a`
- **Evidence baseline SHA:** `adb0b1049ddc21a588587be21af7a7dcf43ef7d3`
- **Review task set:** `PR7-RV-001` … `PR7-RV-006` (independent review remediation)
- **Status:** `independent_review_remediation_complete` — draft PR; human merge approval required

## Independent review remediation (PR7-RV)

| ID | Outcome |
|----|---------|
| PR7-RV-001 | Advisory unlock failure closes hijacked raw connection; failure-path integration test added |
| PR7-RV-002 | Exact gitlink allowlist replaces `archive/*` bypass; `scripts/check-gitlinks_test.sh` in CI |
| PR7-RV-003 | `apps/retropick-landing-standalone` deletion retained — superseded by `apps/landing-web` |
| PR7-RV-004 | Reverted broad `pnpm-lock.yaml` churn; only `packages/polymarket/src/index.ts` NodeNext fix retained |
| PR7-RV-005 | Projection freshness separated from worker sync health in `evaluateCatalogHealth` |
| PR7-RV-006 | Removed self-referential Final HEAD; evidence uses baseline SHA + latest CI run |

## Capability honesty

- `capabilities.realtime=false` — `public_realtime_deferred`
- Operational signals: `new_market`, `rule_changed` only (catalog-driven)
- `price_move` / `liquidity_change` explicitly deferred

## Verification (local)

```bash
go -C apps/backend test ./internal/markets/... -count=1
go -C apps/backend test -race ./internal/markets/... -count=1
bash scripts/check-gitlinks.sh
bash scripts/check-gitlinks_test.sh
corepack enable && pnpm install --frozen-lockfile
```

PostgreSQL integration (`DATABASE_URL`): locker unlock-failure path, signals, readiness — CI `migration-v3` job.

**Graphify:** `SKIPPED_NOT_ENFORCED` when CLI unavailable locally; CI runs `scripts/check-graphify-freshness.sh`.

## Blockers

- Human merge approval after independent review
- Vercel preview quota (external)

## Next action

Push remediation commits; confirm GitHub Actions green; keep PR draft.
