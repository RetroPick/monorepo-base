# PHASE-3 — Web Trading Core

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Description

PHASE-3 is web trading core: order preview, CLOB V2 submit, open orders/fills, cancel, reconciliation worker, Neg Risk routing, order ticket UX, and web E2E. Strict order is preview → sign/submit; timeout must reconcile via venue lookup — never auto-resubmit.

Market health analytics are **archived** (not on the critical path); slippage concepts for paper live in [`09_PAPER_COPY.md`](../intelligence/09_PAPER_COPY.md). Future Smart Money **I7** (manual copy + user-signed order) may follow only after trading exists — ADR-009, no auto-copy. Paper/backtest (**I5–I6**) may overlap the calendar but **must not** submit orders.

Duplicate submits, stale books, and preview/sign mismatch are direct user-fund risks. Confirm CLOB V2 registry assumptions before write paths; kill switch `order_submission` / trading_enabled must exist for rollback. Human gates clear before first mainnet order.

Owned code: `internal/markets/orders|clob|reconcile/`, web trade/`OrderTicket.tsx`, orders/fills/previews migrations. Android trading, portfolio redemption/CTF completion, combos, and auto copy trade are out of scope. Exit via `MKT-P3-010` before PHASE-4.

## 0. Developer intent (5W+1H)

Orientation for agents executing **PHASE-3 — Web Trading Core**. The document header **Status: reviewed** means this phase *spec* was reviewed for quality — it is **not** a claim that the phase has exited or that all tasks are complete. Live execution state lives only in `implementation-manifest.yaml` (`current_phase`) and per-task statuses in `task-graph.yaml`. Do not invent phase progress from this file.

| Dimension | Intent |
|-----------|--------|
| **Who** | Orders/CLOB backend agents, fe-markets order-ticket owners, reconcile workers; humans for first mainnet order, Builder prod fees, and prod CLOB credentials. |
| **What** | Web trading core: order preview, CLOB V2 submit, open orders/fills, cancel, reconciliation worker, Neg Risk routing, order ticket UX, web E2E. Market health analytics archived (not critical path). |
| **When** | After PHASE-2 exit and CLOB V2 evidence verification. Strict order: preview → sign/submit; reconcile worker before production enablement; canary/flagged deploy only with approvals. Paper/backtest may overlap but must not submit; **I7** only after trading exists (ADR-009). |
| **Where** | `internal/markets/orders|clob|reconcile/`, web trade/`OrderTicket.tsx`, `polymarket/ORDER_LIFECYCLE.md`, migrations for orders/fills/previews. Integrations: CLOB V2 write, Builder headers, matching WS. Client EIP-712 sign; server relays signed orders only. |
| **Why** | Duplicate submits, stale books, and preview/sign mismatch are direct user-fund risks. Timeout must reconcile via venue lookup — never auto-resubmit. |
| **How** | Follow the numbered procedure below; stay inside owned paths; file evidence; never mark the phase done without the exit-gate checklist. |

### In scope (agent boundary for this phase)

- `MKT-P3-001`…`MKT-P3-010` including Neg Risk and web E2E
- Preview hash binding, idempotency keys, trading kill switch, fee disclosure
- Calendar overlap with paper/backtest (**I5–I6**) is allowed only as simulation — never CLOB submit from intel paths
- Future **I7** manual copy + user-signed order only after trading core exists (ADR-009); not Launch default

### Out of scope (do not implement under this phase authorization)

- Android trading UI, portfolio redemption/CTF completion, combos, auto copy trade
- Market health dashboard (`MKT-P3-006` superseded/archived — do not implement; optional note only; slippage for paper in [`09_PAPER_COPY.md`](../intelligence/09_PAPER_COPY.md))
- PRISM/legacy; custom exchange

### Exit gate — what “done” means for an agent

A single task is done only with verification evidence + handoff. The **phase** is done only when **all** of the following hold (orchestrator records manifest advance):

- Preview matches signature; Neg Risk vectors pass; timeout path reconciles not resubmits
- Stale book disables marketable orders; REQ MKT-FR-030/031, MKT-SEC-002, MKT-POLY-001, MKT-NFR-040 evidenced
- Human gates cleared before real mainnet orders; `MKT-P3-010` done before PHASE-4

Until those are true, keep task statuses honest (`planned` / `ready` / `in_progress` / `blocked`). Do not advance dependents early.

### How (execution procedure)

1. Confirm CLOB V2 registry assumptions (A-003) still valid; else revalidate/block
2. Ship preview endpoint before submit; bind EIP-712 payload to preview hash
3. Submit path: idempotent; on uncertainty run reconcile worker first
4. Kill switch `order_submission` / trading_enabled flag for rollback
5. E2E with capped staging wallets only; never invent mainnet success

### Worked example

Agent completes `MKT-P3-001` golden vectors for preview binding, then `MKT-P3-002` submit uses that hash. A 30s client timeout triggers “Checking status” + venue lookup (`MKT-P3-005`), not a second submit.

First mainnet order remains blocked until blockers log shows human approval — agent stops and files the gate, even if staging E2E is green.

## Production path

Staging trading canary → harden (PHASE-6) → PHASE-7 production. Trading canary is **separate** from intel canary; do not couple CLOB write enablement to PUBLIC/ACCOUNT intelligence flags.

## Phase ID and exact name

- **Phase ID:** `PHASE-3`
- **Exact name:** Web Trading Core

## Business outcome

Web order preview, submit, fills, cancel, reconciliation. Market health analytics archived (not required for exit).

## Technical outcome

Preview matches signature; Neg Risk routing passes vectors; timeout reconciles not resubmits.

## Prerequisites

PHASE-2 exit; CLOB V2 verified.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../../../.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md)

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
- Order ticket UX
- Neg Risk routing
- Web E2E

## Out of scope

- Android trading
- Portfolio redemption
- Combos
- Auto copy trade (ADR-009); market health dashboard (archived)
Current Markets V1 authority: `.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md`.
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
- ~~MarketHealthMetrics~~ (archived — not required for PHASE-3)
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
| MKT-P3-005 | Reconciliation worker | Deliver reconciliation worker | MKT-P3-007 |
| MKT-P3-006 | Market health analytics | **Superseded/archived** — do not implement dashboard; optional note only; handoff skipped | MKT-P3-007 |
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

### MKT-P3-006 — Market health analytics (**superseded / archived**)

Current Markets V1 authority: `.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md`.

**Acceptance:** No dashboard ship; critical path continues via `MKT-P3-005` → `MKT-P3-007`.

**Commands:** N/A for archived surface (do not invent health analytics metrics exports).

**Owned paths:** N/A — do not claim exclusive paths for archived health work.

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

- All tasks complete (**except archived `MKT-P3-006`** — does not block exit)
- Exit gate evidence
- No open P0/P1 security without acceptance
- Runbooks updated
- Manifest updated
## Handoff to next phase

Begin `PHASE-4` when PHASE-3 trading tasks done (archived `MKT-P3-006` excluded), evidence archived, manifest updated.

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
