# Verification Evidence — MKT-P1-008

## Task ID

MKT-P1-008 — Contract conformance tests

## Date / agent

2026-08-09 / Chat K (MKT-P1-010 exit gate aggregation)

## Environment

- Branch: `main`
- Commit: `a5ffb0108f777a1a7afb9b605ca82dbdd3ecb8fd`

## Commands executed

```bash
export PATH="/usr/local/go/bin:$PATH"
cd apps/backend
go test ./internal/markets/... -count=1
go test ./internal/markets/... \
  -run 'TestOpenAPIRuntimeConformancePhaseOne|TestMarketsOpenAPIContainsPhaseOneReadContract|TestPhaseOne' \
  -count=1 -v
```

## Results

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Full markets package | Pass | 11 packages ok |
| `TestOpenAPIRuntimeConformancePhaseOne` | Pass | All 17 subtests including stale orderbook |
| `TestMarketsOpenAPIContainsPhaseOneReadContract` | Pass | YAML v1.1.1 structural guard |
| `TestPhaseOneReadHandlerSemantics` | Pass | 6 handler paths with semantic checks |
| No PHASE-2+ paths in suite | Pass | Wallet/order submit/funding not tested |

## Traceability

| Requirement | Test | Result |
|-------------|------|--------|
| MKT-FR-001 | `TestOpenAPIRuntimeConformancePhaseOne/events` | Pass |
| MKT-FR-002 | `TestOpenAPIRuntimeConformancePhaseOne/market detail` | Pass |
| MKT-FR-010 | `TestOpenAPIRuntimeConformancePhaseOne/orderbook_stale_when_snapshot_age_exceeded` | Pass |
| MKT-NFR-060 | `assertNoBinaryFloats` / decimal string guards | Pass |
| MKT-WEB-001 | `TestMarketsOpenAPIContainsPhaseOneReadContract` | Pass |

## Sign-off

- [x] Acceptance criteria met
- [x] No secrets in artifact
