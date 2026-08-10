# MKT-P2-002 — Fail-closed eligibility service

**Task:** MKT-P2-002  
**Agent:** Chat M  
**Date:** 2026-08-09  
**Status:** **blocked** (BLK-001 — geoblock upstream not wired)

## Summary

Shipped fail-closed eligibility evaluator at `apps/backend/internal/markets/eligibility/` with HTTP wiring, metrics, unit/contract tests, and AUTH doc updates. Default deployment path returns `eligible: false` — no allow-all stub.

## BLK-001

| Field | Value |
|-------|-------|
| Blocker | BLK-001 Geoblock eligibility upstream not wired |
| Current behavior | `UnwiredChecker` → `geoblock_upstream_unavailable` (after geo resolves) or `geo_unknown` (default unwired GeoIP) |
| Unblock criteria | Polymarket CLOB `/geoblock` adapter; EV-011 revalidation; integration test vs fixture/sandbox |

Task remains **blocked** until BLK-001 clears. Do not mark `done` with fabricated upstream success.

## Verification

```bash
cd apps/backend && go test ./internal/markets/... ./internal/markets/eligibility/...
```

Output: [MKT-P2-002-test-output.txt](./MKT-P2-002-test-output.txt) — all packages `ok`.

Metric: `retropick_markets_eligibility_fail_closed_total` increments on deny decisions.

## Handoff — Chat N (MKT-P2-001 session auth)

1. **Do not duplicate** eligibility logic in auth middleware — call `eligibility.Evaluator` or read cached decision (`mkt:eligibility:{ip_hash}` when Redis lands).
2. **Inject** `AccountContext` at `Service.Eligibility` when session is authenticated (standing, terms version, sanctions flag).
3. **Middleware order:** extract session → load user → eligibility cache → handler gate (Chat N owns 1–2 and gate).
4. **Shared doc:** AUTH §3/§5/§6 session-only; eligibility semantics in §4 (Chat M).
5. **Abuse:** geo mismatch (session vs IP) must re-run same evaluator per ABUSE_FRAUD_AND_RATE_LIMITS.md.

## Changed paths

- `apps/backend/internal/markets/eligibility/**` (new)
- `apps/backend/internal/markets/service.go`
- `apps/backend/internal/markets/handler.go`
- `apps/backend/internal/markets/metrics.go`
- `apps/backend/internal/markets/*_test.go`
- `.dev/markets-v1/backend/AUTH_SESSION_AND_ELIGIBILITY.md`
