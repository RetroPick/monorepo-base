# Scope and Capability Matrix

**Status:** draft
**Owner:** platform-orchestrator
**Last updated:** 2026-07-31
**Product:** RetroPick Markets V1

## 1. Purpose

Map every Markets capability to upstream support, RetroPick components, phase, and requirement ID.

## 2. Scope

### In scope

- RetroPick Markets V1 (`apps/fe-v1`, Go BFF, native Android Jetpack Compose).

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

Full matrix per master prompt §6; Combos capability-gated until official support verified.

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
  FE[apps/fe-v1] --> BFF[internal/markets]
  Android[apps/android] --> BFF
  BFF --> Gamma[Polymarket_Gamma]
  BFF --> CLOB[Polymarket_CLOB_V2]
  BFF --> WS[Polymarket_WS]
  WS --> Hub[realtime/hub]
  Hub --> FE
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

## Capability matrix (excerpt)

| Capability | Upstream | BFF | Web (fe-v1) | Android | Phase | Req | Status |
|---|---|---|---|---|---|---|---|
| public event feed | Gamma | BFF | fe-v1 | android | PHASE-1 | MKT-FR-001 | done |
| order-book snapshot (REST) | CLOB | BFF | fe-v1 | android | PHASE-1 | MKT-FR-010 | done |
| order-book realtime (WS) | CLOB WS | BFF hub | fe-v1 | — | PHASE-1.3 | MKT-FR-010-RT | partial — P13C closure |
| catalog signals (new_market, rule_changed) | Gamma | BFF | fe-v1 | — | PHASE-1 | MKT-FR-050-CAT | done (MKT-P1-008) |
| live signals (price_move, liquidity_change) | CLOB WS | BFF | fe-v1 | — | PHASE-1.3 | MKT-FR-050-LIVE | **pending** (P13C-002) |
| wallet connect | — | BFF | fe-v1 | android | PHASE-2 | MKT-FR-020 | planned — blocked on PHASE-1.3 |
| limit buy/sell | CLOB | BFF | fe-v1 | android | PHASE-3 | MKT-FR-030 | planned |
| positions & PnL | CLOB | BFF | fe-v1 | android | PHASE-4 | MKT-FR-040 | planned |
| geoblock | upstream | BFF | fe-v1 | android | PHASE-2 | MKT-FR-021 | planned (BLK-001) |
| Combos | upstream | BFF | fe-v1 | android | PHASE-8 | MKT-FR-090 | gated |

## Phase 1.3 unresolved blockers

| ID | Capability impact |
|----|-------------------|
| BLK-003 | Token registry — hub cannot fail-closed on unknown tokens |
| BLK-004 | Live signal pipeline — intelligence capability must stay false |
| BLK-005 | SEC-P13-001 rotation — production release blocked |
| BLK-006 | Single-replica — multi-replica duplicates upstream WS |
