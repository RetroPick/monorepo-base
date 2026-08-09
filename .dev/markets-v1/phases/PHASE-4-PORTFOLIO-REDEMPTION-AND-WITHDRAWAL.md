# PHASE-4 — Portfolio, Redemption, and Withdrawal

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Description

PHASE-4 completes the **Markets Core** asset lifecycle after trading: position projections, activity, CTF split/merge, resolution/redemption, withdrawal completion, portfolio PnL, and reconciliation tests. BFF positions are projections, not ownership authority.

Unreconciled redeem/withdraw paths strand user funds. **Whale Trade Feed** and **Wallet Profile** are **not** PHASE-4 primary ownership — they live on the Smart Money track (I1/I2, PHASE-1 parallel) under [01_WHALE_TRADE_FEED.md](../intelligence/01_WHALE_TRADE_FEED.md) and [03_WALLET_PROFILE.md](../intelligence/03_WALLET_PROFILE.md) (req **SM-I-001** / **SM-I-003**). Portfolio UX may deep-link into those surfaces; do not treat P4 as whale authority.

CTF always preview-before-sign. Withdrawal completion stays behind whitelist/policy approval. Exit via `MKT-P4-010` before treating portfolio/CTF APIs as stable for PHASE-5 clients.

## 0. Developer intent (5W+1H)

Orientation for agents executing **PHASE-4 — Portfolio, Redemption, and Withdrawal**. The document header **Status: reviewed** means this phase *spec* was reviewed for quality — it is **not** a claim that the phase has exited or that all tasks are complete. Live execution state lives only in `implementation-manifest.yaml` (`current_phase`) and per-task statuses in `task-graph.yaml`. Do not invent phase progress from this file.

| Dimension | Intent |
|-----------|--------|
| **Who** | Portfolio/CTF/indexer agents and web portfolio UI; humans for CTF mainnet relay and withdrawal whitelist. Smart Money feed/profile owners work under I1/I2 (PHASE-1 parallel), not as P4 primary owners. |
| **What** | Complete Core asset lifecycle after trading: position projections, activity, CTF split/merge, resolution/redemption, withdrawal completion, portfolio PnL, reconciliation tests. |
| **When** | After PHASE-3 exit with verified CTF addresses. Positions before CTF mutations. Android UI waits for PHASE-5. Public Smart Money (I1–I3) may already be in flight from PHASE-1 — do not block P4 exit on whale/profile. |
| **Where** | `internal/markets/portfolio|ctf/`, `PortfolioView.tsx`, migrations for positions/CTF/activity. Optional deep-links into intelligence APIs. Chain: split/merge/redeem, Neg Risk convert, withdrawal transfer — user-signed / relayed per policy, never custodied keys. |
| **Why** | BFF positions are projections, not ownership authority. Unreconciled redeem/withdraw paths strand user funds. Dumping whale/profile into P4 delays the growth loop and mis-owns Launch intel. |
| **How** | Follow the numbered procedure below; stay inside owned paths; file evidence; never mark the phase done without the exit-gate checklist. |

### In scope (agent boundary for this phase)

- `MKT-P4-001`…`MKT-P4-010` positions through exit gate (see annotations on demoted whale/profile tasks)
- CTF preview-before-sign; fixed-point portfolio PnL
- APIs: Position, CTFPreview, RedemptionStatus (portfolio/CTF). WalletProfile / LargeTradeSignal → Smart Money OpenAPI, not P4 authority

### Out of scope (do not implement under this phase authorization)

- Android UI implementation, combos, guaranteed-arbitrage product labels
- Implementing Launch whale feed, wallet profiles, or leaderboard as P4-owned work
- PRISM/legacy; custom exchange

### Exit gate — what “done” means for an agent

A single task is done only with verification evidence + handoff. The **phase** is done only when **all** of the following hold (orchestrator records manifest advance):

- Positions reconcile to venue within SLA; CTF preview+receipt; redeem/withdraw recovery tested
- REQ MKT-FR-040, MKT-DATA-001 evidenced (portfolio). MKT-FR-060 whale → verify under **SM-I-001**, not as P4 exit authority
- `MKT-P4-010` complete before treating portfolio/CTF APIs as stable for PHASE-5 clients

Until those are true, keep task statuses honest (`planned` / `ready` / `in_progress` / `blocked`). Do not advance dependents early.

### How (execution procedure)

1. Build position projection service with drift metrics and hourly reconcile
2. CTF operations always preview then user auth; cap relay; test recovery
3. Activity + portfolio PnL; optional deep-links to Smart Money whale/profile (do not re-implement scoring here)
4. Withdrawal completion behind whitelist/policy approval
5. Evidence includes reconciliation test output — not screenshots alone

### Worked example

Agent on `MKT-P4-001` stores projections with venue reconcile job; UI shows “Updating” on reorg rather than inventing balances.

Agent asked to “ship whale feed in P4” refuses primary ownership: points to Smart Money I1 / **SM-I-001** and [01_WHALE_TRADE_FEED.md](../intelligence/01_WHALE_TRADE_FEED.md). Historical task `MKT-P4-003` is annotated for task-graph follow-up — do not treat P4 as whale authority.

## Production path

