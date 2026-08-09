# Requirements and Traceability — RetroPick Markets V1

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

## Description

This is the canonical Markets V1 requirement catalog and traceability chain: requirement → evidence/decision → component → phase → task → test → metric → runbook. Namespaces include MKT-FR, MKT-NFR, MKT-SEC, MKT-DATA, MKT-OPS, MKT-AND, MKT-WEB, and MKT-POLY.

Use it before claiming feature completeness, at phase gates, and when a new capability needs an ID. Companion execution mapping lives in [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md) and `task-graph.yaml`. Do not invent parallel `REQ-` schemes without the MKT- prefix.

Launch-critical and policy IDs (for example MKT-FR-091 no autonomous copy trading, MKT-SEC-008 fail-closed geoblock, preview=sign) must stay in the chain with tests and metrics — not “done” via docs or stub routes alone.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before requirement ID tables below.

The 5W+1H table below is a **navigation aid** only. It does not replace requirement rows or the traceability chain; if anything conflicts, the ID tables and harness task mappings win.

| Lens | Answer |
|------|--------|
| **Who** | Implementers claiming a task “covers” a requirement; QA writing tests against IDs; orchestrators blocking launch when a launch-critical ID lacks phase/task/test/metric mapping; security tracing MKT-SEC-*. |
| **What** | Canonical Markets V1 requirement namespaces (MKT-FR, MKT-NFR, MKT-SEC, MKT-DATA, MKT-OPS, MKT-AND, MKT-WEB, MKT-POLY) and the chain: requirement → evidence/decision → component → phase → task → test → metric → runbook. Companion deep maps live in harness [REQUIREMENTS_TO_TASK_TRACEABILITY.md](agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md). |
| **When** | Before opening a PR that asserts feature completeness; at phase gates; when adding a new capability that needs a new ID. Re-read when task-graph task IDs change. |
| **Where** | This file for ID catalog + sample mappings. Execution mapping: harness traceability + `task-graph.yaml`. Do not invent parallel ID schemes (`REQ-` without MKT- prefix) for Markets V1. |
| **Why** | Unmapped requirements become silent launch debt. Agents otherwise mark work done via wiring/docs without tests or metrics. This doc forces every launch-critical ID to stay in the chain — including hard policy IDs like MKT-FR-091 (no autonomous copy trading). |
| **How** | Pick the ID → confirm Phase/Task/Test/Metric columns → implement only that scope → attach evidence. Fail closed on geoblock (MKT-SEC-008) and preview=sign (MKT-FR-030 / MKT-SEC-002). Grow OpenAPI when FR-001–011 expand; do not claim FR-031 done on stub routes. |

### Worked example

**Happy path — catalog freshness**

1. Need MKT-FR-001 + related NFR freshness.
2. Task MKT-P1-002 (per table) grows Gamma normalization + contract tests.
3. Metric `catalog_freshness` wired; handoff cites ID + command output.

**Happy path — preview binding**

1. MKT-FR-030 / MKT-SEC-002: golden vectors prove preview equals signed payload.
2. UI cannot offer a different size/price than the signed struct.

**Failure / Never**

- New user-facing Markets behavior without an MKT-* ID (or explicit decision to add one).
- Marking MKT-FR-071 Android trading complete while Gradle project is still README-only.
- Weakening tests so a broken submit path “passes” FR-031.
- Shipping Combos without MKT-FR-090 capability gate true.

**Agent checklist**

- [ ] ID namespace correct?
- [ ] Phase/task/test/metric filled for launch-critical?
- [ ] Evidence/ADR linked if upstream-sensitive?
- [ ] Harness task owns the same ID?
- [ ] Policy IDs (FR-091, SEC-001/005/008) still held?

**Reading tip:** Use namespaces (§2) to find the right table; use the chain (§3) as the definition of “done,” not UI screenshots alone.

## 1. Purpose

