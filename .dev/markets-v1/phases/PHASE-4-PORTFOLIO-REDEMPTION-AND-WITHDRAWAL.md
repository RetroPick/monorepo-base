# PHASE-4 — Portfolio, Redemption, and Withdrawal

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Phase ID and exact name

- **Phase ID:** `PHASE-4`
- **Exact name:** Portfolio, Redemption, and Withdrawal

## Business outcome

Activity, positions, PnL, CTF, resolution, redeem, complete asset exit; intelligence feeds.

## Technical outcome

Positions reconcile; CTF preview+receipt; redemption/withdrawal recovery tested.

## Prerequisites

PHASE-3 exit; CTF addresses verified.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../agent-harness/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: PHASE-3 complete.
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- Positions
- Activity
- Whale feed
- CTF split/merge
- Redemption
- Withdrawal
- Wallet profiles
- PnL
- Reconcile tests

## Out of scope

- Android UI
- Combos
- Guaranteed arb labels
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)

## Repository areas affected

- internal/markets/portfolio/
- internal/markets/ctf/
- intelligence/

## New modules/files expected

- positions/
- redemption/
- PortfolioView.tsx

## Data migrations

- markets_position_projections
- markets_ctf_operations
- markets_activity_events
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

- Position
- CTFPreview
- RedemptionStatus
- WalletProfile
- LargeTradeSignal
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- CTF contracts
- Resolution data
- Chain indexer

## On-chain interactions

- split/merge/redeem
- Neg Risk convert
- Withdrawal transfer
RetroPick never holds user private keys.

## Security controls

- CTF preview-before-sign
- Fixed-point
- Signal retraction

## Observability

- reconciliation_errors
- redemption_pending
- whale_latency

## Test plan

- Position vectors
- CTF tests
- Redemption E2E
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- Portfolio contract tests
- CTF simulation CI

## Deployment sequence

- Portfolio routes
- CTF relay caps

## Rollback sequence

- Disable CTF relay
- retract bad signals

## Risks and mitigations

- **Risk:** Projection drift — **Mitigation:** Hourly reconcile
- **Risk:** False whale — **Mitigation:** Retraction pipeline

| Failure | Detection | User state | Auto action | Retry | Reconcile | Alert | Runbook |
|---|---|---|---|---|---|---|---|
| Upstream 5xx | HTTP 5xx metric | Unavailable banner | Circuit breaker | Idempotent safe | Venue reconcile | P2 | PRODUCTION_OPERATIONS_RUNBOOK.md |
| Rate limit 429 | Retry-After | Slow down | Backoff | Safe | Pause cursor | P3 | CACHE_QUEUE_AND_RATE_LIMITING.md |
| Stale order book | Sequence gap | Stale badge | Disable marketable | N/A | Resync snapshot | P2 | INDEXING_RECONCILIATION_AND_REORGS.md |
| Wallet rejected | Client callback | Retry connect | Clear session | Safe | No order | P3 | WALLET_SIGNING_AND_SECURITY.md |
| Geoblock unknown | Eligibility timeout | Not available | Fail closed | N/A | Log decision | P1 | AUTH_SESSION_AND_ELIGIBILITY.md |
| Submit timeout | Timer | Checking status | Reconciliation | Never auto-resubmit | Venue lookup | P1 | ORDER_LIFECYCLE.md |
| Chain reorg | Indexer event | Updating | Pause settle | N/A | Reindex | P2 | INDEXING_RECONCILIATION_AND_REORGS.md |
| Android killed signing | Resume missing | Resume CTA | Invalidate preview | Safe | No duplicate | P3 | android/WALLET_SIGNING_AND_SECURITY.md |

## Human approvals

- CTF mainnet relay
- Withdrawal whitelist
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P4-001 | Position projection service | Deliver position projection service | MKT-P4-002 |
| MKT-P4-002 | Activity feed | Deliver activity feed | MKT-P4-003 |
| MKT-P4-003 | Whale/large-trade feed | Deliver whale/large-trade feed | MKT-P4-004 |
| MKT-P4-004 | CTF split/merge | Deliver ctf split/merge | MKT-P4-005 |
| MKT-P4-005 | Resolution and redemption | Deliver resolution and redemption | MKT-P4-006 |
| MKT-P4-006 | Withdrawal completion | Deliver withdrawal completion | MKT-P4-007 |
| MKT-P4-007 | Wallet profiling | Deliver wallet profiling | MKT-P4-008 |
| MKT-P4-008 | PnL analytics | Deliver pnl analytics | MKT-P4-009 |
| MKT-P4-009 | Portfolio reconciliation tests | Deliver portfolio reconciliation tests | MKT-P4-010 |
| MKT-P4-010 | PHASE-4 exit gate | Deliver phase-4 exit gate | MKT-P5-001 |

### MKT-P4-001 — Position projection service

**Goal:** Implement Position projection service within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-002 — Activity feed

**Goal:** Implement Activity feed within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-003 — Whale/large-trade feed

**Goal:** Implement Whale/large-trade feed within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-004 — CTF split/merge

**Goal:** Implement CTF split/merge within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-005 — Resolution and redemption

**Goal:** Implement Resolution and redemption within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-006 — Withdrawal completion

**Goal:** Implement Withdrawal completion within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-007 — Wallet profiling

**Goal:** Implement Wallet profiling within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-008 — PnL analytics

**Goal:** Implement PnL analytics within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-009 — Portfolio reconciliation tests

**Goal:** Implement Portfolio reconciliation tests within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P4-010 — PHASE-4 exit gate

**Goal:** Implement PHASE-4 exit gate within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

Positions before CTF; intelligence parallel after schema stable.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-4 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-FR-040 | Position reconcile | Phase tests |
| MKT-FR-060 | Whale feed | Phase tests |
| MKT-DATA-001 | Immutable activity | Phase tests |

## Verification evidence

- CI links
- Contract report
- SLO exports
- Human approvals
- RELEASE_VERIFICATION_MATRIX rows
## Definition of done

- All tasks complete
- Exit gate evidence
- No open P0/P1 security without acceptance
- Runbooks updated
- Manifest updated
## Handoff to next phase

Begin `PHASE-5` when all PHASE-4 tasks done, evidence archived, manifest updated.

First task: `MKT-P5-001`.

## Authoritative references

| Source | Location | Retrieved | Confidence |
|---|---|---|---|
| Polymarket | https://docs.polymarket.com/ | 2026-07-25 | partial |
| OpenAPI | schemas/openapi/markets-v1.yaml | 2026-07-25 | verified |
| Master prompt | .dev/RETROPICK_MARKETS_AGENT_DOCS_MASTER_PROMPT(1).md | 2026-07-25 | verified |

## Cross-document invariants (§23)

1. Polymarket is venue
2. No PRISM positions in Markets
3. No custom contract default
4. Signer≠account wallet
5. No raw key custody
6. Fixed-point money
7. Reconcile before retry
8. Fail closed geoblock
9. Deterministic signals
10. No auto copy trade

## Operational detail matrix

### Catalog ingest

| Attribute | Value |
|---|---|
| Phase | PHASE-4 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-4 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-4 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-4 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-4 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-4 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-4 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-4 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
