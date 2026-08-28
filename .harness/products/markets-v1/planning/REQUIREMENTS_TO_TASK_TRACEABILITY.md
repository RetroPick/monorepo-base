# Requirements to Task Traceability

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

## Description

This is the authoritative matrix mapping requirement IDs → docs → phase → tasks → acceptance → tests → metrics (and related runbooks). Use it to prove a change satisfies a requirement and to find the correct task — not to invent ad-hoc REQ IDs or skip phase sequencing.

Tables cover functional (MKT-FR-*), security (MKT-SEC-*), and NFR/platform (MKT-NFR-*, MKT-AND-*, MKT-WEB-*, MKT-POLY-*) rows plus Wave 9 harness verification. Companion ID catalog: `../04_REQUIREMENTS_AND_TRACEABILITY.md`.

Locate the REQ → confirm Phase matches manifest authorization → execute only listed tasks → attach test/metric proof in VERIFICATION_EVIDENCE → update this matrix in the same change if mappings shift. Do not claim adjacent REQs from unrelated work.

## 0. Developer intent (5W+1H)

Authoritative matrix mapping requirement IDs → docs → phase → tasks → acceptance → tests → metrics (and related runbooks). Use it to prove a change satisfies a requirement and to find the correct task — not to invent ad-hoc REQ IDs or skip phase sequencing.

| Dimension | Intent |
|-----------|--------|
| **Who** | Agents selecting work; QA mapping tests; orchestrator auditing coverage at phase exit. |
| **What** | Functional (MKT-FR-*), security (MKT-SEC-*), NFR/platform (MKT-NFR-*, MKT-AND-*, MKT-WEB-*, MKT-POLY-*) tables; Wave 9 harness verification rows; chain `requirement → evidence → component → phase → task → acceptance → test → metric → runbook`. |
| **When** | Before starting a task (confirm REQ mapping); when adding/renaming tests; when updating acceptance; during phase exit coverage review; when handoff claims a REQ is satisfied. |
| **Where** | This file plus `../04_REQUIREMENTS_AND_TRACEABILITY.md`, NFR/scope docs, `task-graph.yaml`, phase acceptance tables, verification evidence artifacts. |
| **Why** | Untethered code cannot pass §16 acceptance or prove SLOs/security properties. Missing traceability is how preview-before-sign or fail-closed eligibility regress unnoticed. |
| **How** | Locate REQ row → read linked docs → execute only listed tasks for your authorization → attach test/metric proof in VERIFICATION_EVIDENCE → update this matrix in the same change if mappings shift. |

### In scope / out of scope (product)

- **In:** RetroPick Markets V1 — web, Go BFF, native Android Jetpack Compose.

### What “done” means

Your task’s REQ IDs have passing tests cited in evidence; matrix rows remain accurate (or were updated with the change); you did not claim adjacent REQs (e.g. positions `MKT-FR-040`) from unrelated work (e.g. preview-only).

### How (procedure)

1. Grep this file for the REQ or feature keyword.
2. Confirm Phase matches manifest authorization (`current_phase` / task ready).
3. Open Task(s); implement within `owned_paths`.
4. Name tests to match Acceptance/Test columns where practical.
5. Record metric hooks if the row lists one (`catalog_freshness_p95`, `preview_sign_match`, …).
6. Link evidence from handoff; update matrix if you split/merge tasks with orchestrator agreement.

Phase exit reviewers should sample REQ rows for the phase and confirm each listed task either `done` with evidence or explicitly deferred with a blocker — gaps are exit-gate defects.

### Worked example

Agent assigned order preview finds `MKT-FR-030` / `MKT-SEC-002` → PHASE-3 → `MKT-P3-001`, implements preview hash binding, runs the golden vector test referenced by the matrix, records `preview_sign_match` in evidence, and updates handoff. They do not mark `MKT-FR-040` (position reconcile) satisfied from preview-only work.


## 1. Purpose

Comprehensive matrix mapping requirement IDs → authoritative docs → task-graph tasks → acceptance criteria → tests → metrics → runbooks.

## 2. Scope

### In scope

- RetroPick Markets V1 (web, Go BFF, native Android Jetpack Compose).

### Out of scope

- PRISM protocol implementation and `contracts/prism/`.
- Custom RetroPick exchange or outcome-token issuance (ADR-001).

## 3. Prerequisites

- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
- [05_NON_FUNCTIONAL_REQUIREMENTS.md](../05_NON_FUNCTIONAL_REQUIREMENTS.md)
- [02_SCOPE_AND_CAPABILITY_MATRIX.md](../02_SCOPE_AND_CAPABILITY_MATRIX.md)
- [task-graph.yaml](task-graph.yaml)
- [implementation-manifest.yaml](implementation-manifest.yaml)

## 4. Traceability chain

```
requirement → evidence → component → phase → task → acceptance criteria → test → metric → runbook
```

## 5. Functional requirements

| REQ-ID | Description | Doc(s) | Phase | Task(s) | Acceptance criteria | Test | Metric |
|--------|-------------|--------|-------|---------|---------------------|------|--------|
| MKT-FR-001 | List normalized Polymarket events | [backend/API_AND_REALTIME_CONTRACTS.md](../backend/API_AND_REALTIME_CONTRACTS.md), [02_SCOPE_AND_CAPABILITY_MATRIX.md](../02_SCOPE_AND_CAPABILITY_MATRIX.md) | PHASE-1 | MKT-P1-001, MKT-P1-002 | OpenAPI validates; events paginated; canonical IDs | handler_test, contract | `catalog_freshness_p95` |
| MKT-FR-002 | Show market rules and resolution source | [web/MARKET_AND_ORDERBOOK_UX.md](../web/MARKET_AND_ORDERBOOK_UX.md), [polymarket/MARKET_DATA_AND_REALTIME.md](../polymarket/MARKET_DATA_AND_REALTIME.md) | PHASE-1 | MKT-P1-004 | Event detail renders rules + resolution source | e2e journey J-01 | `event_detail_render_success` |
| MKT-FR-010 | Order book snapshot with staleness indicator | [backend/API_AND_REALTIME_CONTRACTS.md](../backend/API_AND_REALTIME_CONTRACTS.md), [ADR-005](../architecture/adr/ADR-005-REALTIME-AND-RECONCILIATION.md) | PHASE-1 | MKT-P1-006, MKT-P1-008 | Stale banner when upstream lag > threshold | contract, ws integration | `orderbook_snapshot_age_p95` |
| MKT-FR-020 | Wallet connect without key custody | [ADR-003](../architecture/adr/ADR-003-WALLET-AND-SIGNING-MODEL.md), [web/WALLET_AND_TRANSACTION_UX.md](../web/WALLET_AND_TRANSACTION_UX.md) | PHASE-2 | MKT-P2-001, MKT-P2-003 | Connect flow; no T4 data stored | security review, e2e J-02 | `key_custody_incidents` |
| MKT-FR-021 | Fail-closed eligibility check | [backend/AUTH_SESSION_AND_ELIGIBILITY.md](../backend/AUTH_SESSION_AND_ELIGIBILITY.md) | PHASE-2 | MKT-P2-002 | Unknown region → `eligible: false` | contract, unit | `eligibility_fail_closed` |
| MKT-FR-030 | Order preview equals signed payload | [polymarket/ORDER_LIFECYCLE.md](../polymarket/ORDER_LIFECYCLE.md), [MKT-SEC-002](#security-requirements) | PHASE-3 | MKT-P3-001 | Preview hash matches EIP-712 payload | golden vector | `preview_sign_match` |
| MKT-FR-031 | Submit limit order via CLOB V2 | [polymarket/ORDER_LIFECYCLE.md](../polymarket/ORDER_LIFECYCLE.md), [polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md](../polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md) | PHASE-3 | MKT-P3-002, MKT-P3-003 | Order accepted by CLOB; idempotent submit | integration, e2e J-03 | `order_submit_success_rate` |
| MKT-FR-040 | Positions reconcile with venue | [polymarket/POSITIONS_CTF_AND_REDEMPTION.md](../polymarket/POSITIONS_CTF_AND_REDEMPTION.md), [backend/INDEXING_RECONCILIATION_AND_REORGS.md](../backend/INDEXING_RECONCILIATION_AND_REORGS.md) | PHASE-4 | MKT-P4-001 | BFF positions match CLOB within SLA | reconciliation test | `position_drift_count` |
| MKT-FR-050 | Watchlist with price-cross alerts | [intelligence/ALERT_RULES_AND_DELIVERY.md](../intelligence/ALERT_RULES_AND_DELIVERY.md), [ADR-008](../architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md) | PHASE-1 | MKT-P1-005 | Signal envelope versioned; evidence-linked | unit, signal replay | `alert_delivery_latency_p95` |
| MKT-FR-060 | Whale/large-trade feed with reason codes | [intelligence/WHALE_AND_LARGE_TRADE_DETECTION.md](../intelligence/WHALE_AND_LARGE_TRADE_DETECTION.md) | PHASE-4 | MKT-P4-003 | Descriptive labels only; no insider claims | unit, content review | `whale_feed_accuracy` |
| MKT-FR-090 | Combos only when capability flag true | [polymarket/COMBOS_CAPABILITY_GATE.md](../polymarket/COMBOS_CAPABILITY_GATE.md) | PHASE-8 | MKT-P8-001 | UI hidden when `/markets/capabilities` false | feature flag test | `combos_gate_violations` |

## 6. Security requirements

| REQ-ID | Description | Doc(s) | Phase | Task(s) | Acceptance criteria | Test | Metric |
|--------|-------------|--------|-------|---------|---------------------|------|--------|
| MKT-SEC-001 | No raw private key storage | [security/SIGNING_AND_TRANSACTION_INTEGRITY.md](../security/SIGNING_AND_TRANSACTION_INTEGRITY.md), [ADR-003](../architecture/adr/ADR-003-WALLET-AND-SIGNING-MODEL.md) | PHASE-2 | MKT-P2-001, MKT-P2-005 | No T4 classification in stores | security review, SAST | `key_custody_incidents` |
| MKT-SEC-002 | Preview-before-sign binding | [security/SIGNING_AND_TRANSACTION_INTEGRITY.md](../security/SIGNING_AND_TRANSACTION_INTEGRITY.md) | PHASE-3 | MKT-P3-001, MKT-P3-004 | User sees exact payload before sign | golden vector, e2e | `preview_sign_match` |

## 7. Non-functional and platform requirements

| REQ-ID | Description | Doc(s) | Phase | Task(s) | Acceptance criteria | Test | Metric |
|--------|-------------|--------|-------|---------|---------------------|------|--------|
| MKT-NFR-001 | Catalog freshness p95 < 60s | [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](../platform/OBSERVABILITY_SLOS_AND_ALERTS.md) | PHASE-1 | MKT-P1-002, MKT-P1-009 | SLO dashboard green in staging | load test | `catalog_freshness_p95` |
| MKT-NFR-002 | Order book snapshot age p95 < 5s | [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](../platform/OBSERVABILITY_SLOS_AND_ALERTS.md) | PHASE-1 | MKT-P1-006 | WS snapshot within SLO | integration | `orderbook_snapshot_age_p95` |
| MKT-NFR-010 | API availability 99.5% monthly | [platform/OBSERVABILITY_SLOS_AND_ALERTS.md](../platform/OBSERVABILITY_SLOS_AND_ALERTS.md) | PHASE-6 | MKT-P6-004 | Uptime SLO met over 30d | synthetic monitoring | `bff_uptime_monthly` |
| MKT-NFR-020 | Secrets in env only | [security/SECRETS_KEYS_AND_ACCESS_CONTROL.md](../security/SECRETS_KEYS_AND_ACCESS_CONTROL.md) | PHASE-0 | MKT-P0-007, MKT-W9-003 | No secrets in Git | secret scan | `secret_leak_count` |
| MKT-NFR-030 | Baseline infra < USD 100/mo | [platform/INFRASTRUCTURE_AND_COST_MODEL.md](../platform/INFRASTRUCTURE_AND_COST_MODEL.md) | PHASE-1 | MKT-P1-009 | Cost estimate documented | review | `infra_cost_monthly` |
| MKT-NFR-040 | WCAG 2.1 AA critical paths | [web/DESIGN_SYSTEM_AND_ACCESSIBILITY.md](../web/DESIGN_SYSTEM_AND_ACCESSIBILITY.md) | PHASE-3 | MKT-P3-004 | axe/lighthouse pass | a11y audit | `a11y_violations_critical` |
| MKT-NFR-050 | Android cold start < 2s p75 | [android/ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md](../android/ACCESSIBILITY_PERFORMANCE_AND_DEVICES.md) | PHASE-5 | MKT-P5-004 | Macrobenchmark pass | macrobenchmark | `android_cold_start_p75` |
| MKT-NFR-060 | Fixed-point money in APIs | [backend/DOMAIN_MODEL_AND_STATE_MACHINES.md](../backend/DOMAIN_MODEL_AND_STATE_MACHINES.md) | PHASE-1 | MKT-P1-001 | No float types in OpenAPI money fields | schema lint | `float_in_money_schema` |
| MKT-NFR-070 | Backup RPO < 24h | [platform/BACKUP_RESTORE_AND_DISASTER_RECOVERY.md](../platform/BACKUP_RESTORE_AND_DISASTER_RECOVERY.md) | PHASE-6 | MKT-P6-005 | DR drill succeeds | DR exercise | `backup_rpo_hours` |
| MKT-AND-001 | Jetpack Compose only | [ADR-006](../architecture/adr/ADR-006-ANDROID-JETPACK-COMPOSE.md) | PHASE-5 | MKT-P5-001 | No XML views in app module | lint, review | `compose_only_violations` |
| MKT-WEB-001 | OpenAPI-generated types | [ADR-004](../architecture/adr/ADR-004-SHARED-WEB-ANDROID-API.md) | PHASE-1 | MKT-P1-001, MKT-P1-004 | Types generated from schema | codegen CI | `manual_type_drift` |
| MKT-POLY-001 | CLOB V2 only | [polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md](../polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md) | PHASE-3 | MKT-P3-002 | No V1 endpoint references | static analysis | `clob_v1_references` |

## 8. Wave 9 harness verification tasks

| Task | Verifies | Doc(s) | Acceptance criteria |
|------|----------|--------|---------------------|
| MKT-W9-001 | Document map completeness | [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md) | 121/121 files present; all `reviewed` |
| MKT-W9-002 | §23 invariant consistency | [INVARIANT_CHECK.md](INVARIANT_CHECK.md) | 28/28 invariants pass |
| MKT-W9-003 | Requirements matrix completeness | this file, [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md) | Every launch-critical REQ has task + test |
| MKT-W9-004 | Task graph validity | [task-graph.yaml](task-graph.yaml) | YAML parses; deps acyclic; owned_paths unique per parallel task |
| MKT-W9-005 | Manifest phase alignment | [implementation-manifest.yaml](implementation-manifest.yaml) | Phase tasks match graph; doc_paths populated |

## 9. §23 invariant → doc mapping

| Invariant # | Primary enforcement doc | Verification task |
|-------------|----------------------|-------------------|
| 1–4 | ADR-001 | MKT-W9-002 |
| 5–7 | polymarket/*, evidence-register.yaml | MKT-P0-002, MKT-W9-002 |
| 8–10 | ADR-003 | MKT-P2-001, MKT-P3-001 |
| 11–12 | ADR-004, ADR-006 | MKT-P1-007, MKT-P5-001 |
| 13–15 | DOMAIN_MODEL, ORDER_LIFECYCLE | MKT-P1-001, MKT-P3-005 |
| 16 | AUTH_SESSION_AND_ELIGIBILITY | MKT-P2-002 |
| 17–18 | phases/*, BLOCKERS_AND_HUMAN_APPROVALS | MKT-W9-005 |
| 19–20 | ADR-007 | MKT-P0-006 |
| 21 | ABUSE_FRAUD_AND_RATE_LIMITS | MKT-P2-002 |
| 22–24, 27–28 | intelligence/*, ADR-008 | MKT-P1-005, MKT-P4-003 |
| 25–26 | ADR-009, ORDER_LIFECYCLE | MKT-P3-001 |
| All 28 | INVARIANT_CHECK.md | MKT-W9-002 |

## 10. Runbook links

| Concern | Runbook |
|---------|---------|
| Upstream outage | [platform/PRODUCTION_OPERATIONS_RUNBOOK.md](../platform/PRODUCTION_OPERATIONS_RUNBOOK.md) |
| Incident response | [security/INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md) |
| Release rollback | [platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md](../platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md) |
| Phase exit | [PHASE_GATE_TEMPLATE.md](PHASE_GATE_TEMPLATE.md) |

## 11. Rules

- No launch-critical requirement without a task and test mapping.
- Update this file when adding requirements or tasks.
- Re-run MKT-W9-003 after any REQ-ID or task-graph change.
