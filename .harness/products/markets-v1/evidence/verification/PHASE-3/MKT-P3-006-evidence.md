# Verification Evidence — MKT-P3-006

## Task ID

MKT-P3-006 — PHASE-3 exit gate verification

## Date / agent

2026-08-09 / Chat (Cursor)

## Environment

- Branch: working tree (RetroPick product repo)
- Commit: `591ad7137b68fd64dfbecbe2893aeabec6566b32`
- `current_phase`: **PHASE-2** (not advanced per user authorization)

## Depends on (upstream)

| Task | Evidence |
|------|----------|
| MKT-P3-001 | [MKT-P3-001-evidence.md](./MKT-P3-001-evidence.md) |
| MKT-P3-002 glue | [MKT-P3-002-glue-evidence.md](./MKT-P3-002-glue-evidence.md) |
| MKT-P3-003 | [MKT-P3-003-evidence.md](./MKT-P3-003-evidence.md) |
| MKT-P3-004 | [MKT-P3-004-evidence.md](./MKT-P3-004-evidence.md) |

## Commands executed

See [MKT-P3-006-test-output.txt](./MKT-P3-006-test-output.txt).

Summary:

```bash
cd apps/backend && go test ./internal/markets/orders/... ./internal/markets/... -count=1
cd apps/backend && go test ./internal/markets/ -run 'PreviewSignMatch|GoldenVectors|Glue|Submit' -count=1
cd apps/web && pnpm test:markets && pnpm typecheck
cd apps/web && pnpm test:e2e:markets
curl -s http://127.0.0.1:8080/api/v1/markets/capabilities  # order_submit:false when BFF up
/home/asyam/dev/set-up/cli/harness doctor
git diff --check
graphify update .
```

ADR-009 / invariant greps: [MKT-P3-006-invariant-greps.txt](./MKT-P3-006-invariant-greps.txt)

## Exit proof matrix

| # | Claim | Pass/Fail | Notes |
|---|-------|-----------|-------|
| 1 | `preview_sign_match` metric green | **Pass** | `TestMetricsRecordPreviewSignMatch`; golden vectors record match; submit re-verify records match/mismatch in `orders/submit.go` |
| 2 | E2E J03 (market/rules review) | **Pass** | `e2e-j03.spec.ts` — 3 cases (success, blocked eligibility, stale banner) |
| 3 | E2E J07 (preview-sign-submit) | **Pass** | `e2e-j07.spec.ts` — happy submit + kill-switch-off branch |
| 4 | Kill switch default fail-closed | **Pass** | Live capabilities `order_submit:false`; glue 503; E2E kill-switch spec; client gate in `useMarketsOrderSubmitCapability` |
| 5 | No ADR-009 product violations | **Pass** | Greps clean in `apps/` + OpenAPI; manual-only sign path in E2E |
| 6 | Manifest J-03 typo documented | **Pass** | Task-graph cites "J-03"; UX spec J03 = market review, J07 = trading — both implemented and mapped here |

## Journey mapping (manifest vs UX spec)

| Harness/manifest | UX journey (`ERROR_DEGRADED_AND_RECOVERY_UX.md`) | E2E spec |
|------------------|-----------------------------------------------|----------|
| "e2e journey J-03 pass" (traceability typo for submit) | J07 order preview/sign/submit | `e2e-j07.spec.ts` |
| (implicit market path) | J03 market and rules review | `e2e-j03.spec.ts` |

## Code added this task

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/metrics.go` | `RecordPreviewSignMatch`, Prometheus `retropick_markets_preview_sign_match_total` |
| `apps/backend/internal/markets/metrics_test.go` | `TestMetricsRecordPreviewSignMatch` |
| `apps/backend/internal/markets/orders/submit.go` | Record match/mismatch on content-hash re-verify |
| `apps/backend/internal/markets/orders/preview_test.go` | Golden vector records preview_sign_match |
| `apps/web/src/products/markets/e2e/e2eHarness.ts` | Playwright wallet/session/sign bridge |
| `apps/web/src/products/markets/wallet/hooks/useMarketsWalletConnect.ts` | E2E wallet override |
| `apps/web/src/products/markets/wallet/providers/MarketsWalletSessionProvider.tsx` | E2E session fast-path |
| `apps/web/src/products/markets/trading/hooks/useOrderTicketFlow.ts` | E2E sign override |
| `apps/web/playwright.config.ts` | Playwright harness (port 3011 dev server) |
| `apps/web/e2e/markets/**` | Fixtures, BFF mocks, J03/J07 specs |
| `apps/web/package.json` | `@playwright/test`, `test:e2e:markets` script |

## Traceability

| Requirement | Test / artifact | Result |
|-------------|-----------------|--------|
| MKT-FR-030 | Golden vectors + E2E J07 hash binding | Pass |
| MKT-FR-031 | E2E J07 submit (mock BFF) + glue submit tests | Pass (mock/stub; no live CLOB) |
| MKT-SEC-002 | Preview-before-sign + `preview_sign_match` | Pass |
| MKT-FR-091 / ADR-009 | Invariant greps + trading copy tests | Pass |

## Task-graph acceptance criteria

| Criterion | Result |
|-----------|--------|
| `preview_sign_match` metric green | Pass |
| e2e journey J-03 pass | Pass — J03 + J07 specs (see mapping) |

## Explicit non-claims

- **`current_phase` not advanced** — remains PHASE-2 until orchestrator authorizes
- **PHASE-4 not started** — MKT-P4-001 not opened
- **No mainnet / live CLOB submit** — BLK-004 remains open; E2E uses mocked BFF
- **MKT-P3-005 reconcile worker** — separate task; not required for this verification artifact but noted in phase gate

## Sign-off

- [x] Exit criteria verified with command output
- [x] Evidence links upstream P3-001–004
- [x] No secrets in artifact
- [x] Phase advance explicitly **not** performed
