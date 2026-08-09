# Blockers and Human Approvals

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1

## Description

This is the stop-and-log register for unresolved blockers (BLK-*) and human approval gates. Agents must not improvise around these entries — no fake prod creds, no allow-all geoblock, no silent mainnet. Header **Status: reviewed** does not mean blockers are cleared.

Scan Active blockers and gates before starting a task; when work cannot proceed safely, log the blocker, set task `blocked`, and hand off with unblock criteria. Cleared-by roles record clearance with required evidence; keep history.

§18 gates exist because custody, legal, Builder fees, and real chain writes are irreversible or compliance-bound. Invented clearance is a process/security failure. This file complements the decision/assumption log — it does not replace ADRs or phase specs.

## 0. Developer intent (5W+1H)

Stop-and-log register for unresolved blockers and human approval gates. Agents **must not improvise** around these entries (no fake prod creds, no allow-all geoblock, no silent mainnet). Header **Status: reviewed** does not mean blockers are cleared — read the Active blockers table and gate list below.

| Dimension | Intent |
|-----------|--------|
| **Who** | Any agent hitting a missing dependency or `human_approval_required` task; humans in Cleared-by roles; orchestrator tracking `unresolved_blockers` alongside the manifest. |
| **What** | Active blockers (IDs BLK-*), human approval gates (V1 scope, production wallet, real txs, Builder fees, withdrawals, prod deploy, Play prod, jurisdictions, destructive migrations), resolved Wave 9 blockers, escalation path. |
| **When** | Before starting a task (scan Active blockers + gates); when work cannot proceed safely; when a human clears a gate (update status with evidence — keep history). |
| **Where** | This file; cross-links to auth/wallet/order/Play/evidence docs; task-graph `blocked` status; `DECISION_AND_ASSUMPTION_LOG.md` for related assumptions. |
| **Why** | §18 human gates exist because custody, legal, Builder fees, and real chain writes are irreversible or compliance-bound. Invented clearance is a process/security failure. |
| **How** | Scan → if blocked, add/update Active blockers with evidence → set task `blocked` → handoff with unblock criteria → record assumption if needed → wait for named Cleared-by role. |

### In / out for agents

- **In:** Logging BLK rows; referencing gate evidence requirements; stopping cleanly; preparing rehearsal evidence that helps humans decide.
- **Out:** Marking gated tasks `done` without clearance; committing secrets to “unblock” yourself; deleting open blockers without resolution notes; bypassing geoblock/eligibility because BLK-001 is annoying.

### What “done” means

- **Blocked agent:** Blocker ID logged, task not `done`, handoff states unblock criteria.
- **Gated task after clearance:** Gate row shows evidence + clearer; only then continue commands that touch prod/mainnet/Play.

### How (escalation procedure)

1. Log blocker in Active blockers (ID, title, phase, owner, status, doc link).
2. Record related assumption in the decision log if upstream truth is time-sensitive.
3. Set task status to `blocked` in `task-graph.yaml`.
4. Complete `AGENT_HANDOFF_TEMPLATE` with explicit unblock criteria.
5. Do not resume until the gate’s Cleared-by role records clearance with the evidence the gate table requires.

Examples of gates that always stop agents: production wallet creation, real on-chain transaction, Builder fee configuration, Play production release, new jurisdiction enablement, destructive migration.

### Worked example

Agent reaching CLOB submit sees BLK-004 (CLOB not implemented) / BLK-010 (addresses need revalidation) and a human gate for real on-chain transactions. They implement only what the task allows in sandbox/fixtures; if mainnet is required, they set `blocked`, cite BLK-004/BLK-010 in handoff, and leave verification evidence without fabricated mainnet success. When ops clears the gate, a new agent resumes from the handoff rather than rediscovering the gap from chat.


## 1. Purpose

Track unresolved blockers and human approval gates. Agents MUST stop and log here rather than improvising around blockers.

## 2. How to use

1. Before starting a task, scan this file and manifest `unresolved_blockers`.
2. If your work hits a blocker, add a row to **Active blockers** with evidence.
3. If human approval is required (task `human_approval_required: true`), do not proceed until gate cleared.
4. Reference blocker ID in handoff and decision log.

## 3. Active blockers

