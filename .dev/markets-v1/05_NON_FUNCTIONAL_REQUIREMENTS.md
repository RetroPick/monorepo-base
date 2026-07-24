# Non-Functional Requirements

**Status:** draft
**Owner:** platform-orchestrator
**Last updated:** 2026-07-24
**Product:** RetroPick Markets V1

## 1. Purpose

Performance, availability, security, cost, accessibility, and operational NFRs for Markets V1.

## 2. Scope

### In scope

- RetroPick Markets V1 (web, Go BFF, native Android Jetpack Compose).

### Out of scope

- PRISM protocol implementation and `contracts/prism/`.
- Legacy epoch MarketEngine extension (`/api/v1/legacy/markets/*`).
- Custom RetroPick exchange or outcome-token issuance (ADR-001).

## 3. Prerequisites

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [.dev/MARKETS.md](../../MARKETS.md)
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) (R0–R3 restructure)

## 4. Authoritative sources

| Source | URL | Retrieved | Confidence |
|--------|-----|-----------|------------|
| Polymarket docs | https://docs.polymarket.com/ | 2026-07-24 | partially verified |
| CLOB V2 migration | https://docs.polymarket.com/v2-migration | 2026-07-24 | partially verified |
| OpenAPI (repo) | `schemas/openapi/markets-v1.yaml` | 2026-07-24 | verified |
| Monorepo architecture | `docs/ARCHITECTURE.md` | 2026-07-24 | verified |

## 5. Current state

See [EXISTING_REPOSITORY_AUDIT.md](../architecture/EXISTING_REPOSITORY_AUDIT.md).

## 6. Target design

Measurable SLOs with verification in PHASE-6 hardening.

## 7. Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Custom RetroPick exchange | ADR-001: Polymarket is venue |
| Direct Gamma/CLOB from clients in prod | ADR-002: BFF anti-corruption layer |
| Extend legacy epoch APIs | Frozen at `/api/v1/legacy/markets/*` |

## 8. Decisions

- Polymarket is venue authority (ADR-001).
- BFF anti-corruption layer at `apps/backend/internal/markets/` (ADR-002).
- Shared OpenAPI contract for web and Android (ADR-004).

## 9. Data and control flows

```mermaid
flowchart LR
  Web[apps/web] --> BFF[internal/markets]
  Android[apps/android] --> BFF
  BFF --> Gamma[Polymarket_Gamma]
  BFF --> CLOB[Polymarket_CLOB_V2]
  Legacy[/api/v1/legacy/markets] -. frozen .-> Epoch[legacy/domain]
```

## 10. Failure and recovery

- Fail closed on unknown eligibility (`eligible: false`).
- Read-only degradation when upstream Gamma/CLOB unavailable.
- No silent order resubmission on timeout.

## 11. Security

- No raw private-key custody by RetroPick.
- Preview-before-sign for every asset transformation.
- Secrets outside Git; redact in logs and audit.

## 12. Observability

- Metrics, logs, and traces per [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](../platform/OBSERVABILITY_SLOS_AND_ALERTS.md).
- Catalog freshness, upstream error rate, and eligibility check latency are launch-critical.

## 13. Test strategy

- See [testing/MASTER_TEST_PLAN.md](../testing/MASTER_TEST_PLAN.md).

## 14. Rollout and rollback

- Feature flags via `/markets/capabilities`; order-submission kill switch in later phases.
- See [platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md](../platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md).

## 15. Open questions

- [research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md](../research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md)

## 16. Acceptance criteria

- Linked in [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## NFR catalog

| ID | Category | Requirement | Target | Phase |
|----|----------|-------------|--------|-------|
| MKT-NFR-001 | Performance | Event catalog freshness | p95 < 60s | PHASE-1 |
| MKT-NFR-002 | Performance | Order book snapshot age | p95 < 5s | PHASE-1 |
| MKT-NFR-010 | Availability | Markets BFF uptime | 99.5% / month | PHASE-6 |
| MKT-NFR-020 | Security | Secrets in env only | 100% | PHASE-0 |
| MKT-NFR-030 | Cost | Baseline infra | < USD 100/mo | PHASE-1 |
| MKT-NFR-040 | Accessibility | WCAG 2.1 AA critical paths | Pass | PHASE-3 |
| MKT-NFR-050 | Mobile | Android cold start | < 2s p75 | PHASE-5 |
| MKT-NFR-060 | Data | Fixed-point money | No float in APIs | PHASE-1 |
| MKT-NFR-070 | Ops | Backup RPO | < 24h | PHASE-6 |
| MKT-AND-001 | Android | Jetpack Compose only | Enforced | PHASE-5 |
| MKT-WEB-001 | Web | OpenAPI-generated types | Enforced | PHASE-1 |
| MKT-POLY-001 | Upstream | CLOB V2 only | No V1 assumptions | PHASE-3 |

## Degraded modes

- Upstream outage → read-only catalog with banner.
- Eligibility unknown → fail closed (`eligible: false`).