Build-band **Markets Core** (portfolio / CTF / redeem / withdraw). Smart Money whale/profile is PHASE-1 parallel (I1/I2) and is **not** a P4 exit gate. Staging bar: positions reconcile + CTF preview/receipt before Harden ([PHASE-6](PHASE-6-HARDENING-CI-CD-AND-SRE.md)). See [PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md](PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md).


## Phase ID and exact name

- **Phase ID:** `PHASE-4`
- **Exact name:** Portfolio, Redemption, and Withdrawal

## Business outcome

Activity, positions, portfolio PnL, CTF, resolution, redeem, complete asset exit. Whale/profile surfaces belong to Smart Money Launch (not P4 business outcome).

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
- CTF split/merge
- Redemption
- Withdrawal
- PnL (portfolio)
- Reconcile tests

## Out of scope

- Android UI
- Combos
- Guaranteed arb labels
- Whale feed / wallet profiles / leaderboard as P4-owned (Smart Money **I1–I3** / PHASE-1 parallel — [01_WHALE_TRADE_FEED.md](../intelligence/01_WHALE_TRADE_FEED.md), [03_WALLET_PROFILE.md](../intelligence/03_WALLET_PROFILE.md))
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)

## Repository areas affected

- internal/markets/portfolio/
- internal/markets/ctf/
- (no primary `intelligence/` ownership — portfolio UX deep-links to Smart Money APIs OK)

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
- WalletProfile — Smart Money (**SM-I-003**); not P4 schema ownership
- LargeTradeSignal — Smart Money (**SM-I-001**); not P4 schema ownership
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
- Signal retraction — Smart Money path when consuming intel deep-links; not a P4 Core deliverable

## Observability

- reconciliation_errors
- redemption_pending
- whale_latency — owned under Smart Money / **SM-I-001**, not P4 SLI authority

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
- Retract bad signals — Smart Money ops when intel flags on; not a P4 Core rollback step

## Risks and mitigations

- **Risk:** Projection drift — **Mitigation:** Hourly reconcile
- **Risk:** False whale — **Mitigation:** Retraction pipeline under Smart Money (**SM-I-001**); not a P4-owned risk row

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
| MKT-P4-002 | Activity feed | Deliver activity feed | MKT-P4-004 |
| MKT-P4-003 | Whale/large-trade feed | **OWNERSHIP MOVED → SM-I-001** (I1 / PHASE-1 parallel). Task-graph follow-up — do not treat P4 as whale authority. Spec: [01_WHALE_TRADE_FEED.md](../intelligence/01_WHALE_TRADE_FEED.md) | — |
| MKT-P4-004 | CTF split/merge | Deliver ctf split/merge | MKT-P4-005 |
| MKT-P4-005 | Resolution and redemption | Deliver resolution and redemption | MKT-P4-006 |
| MKT-P4-006 | Withdrawal completion | Deliver withdrawal completion | MKT-P4-008 |
| MKT-P4-007 | Wallet profiling | **OWNERSHIP MOVED → SM-I-003** (I2 / PHASE-1 parallel). Task-graph follow-up — not P4 portfolio authority. Spec: [03_WALLET_PROFILE.md](../intelligence/03_WALLET_PROFILE.md) | — |
| MKT-P4-008 | PnL analytics | Deliver portfolio PnL analytics | MKT-P4-009 |
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

> **Annotation (2026-08-09):** Ownership moved to **SM-I-001** / Smart Money **I1** (PHASE-1 parallel). Spec authority: [01_WHALE_TRADE_FEED.md](../intelligence/01_WHALE_TRADE_FEED.md), [INTELLIGENCE_LAUNCH_V1.md](../intelligence/INTELLIGENCE_LAUNCH_V1.md). Task-graph still lists this ID under PHASE-4 — follow-up for orchestrator; **do not treat P4 as whale authority**.

**Goal:** Historical placeholder only — do not implement whale feed under P4 authorization.

**Acceptance:** N/A for P4 exit. Verify under Smart Money / SM-I-001.

**Commands:** See task-graph.yaml `commands` array (pending rehome).

**Owned paths:** Do not claim exclusive `intelligence/` ownership from P4.

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

> **Annotation (2026-08-09):** Ownership moved to **SM-I-003** / Smart Money **I2** (PHASE-1 parallel). Spec authority: [03_WALLET_PROFILE.md](../intelligence/03_WALLET_PROFILE.md). Task-graph follow-up — **not** P4 portfolio authority. Portfolio UX deep-links OK.

**Goal:** Historical placeholder only — do not implement Launch wallet profile under P4 authorization.

**Acceptance:** N/A for P4 exit. Verify under Smart Money / SM-I-003.

**Commands:** See task-graph.yaml `commands` array (pending rehome).

**Owned paths:** Do not claim exclusive `intelligence/` ownership from P4.

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

Positions before CTF. Smart Money I1/I2 may run in PHASE-1 parallel — independent of P4 CTF/redeem path.

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
| MKT-FR-060 | Whale feed | **OWNERSHIP → SM-I-001** (I1). Not P4 exit authority — verify via Smart Money / [01_WHALE_TRADE_FEED.md](../intelligence/01_WHALE_TRADE_FEED.md); task-graph follow-up |
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
| Phase | PHASE-4 (deep-link only; authority = Smart Money / SM-I-*) |
| Kill switch | `intelligence.*` capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