Canonical requirement IDs and full traceability: requirement → evidence → component → phase → task → test → metric → runbook.

## 2. ID namespaces

| Prefix | Category |
|---|---|
| MKT-FR-* | Functional |
| MKT-NFR-* | Non-functional |
| MKT-SEC-* | Security |
| MKT-DATA-* | Data |
| MKT-OPS-* | Operations |
| MKT-AND-* | Android |
| MKT-WEB-* | Web |
| MKT-POLY-* | Upstream Polymarket |

## 3. Traceability chain

```
requirement → evidence/decision → architecture component → phase → task → test → production metric → runbook
```

No launch-critical requirement may remain unmapped.

## Functional requirements (MKT-FR)

| ID | Description | Phase | Task | Test | Metric |
|---|---|---|---|---|---|
| MKT-FR-001 | List normalized Polymarket events with taxonomy | PHASE-1 | MKT-P1-002 | contract test | catalog_freshness |
| MKT-FR-002 | Show market rules and resolution source | PHASE-1 | MKT-P1-004 | UI test | N/A |
| MKT-FR-003 | Search and filter events/markets | PHASE-1 | MKT-P1-004 | integration | search_latency |
| MKT-FR-004 | Trending and category browse | PHASE-1 | MKT-P1-002 | integration | N/A |
| MKT-FR-010 | Order book snapshot with staleness indicator | PHASE-1 | MKT-P1-006 | contract | book_age |
| MKT-FR-011 | Trade history and price candles | PHASE-1 | MKT-P1-006 | contract | N/A |
| MKT-FR-020 | Wallet connect without key custody | PHASE-2 | MKT-P2-001 | E2E | wallet_connect_rate |
| MKT-FR-021 | Fail-closed eligibility check | PHASE-2 | MKT-P2-002 | unit | eligibility_latency |
| MKT-FR-022 | Account wallet discovery/deployment | PHASE-2 | MKT-P2-003 | integration | N/A |
| MKT-FR-023 | Deposit tracking with state machine | PHASE-2 | MKT-P2-006 | FSM test | deposit_success |
| MKT-FR-024 | Withdrawal preview and tracking | PHASE-2 | MKT-P2-007 | E2E | withdrawal_success |
| MKT-FR-030 | Order preview equals signed payload | PHASE-3 | MKT-P3-001 | golden vector | preview_mismatch |
| MKT-FR-031 | Submit limit order via CLOB V2 | PHASE-3 | MKT-P3-002 | E2E | submit_success |
| MKT-FR-032 | Disclose builder fee before sign | PHASE-3 | MKT-P3-007 | UI test | N/A |
| MKT-FR-033 | Cancel open orders | PHASE-3 | MKT-P3-004 | E2E | cancel_success |
| MKT-FR-034 | Reconcile unknown submit states | PHASE-3 | MKT-P3-005 | integration | reconciliation_lag |
| MKT-FR-040 | Positions reconcile with venue | PHASE-4 | MKT-P4-001 | reconcile test | position_error_rate |
| MKT-FR-041 | CTF split/merge with preview | PHASE-4 | MKT-P4-004 | E2E | ctf_success |
| MKT-FR-042 | Redeem resolved positions | PHASE-4 | MKT-P4-005 | E2E | redemption_success |
| MKT-FR-050 | Watchlist with price-cross alerts | PHASE-1 | MKT-P1-005 | integration | alert_delivery |
| MKT-FR-051 | Push notification for fills | PHASE-5 | MKT-P5-008 | E2E | push_latency |
| MKT-FR-060 | Whale/large-trade feed with reason codes | PHASE-4 | MKT-P4-003 | signal test | signal_latency |
| MKT-FR-061 | Wallet profile descriptive labels only | PHASE-4 | MKT-P4-007 | unit | N/A |
| MKT-FR-070 | Android catalog parity with web | PHASE-5 | MKT-P5-004 | contract | N/A |
| MKT-FR-071 | Android trading parity | PHASE-5 | MKT-P5-006 | E2E | N/A |
| MKT-FR-090 | Combos only when capability flag true | PHASE-8 | MKT-P8-001 | gate test | N/A |
| MKT-FR-091 | No autonomous copy trading | ALL | ADR-009 | policy | N/A |


