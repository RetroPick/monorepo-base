# Requirements and Traceability

**Status:** draft
**Owner:** platform-orchestrator
**Last updated:** 2026-07-24
**Product:** RetroPick Markets V1

## 1. Purpose

Canonical requirement IDs and mapping to phase, task, test, and metric.

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

No launch-critical requirement unmapped.

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

            ## Functional requirements

    | ID | Description | Phase | Task |
    |----|-------------|-------|------|
    | MKT-FR-001 | List normalized Polymarket events | PHASE-1 | MKT-P1-002 |
| MKT-FR-002 | Show market rules and resolution source | PHASE-1 | MKT-P1-001, MKT-P1-004, MKT-P1-006 |
| MKT-FR-010 | Order book snapshot with staleness indicator | PHASE-1 | MKT-P1-002, MKT-P1-005, MKT-P1-006 |
| MKT-FR-020 | Wallet connect without key custody | PHASE-2 | MKT-P2-001 |
| MKT-FR-021 | Fail-closed eligibility check | PHASE-2 | MKT-P2-002 |
| MKT-FR-030 | Order preview equals signed payload | PHASE-3 | MKT-P3-001 |
| MKT-FR-031 | Submit limit order via CLOB V2 | PHASE-3 | MKT-P3-002 |
| MKT-FR-040 | Positions reconcile with venue | PHASE-4 | MKT-P4-001 |
| MKT-FR-050 | Deterministic public signal foundation; identity and delivery deferred | PHASE-1 | MKT-P1-008 |
| MKT-FR-060 | Whale/large-trade feed with reason codes | PHASE-4 | MKT-P4-003 |
| MKT-FR-090 | Combos only when capability flag true | PHASE-8 | MKT-P8-001 |

    ## Security requirements

    | ID | Description | Phase |
    |----|-------------|-------|
    | MKT-SEC-001 | No raw private key storage | PHASE-2 |
    | MKT-SEC-002 | Preview-before-sign binding | PHASE-3 |

    ## Non-functional requirements

    | ID | Description | Phase |
    |----|-------------|-------|
    | MKT-NFR-001 | Catalog freshness p95 < 60s | PHASE-1 |
    | MKT-NFR-010 | API availability 99.5% monthly | PHASE-6 |
| MKT-NFR-002 | Invalid, stale, or sequence-ambiguous books are never labeled live | PHASE-1 |
| MKT-NFR-060 | Monetary values use base units or decimal strings, never binary floating point | PHASE-1 |

    ## Traceability chain

    ```
    requirement → evidence → component → phase → task → test → metric → runbook
    ```

    See [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).
