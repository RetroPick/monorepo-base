# PHASE-5 — Android Compose Markets

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Phase ID and exact name

- **Phase ID:** `PHASE-5`
- **Exact name:** Android Compose Markets

## Business outcome

Native Android V1 parity via shared contracts and secure wallet handoff.

## Technical outcome

Compose UDF; contract tests; wallet resume; no stale preview sign.

## Prerequisites

PHASE-3/4 APIs stable; codegen documented.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../agent-harness/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: PHASE-3 and PHASE-4.
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- Gradle modules
- Kotlin client
- Navigation
- Catalog UI
- Wallet
- Trading UI
- Portfolio
- Widgets
- Perf/a11y

## Out of scope

- Combos
- On-device wallet classification
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)

## Repository areas affected

- apps/android/
- .dev/markets-v1/android/

## New modules/files expected

- markets-feature/
- markets-data/
- markets-wallet/

## Data migrations

- Optional Room cache local
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

- OpenAPI parity
- FCM token registration
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- FCM
- Play internal
- WalletConnect mobile

## On-chain interactions

- User-signed orders
- No embedded keys
RetroPick never holds user private keys.

## Security controls

- Cert pinning
- Secure handoff
- Stale preview block

## Observability

- crash_free
- anr_rate
- push_latency

## Test plan

- Unit
- Compose UI
- Contract
- Wallet instrumented
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- Gradle lint
- Android CI
- Play internal

## Deployment sequence

- Internal track
- staged rollout

## Rollback sequence

- Halt rollout
- remote min version

## Risks and mitigations

- **Risk:** Process death signing — **Mitigation:** Resume flow
- **Risk:** Widget PII — **Mitigation:** Privacy Glance

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

- Play closed track
- Prod signing key
- FCM prod
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P5-001 | Gradle module scaffold | Deliver gradle module scaffold | MKT-P5-002 |
| MKT-P5-002 | Kotlin OpenAPI client | Deliver kotlin openapi client | MKT-P5-003 |
| MKT-P5-003 | Compose navigation | Deliver compose navigation | MKT-P5-004 |
| MKT-P5-004 | Catalog screens | Deliver catalog screens | MKT-P5-005 |
| MKT-P5-005 | Wallet handoff | Deliver wallet handoff | MKT-P5-006 |
| MKT-P5-006 | Trading screens | Deliver trading screens | MKT-P5-007 |
| MKT-P5-007 | Portfolio and alerts | Deliver portfolio and alerts | MKT-P5-008 |
| MKT-P5-008 | Widgets and notifications | Deliver widgets and notifications | MKT-P5-009 |
| MKT-P5-009 | Performance and a11y | Deliver performance and a11y | MKT-P5-010 |
| MKT-P5-010 | PHASE-5 exit gate | Deliver phase-5 exit gate | MKT-P6-001 |

### MKT-P5-001 — Gradle module scaffold

**Goal:** Implement Gradle module scaffold within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-002 — Kotlin OpenAPI client

**Goal:** Implement Kotlin OpenAPI client within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-003 — Compose navigation

**Goal:** Implement Compose navigation within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-004 — Catalog screens

**Goal:** Implement Catalog screens within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-005 — Wallet handoff

**Goal:** Implement Wallet handoff within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-006 — Trading screens

**Goal:** Implement Trading screens within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-007 — Portfolio and alerts

**Goal:** Implement Portfolio and alerts within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-008 — Widgets and notifications

**Goal:** Implement Widgets and notifications within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-009 — Performance and a11y

**Goal:** Implement Performance and a11y within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P5-010 — PHASE-5 exit gate

**Goal:** Implement PHASE-5 exit gate within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

Read before trade; wallet before orders.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-5 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-AND-001 | Compose only | Phase tests |
| MKT-NFR-050 | Cold start p75<2s | Phase tests |
| MKT-FR-031 | Mobile trading parity | Phase tests |

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

Begin `PHASE-6` when all PHASE-5 tasks done, evidence archived, manifest updated.

First task: `MKT-P6-001`.

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
| Phase | PHASE-5 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-5 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-5 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-5 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-5 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-5 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-5 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-5 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
