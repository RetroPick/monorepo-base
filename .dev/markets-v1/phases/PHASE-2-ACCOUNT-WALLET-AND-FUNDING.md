# PHASE-2 — Account Wallet and Funding

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Description

PHASE-2 delivers account, wallet, and funding without order submission: eligibility, session, wallet connect, account-wallet discovery, token approvals, balance projections, deposit flow, withdrawal preview, funding notifications, and relayer sandbox — proving signer ≠ account wallet and fail-closed regions.

Smart Money **I4** (ACCOUNT) lands here: Follow Wallet + Basic Whale Alerts — private follows by default; alerts deep-link to market view only (`VIEW_MARKET`); never execute. Specs: [`06_FOLLOW_WALLET.md`](../intelligence/06_FOLLOW_WALLET.md), [`08_BASIC_WHALE_ALERTS.md`](../intelligence/08_BASIC_WHALE_ALERTS.md). **I5–I6** (paper/backtest) may start after auth but must **not** submit orders.

Custody mistakes and open-when-unknown geoblock are irreversible trust failures. Funding without reconcile FSMs creates double-credit risk before any trade exists. Scan blockers (e.g. BLK-001 geoblock, BLK-005 wallet flows) before coding; never hardcode `eligible=true`.

APIs such as EligibilityResponse, WalletSession, DepositStatus, and WithdrawalPreview belong here. User-signed ERC-20 approve and sandbox account-wallet deploy are in scope; server-held user keys and CLOB submit are not. Exit via `MKT-P2-010` before PHASE-3.

## 0. Developer intent (5W+1H)

Orientation for agents executing **PHASE-2 — Account Wallet and Funding**. The document header **Status: reviewed** means this phase *spec* was reviewed for quality — it is **not** a claim that the phase has exited or that all tasks are complete. Live execution state lives only in `implementation-manifest.yaml` (`current_phase`) and per-task statuses in `task-graph.yaml`. Do not invent phase progress from this file.

| Dimension | Intent |
|-----------|--------|
| **Who** | fe-wallet, be-api auth/eligibility/funding agents; ops for sandbox wallet & relayer creds; security for custody/session binding review. |
| **What** | Eligibility, session, wallet connect, account-wallet discovery, token approvals, balance projections, deposit flow, withdrawal preview, funding notifications, and relayer sandbox — proving signer ≠ account wallet and fail-closed regions. Plus Smart Money **I4** ACCOUNT: private follows + whale alerts (deep-link only). |
| **When** | After PHASE-1 exit and drafted auth schemas. Wallet/session before funding; human sandbox approvals before relayer budgeted work. No order submission until PHASE-3. I5–I6 may start after auth but must not submit. |
| **Where** | `internal/markets/auth|eligibility|wallet|funding/`, web wallet surfaces, migrations `*users*` / sessions / eligibility / funding_transactions. Integrations: geoblock API, WalletConnect, Builder relayer sandbox, Polygon RPC reads. |
| **Why** | Custody mistakes and open-when-unknown geoblock are irreversible trust failures. Funding without reconcile FSMs creates double-credit risk before any trade exists. |
| **How** | Follow the numbered procedure below; stay inside owned paths; file evidence; never mark the phase done without the exit-gate checklist. |

### In scope (agent boundary for this phase)

- `MKT-P2-001`…`MKT-P2-010` wallet through exit gate
- APIs: EligibilityResponse, WalletSession, DepositStatus, WithdrawalPreview
- User-signed ERC-20 approve; account-wallet deploy in sandbox; balance reads — never server-held user keys
- Smart Money **I4**: Follow Wallet + Basic Whale Alerts (ACCOUNT); private follows; alerts deep-link only (`VIEW_MARKET`); no execute — [`06_FOLLOW_WALLET.md`](../intelligence/06_FOLLOW_WALLET.md), [`08_BASIC_WHALE_ALERTS.md`](../intelligence/08_BASIC_WHALE_ALERTS.md)
- Optional early **I5–I6** after auth (paper/backtest simulation only; must not submit orders)

### Out of scope (do not implement under this phase authorization)

- CLOB order submission (PHASE-3), CTF production, Android trading, combos
- Auto-copy / signal→order path (ADR-009)
- PRISM/legacy; custom exchange; bypassing open blockers by hardcoding eligible=true

### Exit gate — what “done” means for an agent

A single task is done only with verification evidence + handoff. The **phase** is done only when **all** of the following hold (orchestrator records manifest advance):

- Signer/account-wallet separation tested; deposit/withdrawal reconcile paths proven in sandbox
- Unknown/timeout eligibility → fail closed; required sandbox approvals filed
- REQ MKT-FR-020/021, MKT-SEC-001/003 evidenced; `MKT-P2-010` complete before PHASE-3

Until those are true, keep task statuses honest (`planned` / `ready` / `in_progress` / `blocked`). Do not advance dependents early.

### How (execution procedure)

1. Scan BLOCKERS (e.g. BLK-001 geoblock, BLK-005 wallet flows); stop if gated
2. Implement session binding without storing raw private keys (T4)
3. Build deposit FSM + withdrawal preview with idempotent safe retries only
4. Relayer sandbox behind allowlists/budget caps after human cred approval
5. Evidence + handoff; escalate rather than inventing geoblock upstream success

### Worked example

Agent on `MKT-P2-002` encodes geoblock timeout as `eligible: false`, adds unit/contract vectors, and if upstream is unwired logs BLK-001 and leaves the task blocked instead of shipping an allow-all stub.

Deposit work (`MKT-P2-006`) records transition metrics and reconcile hooks but never calls CLOB submit APIs.

## Production path

Staging account/funding (+ I4 ACCOUNT intel behind flags) → harden (PHASE-6) → PHASE-7 production. Funding and follow/alerts canaries stay separate from CLOB write enablement.

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
- [AGENT_OPERATING_CONTRACT.md](../../../.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md)

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
- I4 Follow Wallet + Basic Whale Alerts (ACCOUNT; deep-link only)

## Out of scope

- Order submission / CLOB submit (PHASE-3)
- Auto-copy (ADR-009)
- CTF production
- Android trading
- Combos
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