## Security requirements (MKT-SEC)

| ID | Description | Phase | Task | Test | Metric |
|---|---|---|---|---|---|
| MKT-SEC-001 | No raw private key storage | PHASE-2 | MKT-P2-001 | security test | N/A |
| MKT-SEC-002 | Preview-before-sign binding | PHASE-3 | MKT-P3-001 | golden vector | N/A |
| MKT-SEC-003 | Session binding to wallet | PHASE-2 | MKT-P2-001 | auth test | N/A |
| MKT-SEC-004 | Fee disclosure before sign | PHASE-3 | MKT-P3-007 | UI test | N/A |
| MKT-SEC-005 | No undisclosed spread | ALL | policy | audit | N/A |
| MKT-SEC-006 | Relayer allowlist and budgets | PHASE-2 | MKT-P2-009 | integration | N/A |
| MKT-SEC-007 | Rate limiting and abuse controls | PHASE-1 | MKT-P1-002 | load test | N/A |
| MKT-SEC-008 | Geoblock fail closed | PHASE-2 | MKT-P2-002 | unit | N/A |


## Non-functional requirements (MKT-NFR)

| ID | Description | Phase | Task | Test | Metric |
|---|---|---|---|---|---|
| MKT-NFR-001 | Catalog freshness p95 < 60s | PHASE-1 | MKT-P1-009 | SLO | N/A |
| MKT-NFR-002 | Order book snapshot age p95 < 5s | PHASE-1 | MKT-P1-006 | SLO | N/A |
| MKT-NFR-003 | Order preview p95 < 750ms | PHASE-3 | MKT-P3-001 | SLO | N/A |
| MKT-NFR-010 | API availability 99.5% monthly | PHASE-6 | MKT-P6-004 | SLO | N/A |
| MKT-NFR-020 | Secrets in env only | PHASE-0 | MKT-P0-007 | audit | N/A |
| MKT-NFR-030 | Baseline infra < USD 100/mo | PHASE-1 | MKT-P1-009 | cost | N/A |
| MKT-NFR-040 | WCAG 2.1 AA critical paths | PHASE-3 | MKT-P3-007 | a11y audit | N/A |
| MKT-NFR-050 | Android cold start p75 < 2s | PHASE-5 | MKT-P5-009 | benchmark | N/A |
| MKT-NFR-051 | Android crash-free > 99% | PHASE-5 | MKT-P5-009 | Play vitals | N/A |
| MKT-NFR-060 | Fixed-point money in APIs | PHASE-1 | MKT-P1-001 | schema | N/A |
| MKT-NFR-070 | Backup RPO < 24h | PHASE-6 | MKT-P6-005 | drill | N/A |


## Data requirements (MKT-DATA)

| ID | Description | Phase | Task | Test | Metric |
|---|---|---|---|---|---|
| MKT-DATA-001 | Immutable activity event log | PHASE-4 | MKT-P4-002 | schema | N/A |
| MKT-DATA-002 | Upstream raw payload retention policy | PHASE-1 | MKT-P1-003 | policy | N/A |
| MKT-DATA-003 | Signal evidence envelope | PHASE-1 | MKT-P1-005 | contract | N/A |


## Operations requirements (MKT-OPS)

| ID | Description | Phase | Task | Test | Metric |
|---|---|---|---|---|---|
| MKT-OPS-001 | Incident runbooks exercised | PHASE-6 | MKT-P6-009 | drill | N/A |
| MKT-OPS-002 | Launch checklist complete | PHASE-7 | MKT-P7-001 | checklist | N/A |
| MKT-OPS-003 | Canary rollback tested | PHASE-7 | MKT-P7-007 | drill | N/A |