| ID | Title | Phase | Owner | Status | Doc |
|----|-------|-------|-------|--------|-----|
| BLK-001 | GeoIP + geoblock adapters shipped; ops staging proof pending | PHASE-2 | backend | open | [MKT-P2-002-BLK001-evidence.md](verification/PHASE-2/MKT-P2-002-BLK001-evidence.md), [AUTH §4.1](../backend/AUTH_SESSION_AND_ELIGIBILITY.md#41-implementation-status-mkt-p2-002) |
| BLK-002 | Android beyond README scaffold | PHASE-5 | android | open | [GRADLE_MODULE_GRAPH.md](../android/GRADLE_MODULE_GRAPH.md) |
| BLK-003 | Builder production credentials | PHASE-7 | ops | open | [BUILDER_RELAYER_AND_FEES.md](../polymarket/BUILDER_RELAYER_AND_FEES.md) |
| BLK-004 | CLOB integration not implemented | PHASE-3 | backend | open | [ORDER_LIFECYCLE.md](../polymarket/ORDER_LIFECYCLE.md) |
| BLK-005 | Wallet connect and funding flows not implemented | PHASE-2 | web | open | [WALLET_AND_TRANSACTION_UX.md](../web/WALLET_AND_TRANSACTION_UX.md) |
| BLK-006 | OpenAPI covers stub endpoints only | PHASE-1 | platform | open | `schemas/openapi/markets-v1.yaml` |
| BLK-010 | Contract addresses require revalidation | PHASE-3 | research | open | [evidence-register.yaml](../research/evidence-register.yaml) |
| BLK-011 | CLOB V2 details may change upstream | PHASE-3 | research | monitoring | [UPSTREAM_CHANGE_MANAGEMENT.md](../polymarket/UPSTREAM_CHANGE_MANAGEMENT.md) |
| BLK-020 | Per-region legal review pending | PHASE-7 | legal | open | [PHASE-7-PRODUCTION-LAUNCH.md](../phases/PHASE-7-PRODUCTION-LAUNCH.md) |
| BLK-021 | Google Play financial-features declaration | PHASE-7 | android | open | [PLAY_STORE_COMPLIANCE_AND_RELEASE.md](../android/PLAY_STORE_COMPLIANCE_AND_RELEASE.md) |

### 3.1 BLK-001 progress note

**Status:** `open (code complete; ops staging pending)` — default deploy remains fail-closed; do not mark MKT-P2-002 `done` or clear BLK-001 until staging runtime returns `eligible: true` for an allowed region.

| | |
|--|--|
| **Shipped** | GeoIP `HTTPResolver` (`eligibility/geo`), geoblock `HTTPChecker` (`eligibility/geoblock`), fixture + env integration tests, `ProductionEligibilityEvaluator` dual env wiring (`TestProductionEligibilityEvaluatorEnvWiring`), shared evaluator wired to auth `RequireEligible` in both API entrypoints |
| **Remaining** | Ops inject `MARKETS_GEOIP_*` + `MARKETS_GEOBLOCK_*` in staging/prod; staging `GET /api/v1/markets/eligibility` → `eligible: true` for allowed region; upstream revalidation per evidence register |
| **Unblock criteria** | Both env vars set in staging; integration proof of `eligible: true` for allowed region — no allow-all stub |
| **Does not unblock** | Adapter-only clearance; marking tasks `done` while default deploy returns `geo_unknown` |

Evidence: [MKT-P2-002-BLK001-evidence.md](verification/PHASE-2/MKT-P2-002-BLK001-evidence.md).

## 4. Human approval gates

| Gate | Tasks | Evidence required | Cleared by |
|------|-------|-------------------|------------|
| V1 scope sign-off | MKT-P0-008 | 121 docs reviewed, ADRs accepted | product owner |
| Production wallet creation | MKT-P2-004 | Address, chain, multisig policy | ops + security |
| Real on-chain transaction | MKT-P3-002, MKT-P4-004 | Testnet rehearsal + sign-off | ops |
| Builder fee configuration | MKT-P7-001 | Fee schedule + disclosure copy | product + legal |
| Withdrawal to external wallet | MKT-P4-005 | Limits policy + audit trail | ops |
| Production deployment | MKT-P7-001 | Release verification matrix green | ops + security |
| Play production release | MKT-P7-002 | Closed track metrics + policy review | product + legal |
| New jurisdiction enablement | any | Legal opinion + geoblock config | legal |
| Destructive migration | any | Approved rollback plan | backend lead |

## 5. Resolved blockers (Wave 9)

| ID | Title | Resolution | Date |
|----|-------|------------|------|
| BLK-W9-001 | Agent harness incomplete | Wave 9 tasks MKT-W9-001–005 done | 2026-07-25 |
| BLK-W9-002 | Document map all draft | 121/121 marked reviewed | 2026-07-25 |
| BLK-W9-003 | §23 invariant check stub | Expanded to 28 invariants | 2026-07-25 |

## 6. Escalation path

1. Log blocker in this file.
2. Record assumption in [DECISION_AND_ASSUMPTION_LOG.md](DECISION_AND_ASSUMPTION_LOG.md).
3. Set task status to `blocked` in [task-graph.yaml](task-graph.yaml).
4. Complete handoff with explicit unblock criteria.
