# Requirements to Task Traceability

**Status:** draft
**Owner:** platform-orchestrator
**Last updated:** 2026-07-24
**Product:** RetroPick Markets V1

## 1. Purpose

Map requirement IDs to architecture components, phases, tasks, tests, and runbooks.

## 2. Scope

### In scope

- RetroPick Markets V1 (web, Go BFF, native Android Jetpack Compose).

### Out of scope

- PRISM protocol implementation and `contracts/prism/`.
- Legacy epoch MarketEngine extension (`/api/v1/legacy/markets/*`).
- Custom RetroPick exchange or outcome-token issuance (ADR-001).

## 3. Prerequisites

- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
- [task-graph.yaml](task-graph.yaml)

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

Documented in this file.

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

## Traceability matrix (excerpt)

| Requirement | Component | Phase | Task | Test | Metric |
|-------------|-----------|-------|------|------|--------|
| MKT-FR-001 | BFF catalog | PHASE-1 | MKT-P1-002 | handler_test | catalog_freshness_p95 |
| MKT-FR-021 | eligibility | PHASE-2 | MKT-P2-002 | contract | eligibility_fail_closed |
| MKT-FR-030 | order preview | PHASE-3 | MKT-P3-001 | golden vector | preview_sign_match |
| MKT-SEC-001 | wallet | PHASE-2 | MKT-P2-001 | security review | key_custody_incidents |
| MKT-NFR-001 | Gamma ingest | PHASE-1 | MKT-P1-002 | load test | freshness_p95 |

## Rules

- No launch-critical requirement without a task and test mapping.
- Update this file when adding requirements or tasks.
