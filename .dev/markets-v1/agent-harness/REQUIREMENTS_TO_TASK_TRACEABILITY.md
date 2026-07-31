# Requirements to Task Traceability

**Status:** draft — Phase 1.3 runtime closure in progress
**Owner:** platform-orchestrator
**Last updated:** 2026-07-31
**Product:** RetroPick Markets V1

## 1. Purpose

Map requirement IDs to architecture components, phases, tasks, tests, and runbooks.

## 2. Scope

### In scope

- RetroPick Markets V1 (`apps/fe-v1`, Go BFF, native Android Jetpack Compose).

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
| Polymarket docs | https://docs.polymarket.com/ | 2026-07-31 | partially verified |
| CLOB V2 migration | https://docs.polymarket.com/v2-migration | 2026-07-31 | partially verified |
| OpenAPI (repo) | `schemas/openapi/markets-v1.yaml` | 2026-07-31 | verified |
| Phase 1.3 architecture | `docs/architecture/markets-phase-1-3-realtime-intelligence.md` | 2026-07-31 | verified |

## 5. Current state

Phase 1.3 implementation slice landed (PR #8). Runtime closure tasks P13C-000 … P13C-008 are open. See [CURRENT_IMPLEMENTATION_STATE.md](CURRENT_IMPLEMENTATION_STATE.md).

## 6. Target design

Documented in this file and Phase 1.3 architecture spec.

## 7. Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Custom RetroPick exchange | ADR-001: Polymarket is venue |
| Direct Gamma/CLOB from clients in prod | ADR-002: BFF anti-corruption layer |
| Extend legacy epoch APIs | Frozen at `/api/v1/legacy/markets/*` |
| Hash-chain delta semantics for WS | ADR-012: upstream hash is evidence, not chain link |

## 8. Decisions

- Polymarket is venue authority (ADR-001).
- BFF anti-corruption layer at `apps/backend/internal/markets/` (ADR-002).
- Shared OpenAPI contract for web and Android (ADR-004).
- Snapshot-first reconciler (ADR-012); local delivery ordering (ADR-013).
- Observation persistence design accepted; transactional wiring pending (ADR-014, P13C-002).

## 9. Data and control flows

```mermaid
flowchart LR
  FE[apps/fe-v1] --> BFF[internal/markets]
  Android[apps/android] --> BFF
  BFF --> Gamma[Polymarket_Gamma]
  BFF --> CLOB[Polymarket_CLOB_V2]
  BFF --> WS[Polymarket_WS_market]
  WS --> Reconciler[marketdata/reconciler]
  Reconciler --> Hub[realtime/hub]
  Hub --> FE
  Reconciler -.->|P13C-002 pending| Signals[signals + postgres]
  Legacy[/api/v1/legacy/markets] -. frozen .-> Epoch[legacy/domain]
```

## 10. Failure and recovery

- Fail closed on unknown eligibility (`eligible: false`).
- Read-only degradation when upstream Gamma/CLOB unavailable.
- Realtime reconnect forces resnapshot; `deliveryCounter` gaps emit `resync.required`.
- No silent order resubmission on timeout.

## 11. Security

- No raw private-key custody by RetroPick.
- Preview-before-sign for every asset transformation (Phase 2+).
- Secrets outside Git; redact in logs and audit.
- SEC-P13-001: `ROTATION_PENDING_OWNER` blocks production release (P13C-007).

## 12. Observability

- Metrics, logs, and traces per [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](../platform/OBSERVABILITY_SLOS_AND_ALERTS.md).
- Catalog freshness, upstream error rate, realtime coverage ratio, and book state counts are Phase 1.3 critical.

## 13. Test strategy

- See [testing/MASTER_TEST_PLAN.md](../testing/MASTER_TEST_PLAN.md).
- Phase 1.3 adds fake upstream E2E (P13C-003) and transactional signal replay (P13C-002).

## 14. Rollout and rollback

- Feature flags via `/markets/capabilities`; `RealtimeEnabled` config gate.
- Rollback: disable realtime; REST polling and catalog reads remain.
- See [platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md](../platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md).

## 15. Open questions

- [research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md](../research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md)

## 16. Acceptance criteria

- Linked in this file and [task-graph.yaml](task-graph.yaml) P13C tasks.

## Traceability matrix

| Requirement | Component | Phase | Task | Test | Metric |
|-------------|-----------|-------|------|------|--------|
| MKT-FR-001 | BFF catalog | PHASE-1 | MKT-P1-001, P1-002, P1-004, P1-006 | OpenAPI, Gamma, catalog, handler tests | catalog freshness and records processed |
| MKT-FR-002 | rules/provenance | PHASE-1 | MKT-P1-001, P1-004, P1-006 | mapping, rule hash, handler tests | rule-change signal count |
| MKT-FR-010 | market data | PHASE-1 | MKT-P1-002, P1-005, P1-006 | CLOB, book, API tests | book state and resync count |
| MKT-FR-010-RT | realtime order book | PHASE-1.3 | MKT-P13-002, MKT-P13-005, P13C-003, P13C-005 | reconciler, hub, E2E tests | books by state, reconnect count |
| MKT-FR-050-CAT | catalog deterministic signals | PHASE-1 | MKT-P1-008, P1C-008 | replay, dedupe, retraction tests | new_market, rule_changed count |
| MKT-FR-050-LIVE | live observation signals | PHASE-1.3 | MKT-P13-004, P13C-002 | observation replay, idempotency tests | price_move, liquidity_change count |
| MKT-NFR-001 | catalog freshness | PHASE-1 | MKT-P1-004, P1-009 | bounded sync and metrics tests | last successful sync timestamp |
| MKT-NFR-002 | no invalid book labeled live | PHASE-1, 1.3 | MKT-P1-005, MKT-P13-002, P13C-005 | crossed, stale, reconnect tests | books by state |
| MKT-NFR-003 | single-replica realtime | PHASE-1.3 | P13C-006 | config guard test | replica warning events |
| MKT-NFR-060 | fixed-point values | PHASE-1, 1.3 | MKT-P1-001, P13 observation schema | decimal boundary tests | validation errors |
| MKT-FR-021 | eligibility | PHASE-2 | MKT-P2-002 | contract | eligibility_fail_closed |
| MKT-FR-030 | order preview | PHASE-3 | MKT-P3-001 | golden vector | preview_sign_match |
| MKT-SEC-001 | wallet | PHASE-2 | MKT-P2-001 | security review | key_custody_incidents |
| MKT-SEC-P13-001 | exposed credential rotation | PHASE-1.3 | P13C-007 | owner confirmation | rotation gate |

## Signal pipeline split (honesty)

| Signal types | Producer | Transaction boundary | Phase | Status |
|--------------|----------|---------------------|-------|--------|
| `new_market`, `rule_changed` | `CatalogSignalProducer` | Inside catalog `ApplyPage` | PHASE-1 (MKT-P1-008) | **done** |
| `price_move`, `liquidity_change` | `RealtimeSignalProducer` (planned) | Observation + signal + evidence atomic | PHASE-1.3 (P13C-002) | **pending** |

## Rules

- No launch-critical requirement without a task and test mapping.
- Do not mark MKT-FR-050-LIVE satisfied until P13C-002 evidence exists.
- Phase 2 may not start until Phase 1.3 closure approved.
- Update this file when adding requirements or tasks.