## Android requirements (MKT-AND)

| ID | Description | Phase | Task | Test | Metric |
|---|---|---|---|---|---|
| MKT-AND-001 | Jetpack Compose only | PHASE-5 | MKT-P5-001 | lint | N/A |


## Web requirements (MKT-WEB)

| ID | Description | Phase | Task | Test | Metric |
|---|---|---|---|---|---|
| MKT-WEB-001 | OpenAPI-generated types | PHASE-1 | MKT-P1-001 | codegen | N/A |


## Polymarket integration requirements (MKT-POLY)

| ID | Description | Phase | Task | Test | Metric |
|---|---|---|---|---|---|
| MKT-POLY-001 | CLOB V2 only | PHASE-3 | MKT-P3-002 | contract | N/A |
| MKT-POLY-002 | Builder attribution on submit | PHASE-3 | MKT-P3-002 | integration | N/A |
| MKT-POLY-003 | Neg Risk routing when required | PHASE-3 | MKT-P3-008 | golden vector | N/A |



## 4. Phase coverage matrix

| Phase | FR count | SEC | NFR | Launch-critical |
|---|---|---|---|---|
| PHASE-0 | 0 | 0 | 1 | N |
| PHASE-1 | 7 | 1 | 4 | Y |
| PHASE-2 | 5 | 3 | 0 | Y |
| PHASE-3 | 5 | 2 | 2 | Y |
| PHASE-4 | 5 | 0 | 0 | Y |
| PHASE-5 | 2 | 0 | 2 | Y |
| PHASE-6 | 0 | 0 | 2 | Y |
| PHASE-7 | 0 | 0 | 0 | Y |
| PHASE-8 | 2 | 0 | 0 | N |

## 5. Component mapping

| Component | Requirements |
|---|---|
| Catalog indexer | MKT-FR-001–004, MKT-NFR-001 |
| Market data | MKT-FR-010–011, MKT-NFR-002 |
| Auth/eligibility | MKT-FR-020–021, MKT-SEC-001,003,008 |
| Order orchestrator | MKT-FR-030–034, MKT-SEC-002,004, MKT-POLY-001–003 |
| Portfolio/CTF | MKT-FR-040–042, MKT-DATA-001 |
| Signals | MKT-FR-050,060–061, MKT-DATA-003 |
| Android app | MKT-FR-070–071, MKT-AND-001, MKT-NFR-050–051 |
| Platform/SRE | MKT-NFR-010,070, MKT-OPS-001–003 |

## 6. Test mapping

See [testing/MASTER_TEST_PLAN.md](testing/MASTER_TEST_PLAN.md) and [agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md](agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## 7. Metric and runbook mapping

| Metric | Runbook |
|---|---|
| catalog_freshness | OBSERVABILITY_SLOS_AND_ALERTS.md |
| preview_mismatch | ORDER_LIFECYCLE.md |
| position_error_rate | INDEXING_RECONCILIATION_AND_REORGS.md |
| push_latency | NOTIFICATIONS.md |

## 8. Evidence register linkage

Each MKT-POLY and MKT-SEC requirement links to [research/evidence-register.yaml](research/evidence-register.yaml) entries where external authority is claimed.

## 9. Change control

New requirements require: ID assignment, phase mapping, task mapping, test mapping, and manifest update.

## 10. Acceptance criteria

- All launch-critical requirements mapped to phase, task, and test.
- No duplicate IDs.
- Cross-document invariants (§23) satisfied.

## Appendix R.0 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.1 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.2 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.3 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.4 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.5 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.6 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.7 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.8 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.9 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.10 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.11 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.12 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.13 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.14 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.15 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.16 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.17 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.18 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.19 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.20 — traceability audit

Quarterly review ensures no orphan requirements before release.

## Appendix R.21 — traceability audit

Quarterly review ensures no orphan requirements before release.
