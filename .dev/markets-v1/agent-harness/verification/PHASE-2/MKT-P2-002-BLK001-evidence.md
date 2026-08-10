# BLK-001 — Geoblock / GeoIP eligibility runtime

**Blocker:** BLK-001  
**Related task:** MKT-P2-002  
**Agent:** Chat Doc  
**Date:** 2026-08-09  
**Status:** **open (code complete; ops staging pending)** — adapters shipped; default deploy fail-closed

## Summary

GeoIP and Polymarket geoblock **HTTP adapters** and fail-closed evaluator pipeline are shipped and tested. **`eligible: true` is not reachable** in default deploy (no env): both resolvers remain unwired (`geo_unknown` / `geoblock_upstream_unavailable`). Backend integration proof exists via fixture tests including `TestProductionEligibilityEvaluatorEnvWiring`. **BLK-001 stays open** until ops injects both geo + geoblock env in staging/prod and staging proves allowed-region eligibility.

## Shipped checklist

| Item | Location | Evidence |
|------|----------|----------|
| Fail-closed evaluator pipeline | `apps/backend/internal/markets/eligibility/` | [MKT-P2-002-test-output.txt](./MKT-P2-002-test-output.txt) |
| `HTTPChecker` → Polymarket `/api/geoblock` | `eligibility/geoblock/client.go` | `geoblock/client_test.go` fixture + env tests |
| `HTTPResolver` GeoIP adapter | `eligibility/geo/resolver.go` | `geo/resolver_test.go` |
| `UnwiredChecker` (BLK-001 default geoblock) | `eligibility/geoblock/client.go` | `TestUnwiredCheckerAlwaysFailsClosed` |
| `UnwiredResolver` (BLK-001 default geo) | `eligibility/geo/resolver.go` | `TestUnwiredResolverAlwaysFailsClosed` |
| `ProductionEligibilityEvaluator` dual env wiring | `service.go` | `TestProductionEligibilityEvaluatorEnvWiring` |
| Geo + geoblock E2E eligible path | `evaluator_test.go` | `TestEvaluatorHTTPGeoAndGeoblockAllowedIntegration` |
| Shared evaluator in auth middleware | `cmd/api/main.go`, `cmd/markets-api/main.go` | Same `eligibilityEval` → `Service` + `auth.NewModule` |
| `GET /markets/eligibility` HTTP | `handler.go` | OpenAPI contract tests |
| Fail-closed metric | `metrics.go` | `retropick_markets_eligibility_fail_closed_total` |
| `/me/wallets` auth-only (not eligible-gated) | `router.go` | [MKT-P2-GLUE-session-wallet-evidence.md](./MKT-P2-GLUE-session-wallet-evidence.md) |
| `/me/balances` eligible-gated | `router.go` nested `RequireEligible` group | AUTH §5.1 |

### Verification commands (read-only reference)

```bash
cd apps/backend && go test ./internal/markets/eligibility/... ./internal/markets/auth/... ./internal/markets/ -run 'Eligibility|RequireEligible|ProductionEligibility' -count=1
```

Output archived: [MKT-P2-002-test-output.txt](./MKT-P2-002-test-output.txt).

## Remaining checklist

| Item | Blocker impact | Owner handoff |
|------|----------------|---------------|
| Ops inject `MARKETS_GEOIP_*` (+ optional `GEO_PROVIDER_API_KEY`) in staging/prod | Geo stays `UnwiredResolver` → `geo_unknown` | DevOps / ops |
| Ops inject `MARKETS_GEOBLOCK_BASE_URL` (+ optional `MARKETS_GEOBLOCK_PATH`) | Geoblock stays `UnwiredChecker` → `geoblock_upstream_unavailable` | DevOps / ops |
| Staging `GET /api/v1/markets/eligibility` → `eligible: true` (allowed IP/region) | Clears BLK-001 | QA / ops |
| Upstream revalidation (EV-011 geoblock endpoint) | Evidence register | Research |

## Default vs env-enabled behavior

| Deploy config | GeoIP | Geoblock checker | Typical reason | `eligible: true` |
|---------------|-------|------------------|----------------|------------------|
| Default (no env) | `UnwiredResolver` | `UnwiredChecker` | `geo_unknown` | **No** |
| Geoblock only | `UnwiredResolver` | `HTTPChecker` | `geo_unknown` | **No** |
| Geo only | `HTTPResolver` | `UnwiredChecker` | `geoblock_upstream_unavailable` | **No** |
| Both + allowed region | `HTTPResolver` | `HTTPChecker` allows | (passes checks) | **Yes** (target unblock state) |

Reason codes: see [AUTH §4.3](../../backend/AUTH_SESSION_AND_ELIGIBILITY.md#43-api-reason-codes).

## Middleware impact (AUTH §5)

| Route | Gate | While BLK-001 open |
|-------|------|--------------------|
| `GET /me/wallets` | Auth-only | **200** for SIWE session (empty `wallets[]` OK) |
| `GET /me/balances` | Auth + eligible | **403** `ELIGIBILITY_DENIED` |
| Future trading / funding | Auth + eligible | **403** until BLK-001 clears |

Do not copy wallets auth-only gate onto transactional routes.

## Related docs

- [AUTH_SESSION_AND_ELIGIBILITY.md §4.1 / §5](../../backend/AUTH_SESSION_AND_ELIGIBILITY.md)
- [BLOCKERS_AND_HUMAN_APPROVALS.md §3.1](../../BLOCKERS_AND_HUMAN_APPROVALS.md#31-blk-001-progress-note)
- [PRODUCTION_OPERATIONS_RUNBOOK.md §7.5](../../platform/PRODUCTION_OPERATIONS_RUNBOOK.md#75-eligibility-upstream-wiring-blk-001)
- [MKT-P2-002-evidence.md](./MKT-P2-002-evidence.md) (Chat M task evidence — separate file)
- [MKT-P2-GLUE-session-wallet-evidence.md](./MKT-P2-GLUE-session-wallet-evidence.md)

## Orchestrator patch (human applies)

**Do NOT clear BLK-001 or mark MKT-P2-002 `done` until staging integration proves `eligible: true` for an allowed region.**

### 1. Manifest — `unresolved_blockers` BLK-001

In `.dev/markets-v1/agent-harness/implementation-manifest.yaml`:

```yaml
  - id: BLK-001
    title: GeoIP + geoblock adapters shipped; ops staging proof pending
    phase: PHASE-2
    doc: .dev/markets-v1/agent-harness/verification/PHASE-2/MKT-P2-002-BLK001-evidence.md
```

### 2. Task graph — MKT-P2-002

In `.dev/markets-v1/agent-harness/task-graph.yaml`, for task `MKT-P2-002`:

```yaml
  status: blocked
  verification_evidence:
  - .dev/markets-v1/agent-harness/verification/PHASE-2/MKT-P2-002-BLK001-evidence.md
  - .dev/markets-v1/agent-harness/verification/PHASE-2/MKT-P2-002-test-output.txt
```

Do **not** advance `current_phase`.
