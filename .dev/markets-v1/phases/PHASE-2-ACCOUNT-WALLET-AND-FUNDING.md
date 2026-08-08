# PHASE-2 — Account Wallet and Funding

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Phase ID and exact name

- **Phase ID:** `PHASE-2`
- **Exact name:** Account Wallet and Funding

## Business outcome

Eligibility, session, wallet connect, account wallet, approvals, balances, deposit, withdrawal foundations.

## Technical outcome

Signer/account-wallet separation tested; deposit/withdrawal reconcile; regions fail closed.

## Prerequisites

PHASE-1 exit; auth schemas drafted.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../agent-harness/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: PHASE-1 complete.
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- Wallet connect
- Eligibility
- Account wallet
- Approvals
- Balances
- Deposit
- Withdrawal
- Notifications
- Relayer sandbox

## Out of scope

- Order submission
- CTF production
- Android trading
- Combos
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)

## Repository areas affected

- internal/markets/auth/
- internal/markets/eligibility/
- web wallet/

## New modules/files expected

- internal/markets/wallet/
- internal/markets/funding/
- migrations/*users*

## Data migrations

- markets_user_sessions
- markets_eligibility_decisions
- markets_funding_transactions
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

- EligibilityResponse
- WalletSession
- DepositStatus
- WithdrawalPreview
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- Geoblock API
- WalletConnect
- Builder relayer sandbox
- Polygon RPC reads

## On-chain interactions

- ERC-20 approve user-signed
- Account wallet deploy sandbox
- Balance reads
RetroPick never holds user private keys.

## Security controls

- No key custody
- Fail-closed eligibility
- Relayer allowlists

## Observability

- eligibility_latency
- deposit_transitions

## Test plan

- Auth tests
- Eligibility vectors
- Deposit FSM tests
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- Staging auth
- sandbox secrets

## Deployment sequence

- Enable staging auth endpoints

## Rollback sequence

- Disable funding endpoints
- revoke sandbox creds

## Risks and mitigations

- **Risk:** Geoblock down — **Mitigation:** Fail closed
- **Risk:** Relayer drain — **Mitigation:** Budget caps

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

- Sandbox wallet funding
- Relayer sandbox creds
- Eligibility policy review
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P2-001 | Wallet connect and session auth | Deliver wallet connect and session auth | MKT-P2-002 |
| MKT-P2-002 | Fail-closed eligibility service | Deliver fail-closed eligibility service | MKT-P2-003 |
| MKT-P2-003 | Account wallet discovery | Deliver account wallet discovery | MKT-P2-004 |
| MKT-P2-004 | Token approvals | Deliver token approvals | MKT-P2-005 |
| MKT-P2-005 | Balance projections | Deliver balance projections | MKT-P2-006 |
| MKT-P2-006 | Deposit flow | Deliver deposit flow | MKT-P2-007 |
| MKT-P2-007 | Withdrawal preview | Deliver withdrawal preview | MKT-P2-008 |
| MKT-P2-008 | Funding notifications | Deliver funding notifications | MKT-P2-009 |
| MKT-P2-009 | Relayer sandbox | Deliver relayer sandbox | MKT-P2-010 |
| MKT-P2-010 | PHASE-2 exit gate | Deliver phase-2 exit gate | MKT-P3-001 |

### MKT-P2-001 — Wallet connect and session auth

**Goal:** Implement Wallet connect and session auth within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-002 — Fail-closed eligibility service

**Goal:** Implement Fail-closed eligibility service within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-003 — Account wallet discovery

**Goal:** Implement Account wallet discovery within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-004 — Token approvals

**Goal:** Implement Token approvals within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-005 — Balance projections

**Goal:** Implement Balance projections within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-006 — Deposit flow

**Goal:** Implement Deposit flow within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-007 — Withdrawal preview

**Goal:** Implement Withdrawal preview within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-008 — Funding notifications

**Goal:** Implement Funding notifications within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-009 — Relayer sandbox

**Goal:** Implement Relayer sandbox within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P2-010 — PHASE-2 exit gate

**Goal:** Implement PHASE-2 exit gate within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

Wallet before funding; sandbox approval for relayer.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-2 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-FR-020 | Wallet connect | Phase tests |
| MKT-FR-021 | Fail-closed eligibility | Phase tests |
| MKT-SEC-001 | No key custody | Phase tests |
| MKT-SEC-003 | Session binding | Phase tests |

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

Begin `PHASE-3` when all PHASE-2 tasks done, evidence archived, manifest updated.

First task: `MKT-P3-001`.

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
| Phase | PHASE-2 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-2 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-2 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-2 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-2 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-2 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-2 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-2 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
