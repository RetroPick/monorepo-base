# Verification Evidence — MKT-P1-010

## Task ID

MKT-P1-010 — PHASE-1 exit gate verification

## Date / agent

2026-08-09 / Chat K

## Environment

- Branch: `main`
- Commit: `a5ffb0108f777a1a7afb9b605ca82dbdd3ecb8fd`

## Commands executed

### Backend (008, 009, 005)

```bash
export PATH="/usr/local/go/bin:$PATH"
cd apps/backend
go test ./internal/markets/... -count=1
go test ./internal/markets/... -run 'TestOpenAPIRuntimeConformancePhaseOne|TestMarketsOpenAPIContainsPhaseOneReadContract|TestPhaseOne' -count=1 -v
go test ./internal/markets/ -run 'TestMetricsExposeBoundedPrometheusSeries' -count=1 -v
go test ./internal/markets/syncworker/ -run 'TestObserveSyncRunRecordsMetrics|TestClassifyGammaErrorKind' -count=1 -v
go test ./internal/markets/signals/... ./internal/markets/postgres/... -run 'Signal|Evidence|Deterministic|ApplyPage' -count=1 -v
```

### Web (004)

```bash
cd apps/fe-v1
pnpm exec vitest run src/features/markets/contract/
pnpm exec vitest run src/features/markets/components/marketsComponents.test.tsx src/features/markets/lib/marketsLib.test.ts
pnpm exec vitest run --config ../web/src/products/markets/vitest.config.ts
```

### Harness / invariants

```bash
cli/harness doctor
git diff --check
# Invariant greps — see MKT-P1-010-invariant-greps.txt
```

## Results

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Backend conformance (008) | Pass | See MKT-P1-008-evidence.md |
| Metrics wiring (009) | Pass | See MKT-P1-009-evidence.md |
| Signal determinism (005) | Pass | Engine tests pass; postgres integration skipped (no DATABASE_URL) |
| fe-v1 contract tests | Pass | 7 tests, 4 files |
| Web product vitest | Pass | 13 tests incl. stale freshness, copy guard, MarketDetailPage |
| fe-v1 FreshnessBadge tests | Pass | Fresh state rendered |
| Invariant greps | Pass | Doc-normative hits only; product modules clean |
| Wallet negative grep | Pass | 0 matches in markets feature modules |
| Harness doctor | Pass | 0 errors, 0 warnings |
| git diff --check | Pass | Clean |
| Live metrics scrape | N/A | markets-api not running |

## Manual stale UX checklist (J14 — code + unit test attestation)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | FreshnessBadge on market detail | Pass | `MarketDetailPolymarket.tsx` L163; fe-v1 + web product tests |
| 2 | Stale state explicit in UI | Pass | `freshness.test.ts`: `state: "stale"` → `"Stale (cached)"`; backend `orderbook_stale_when_snapshot_age_exceeded` |
| 3 | No order submit CTA | Pass | "Order placement is unavailable in Phase 1.2" / Trading unavailable panel |
| 4 | Canonical ID in routes | Pass | `isPolymarketResourceId`; OpenAPI conformance upstream ID normalization |
| 5 | Rules/description/provenance | Pass | web `MarketDetailPage.test.tsx`, `ResolutionPanel.test.tsx` |

## Known debt (non-blocking)

- fe-v1 global `Header` `WalletButton` — accepted pre-PHASE-2 debt; MKT-P2-001 must quarantine
- `StaleBanner` in web product unused in fe-v1 deploy surface
- fe-v1 `OrderBookPanel` lacks embedded FreshnessBadge (market header has badge)
- Postgres signal integration tests skipped without DATABASE_URL
- No Playwright E2E for J14 yet
- WS gap conformance tracked for PHASE-6

## Traceability

| Requirement | Test / artifact | Result |
|-------------|-----------------|--------|
| MKT-FR-001 | OpenAPI events + fe-v1 contract | Pass |
| MKT-FR-002 | Market detail + ResolutionPanel | Pass |
| MKT-FR-010 | Stale orderbook conformance + freshness.test.ts | Pass |
| MKT-NFR-001 | catalog_freshness_within_slo_total metric | Pass (unit) |
| MKT-NFR-060 | OpenAPI + invariant greps | Pass |
| MKT-WEB-001 | Contract + network boundary tests | Pass |
| MKT-FR-050 | Signal determinism engine tests | Pass |
| No wallet/submit PHASE-1 | Negative greps + disabled trade UI | Pass |

## Sign-off

- [x] Acceptance criteria met
- [x] No secrets in artifact
