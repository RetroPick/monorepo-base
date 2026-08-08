# PHASE-3 — Web Trading Core

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Phase ID and exact name

- **Phase ID:** `PHASE-3`
- **Exact name:** Web Trading Core

## Business outcome

Web order preview, submit, fills, cancel, reconciliation; market health analytics off critical path.

## Technical outcome

Preview matches signature; Neg Risk routing passes vectors; timeout reconciles not resubmits.

## Prerequisites

PHASE-2 exit; CLOB V2 verified.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../agent-harness/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: PHASE-2 complete.
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- Order preview
- CLOB submit
- Open orders
- Cancel
- Reconcile worker
- Market health
- Order ticket UX
- Neg Risk routing
- Web E2E

## Out of scope

- Android trading
- Portfolio redemption
- Combos
- Auto copy trade
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)

## Repository areas affected

- internal/markets/orders/
- web trade/
- polymarket/ORDER_LIFECYCLE.md

## New modules/files expected

- internal/markets/clob/
- internal/markets/reconcile/
- OrderTicket.tsx

## Data migrations

- markets_user_orders
- markets_fills
- markets_order_previews
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

- OrderPreview
- OrderSubmit
- OpenOrder
- CancelPayload
- MarketHealthMetrics
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- CLOB V2 write
- Builder headers
- Matching WS

## On-chain interactions

- EIP-712 client sign
- Server relays signed order
RetroPick never holds user private keys.

## Security controls

- Preview hash binding
- Idempotency
- Kill switch
- Fee disclosure

## Observability

- preview_latency
- submit_success
- reconciliation_lag

## Test plan

- Golden vectors
- Web E2E
- Neg Risk tests
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- Contract tests
- staging E2E capped wallets

## Deployment sequence

- trading_enabled flag
- canary 5%

## Rollback sequence

- Kill order_submission
- reconcile in-flight

## Risks and mitigations

- **Risk:** Stale book — **Mitigation:** Disable marketable
- **Risk:** Duplicate submit — **Mitigation:** Venue lookup first

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

- First mainnet order
- Builder prod fees
- Prod CLOB creds
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P3-001 | Order preview endpoint | Deliver order preview endpoint | MKT-P3-002 |
| MKT-P3-002 | CLOB V2 submission | Deliver clob v2 submission | MKT-P3-003 |
| MKT-P3-003 | Open orders and fills | Deliver open orders and fills | MKT-P3-004 |
| MKT-P3-004 | Order cancellation | Deliver order cancellation | MKT-P3-005 |
| MKT-P3-005 | Reconciliation worker | Deliver reconciliation worker | MKT-P3-006 |
| MKT-P3-006 | Market health analytics | Deliver market health analytics | MKT-P3-007 |
| MKT-P3-007 | Web order ticket UX | Deliver web order ticket ux | MKT-P3-008 |
| MKT-P3-008 | Neg Risk routing | Deliver neg risk routing | MKT-P3-009 |
| MKT-P3-009 | Web E2E trading | Deliver web e2e trading | MKT-P3-010 |
| MKT-P3-010 | PHASE-3 exit gate | Deliver phase-3 exit gate | MKT-P4-001 |

### MKT-P3-001 — Order preview endpoint

**Goal:** Implement Order preview endpoint within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-002 — CLOB V2 submission

**Goal:** Implement CLOB V2 submission within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-003 — Open orders and fills

**Goal:** Implement Open orders and fills within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-004 — Order cancellation

**Goal:** Implement Order cancellation within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-005 — Reconciliation worker

**Goal:** Implement Reconciliation worker within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-006 — Market health analytics

**Goal:** Implement Market health analytics within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-007 — Web order ticket UX

**Goal:** Implement Web order ticket UX within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-008 — Neg Risk routing

**Goal:** Implement Neg Risk routing within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-009 — Web E2E trading

**Goal:** Implement Web E2E trading within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P3-010 — PHASE-3 exit gate

**Goal:** Implement PHASE-3 exit gate within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

Preview before submit; reconcile before prod enable.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-3 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-FR-030 | Preview binding | Phase tests |
| MKT-FR-031 | CLOB submit | Phase tests |
| MKT-SEC-002 | Preview-before-sign | Phase tests |
| MKT-POLY-001 | CLOB V2 only | Phase tests |
| MKT-NFR-040 | WCAG order ticket | Phase tests |

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

Begin `PHASE-4` when all PHASE-3 tasks done, evidence archived, manifest updated.

First task: `MKT-P4-001`.

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
| Phase | PHASE-3 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-3 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-3 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-3 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-3 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-3 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-3 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-3 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
