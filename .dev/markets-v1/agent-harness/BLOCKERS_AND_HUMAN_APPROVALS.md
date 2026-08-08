# Blockers and Human Approvals

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

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
| BLK-001 | Geoblock eligibility upstream not wired | PHASE-2 | backend | open | [AUTH_SESSION_AND_ELIGIBILITY.md](../backend/AUTH_SESSION_AND_ELIGIBILITY.md) |
| BLK-002 | Android beyond README scaffold | PHASE-5 | android | open | [GRADLE_MODULE_GRAPH.md](../android/GRADLE_MODULE_GRAPH.md) |
| BLK-003 | Builder production credentials | PHASE-7 | ops | open | [BUILDER_RELAYER_AND_FEES.md](../polymarket/BUILDER_RELAYER_AND_FEES.md) |
| BLK-004 | CLOB integration not implemented | PHASE-3 | backend | open | [ORDER_LIFECYCLE.md](../polymarket/ORDER_LIFECYCLE.md) |
| BLK-005 | Wallet connect and funding flows not implemented | PHASE-2 | web | open | [WALLET_AND_TRANSACTION_UX.md](../web/WALLET_AND_TRANSACTION_UX.md) |
| BLK-006 | OpenAPI covers stub endpoints only | PHASE-1 | platform | open | `schemas/openapi/markets-v1.yaml` |
| BLK-010 | Contract addresses require revalidation | PHASE-3 | research | open | [evidence-register.yaml](../research/evidence-register.yaml) |
| BLK-011 | CLOB V2 details may change upstream | PHASE-3 | research | monitoring | [UPSTREAM_CHANGE_MANAGEMENT.md](../polymarket/UPSTREAM_CHANGE_MANAGEMENT.md) |
| BLK-020 | Per-region legal review pending | PHASE-7 | legal | open | [PHASE-7-PRODUCTION-LAUNCH.md](../phases/PHASE-7-PRODUCTION-LAUNCH.md) |
| BLK-021 | Google Play financial-features declaration | PHASE-7 | android | open | [PLAY_STORE_COMPLIANCE_AND_RELEASE.md](../android/PLAY_STORE_COMPLIANCE_AND_RELEASE.md) |

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
