# PHASE-1 — Foundation and Read Markets

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Description

PHASE-1 is the first executable product phase: read-only Markets foundation — OpenAPI expansion, Gamma catalog client, DB cache/migrations, web read routes, signal schema foundation, realtime snapshot/gap-recovery design, Android scaffold *plan*, contract conformance, and observability. No wallet signing or fund movement.

Catalog/detail/book with explicit staleness is the trust base for later trading. Freeze OpenAPI before parallel backend/web work. Complete `MKT-P1-010` before any PHASE-2 wallet/funding authorization.

Owned paths center on `schemas/openapi/`, `apps/backend/internal/markets/` (gamma/catalog), catalog migrations, and `apps/web/src/products/markets/`. External reads: Polymarket Gamma + CLOB **read** endpoints only. Do not invent phase progress from this file’s reviewed status.

## 0. Developer intent (5W+1H)

Orientation for agents executing **PHASE-1 — Foundation and Read Markets**. The document header **Status: reviewed** means this phase *spec* was reviewed for quality — it is **not** a claim that the phase has exited or that all tasks are complete. Live execution state lives only in `implementation-manifest.yaml` (`current_phase`) and per-task statuses in `task-graph.yaml`. Do not invent phase progress from this file.

| Dimension | Intent |
|-----------|--------|
| **Who** | be-api / be-indexer / be-data, fe-markets, schema owners; qa for contract tests; orchestrator for `MKT-P1-010`. Manifest currently lists `current_phase: PHASE-1` as the first executable product phase after Wave 9 — still confirm the live file before acting. |
| **What** | Read-only Markets foundation: OpenAPI expansion, Gamma catalog client, DB cache/migrations, web read routes, signal schema foundation, realtime snapshot/gap-recovery design, Android scaffold *plan*, contract conformance, observability — **no** signing or fund movement. |
| **When** | Only after PHASE-0 exit gate. Freeze OpenAPI before parallel backend/web. Complete `MKT-P1-010` before any PHASE-2 wallet/funding authorization. |
| **Where** | `schemas/openapi/`, `apps/backend/internal/markets/` (gamma/catalog), migrations `*catalog*`, `apps/web/src/products/markets/`, design notes under `.dev/markets-v1/`. External: Polymarket Gamma + CLOB **read** endpoints. |
| **Why** | Catalog/detail/book with explicit staleness is the trust base for later trading. Wallet or submit code in this phase would violate read-before-write and preview-before-sign sequencing. |
| **How** | Follow the numbered procedure below; stay inside owned paths; file evidence; never mark the phase done without the exit-gate checklist. |

### In scope (agent boundary for this phase)

- `MKT-P1-001`…`MKT-P1-010`: OpenAPI, Gamma client, schema v1, web read routes, signals, realtime design, Android scaffold plan, contracts, observability, exit gate
- Types/events such as EventDetail, MarketSummary, OrderBookSnapshot, SignalEnvelope
- Expand-only migrations (catalog events, watchlists, sync checkpoints)

### Out of scope (do not implement under this phase authorization)

- Wallet connect, order submit, CTF operations, production deploy
- PRISM / legacy epoch feature work; custom exchange

### Exit gate — what “done” means for an agent

A single task is done only with verification evidence + handoff. The **phase** is done only when **all** of the following hold (orchestrator records manifest advance):

- Web renders canonical market; stale states explicit in UX/API
- OpenAPI validate + go/web/contract tests green per task commands
- REQ rows (e.g. MKT-FR-001/002/010, MKT-NFR-001/060, MKT-WEB-001) evidenced
- Exit gate task complete; handoff to `MKT-P2-001` only after orchestrator advance

Until those are true, keep task statuses honest (`planned` / `ready` / `in_progress` / `blocked`). Do not advance dependents early.

### How (execution procedure)

1. Confirm PHASE-0 exited and manifest allows PHASE-1; pick one ready task
2. Schemas/migrations before dependent clients; one owner per writable path
3. Implement read paths with rate limits, validation, sanitized rules HTML
4. Instrument catalog_freshness / gamma_errors as tasked; never fake SLO exports
5. File evidence + invariant greps (money fixed-point, venue boundaries) before done

### Worked example

Agent on `MKT-P1-004` builds web read routes consuming frozen OpenAPI types, shows a stale badge when book age exceeds threshold, runs web build + contract tests, and attaches evidence.

They explicitly do not add WalletConnect or order ticket submit — those belong to PHASE-2/3 — even if the UI mock looks incomplete without them.


## Phase ID and exact name

- **Phase ID:** `PHASE-1`
- **Exact name:** Foundation and Read Markets

## Business outcome

Establish schemas, public catalog, market detail, order book, web read experience, Android read foundation without trading.

## Technical outcome

Web renders canonical market; stale states explicit; no signing or fund movement.

## Prerequisites

PHASE-0 exit gate; ADRs accepted.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../agent-harness/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: PHASE-0 complete.
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- OpenAPI expansion
- Gamma client
- DB cache
- Web read routes
- Signal foundation
- Realtime design
- Android scaffold plan
- Contract tests
- Observability

## Out of scope

- Wallet connect
- Order submit
- CTF
- Production deploy
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)

## Repository areas affected

- schemas/openapi/
- apps/backend/internal/markets/
- apps/web/src/products/markets/

## New modules/files expected

- internal/markets/gamma/
- migrations/*catalog*
- web markets routes

## Data migrations

- markets_catalog_events
- markets_watchlists
- markets_sync_checkpoints
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

- EventDetail
- MarketSummary
- OrderBookSnapshot
- SignalEnvelope
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- Polymarket Gamma
- CLOB read endpoints

## On-chain interactions

Read-only indexer design only.
RetroPick never holds user private keys.

## Security controls

- Rate limits
- Input validation
- Sanitize rules HTML

## Observability

- catalog_freshness_seconds
- gamma_errors_total

## Test plan

- OpenAPI validate
- go test
- contract tests
- web build
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- CI OpenAPI job
- conformance tests

## Deployment sequence

- Staging BFF
- expand-only migrations

## Rollback sequence

- Disable ingest
- stale banner
- revert migration

## Risks and mitigations

- **Risk:** Gamma rate limits — **Mitigation:** Cache and circuit breaker
- **Risk:** Schema drift — **Mitigation:** Contract tests

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

- Optional staging read deploy notice
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P1-001 | OpenAPI markets-v1 expansion | Deliver openapi markets-v1 expansion | MKT-P1-002 |
| MKT-P1-002 | Gamma catalog client hardening | Deliver gamma catalog client hardening | MKT-P1-003 |
| MKT-P1-003 | Markets database schema v1 | Deliver markets database schema v1 | MKT-P1-004 |
| MKT-P1-004 | Web markets read routes | Deliver web markets read routes | MKT-P1-005 |
| MKT-P1-005 | Signal schema foundation | Deliver signal schema foundation | MKT-P1-006 |
| MKT-P1-006 | Realtime snapshot and gap recovery design | Deliver realtime snapshot and gap recovery design | MKT-P1-007 |
| MKT-P1-007 | Android module scaffold plan | Deliver android module scaffold plan | MKT-P1-008 |
| MKT-P1-008 | Contract conformance tests | Deliver contract conformance tests | MKT-P1-009 |
| MKT-P1-009 | Observability baseline | Deliver observability baseline | MKT-P1-010 |
| MKT-P1-010 | PHASE-1 exit gate verification | Deliver phase-1 exit gate verification | MKT-P2-001 |

### MKT-P1-001 — OpenAPI markets-v1 expansion

**Goal:** Implement OpenAPI markets-v1 expansion within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-002 — Gamma catalog client hardening

**Goal:** Implement Gamma catalog client hardening within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-003 — Markets database schema v1

**Goal:** Implement Markets database schema v1 within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-004 — Web markets read routes

**Goal:** Implement Web markets read routes within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-005 — Signal schema foundation

**Goal:** Implement Signal schema foundation within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-006 — Realtime snapshot and gap recovery design

**Goal:** Implement Realtime snapshot and gap recovery design within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-007 — Android module scaffold plan

**Goal:** Implement Android module scaffold plan within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-008 — Contract conformance tests

**Goal:** Implement Contract conformance tests within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-009 — Observability baseline

**Goal:** Implement Observability baseline within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P1-010 — PHASE-1 exit gate verification

**Goal:** Implement PHASE-1 exit gate verification within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

OpenAPI frozen before parallel backend/web; one owner per path.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-1 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-FR-001 | List events | Phase tests |
| MKT-FR-002 | Market rules | Phase tests |
| MKT-FR-010 | Order book staleness | Phase tests |
| MKT-FR-050 | Watchlist alerts | Phase tests |
| MKT-NFR-001 | Catalog freshness p95<60s | Phase tests |
| MKT-NFR-060 | Fixed-point money | Phase tests |
| MKT-WEB-001 | OpenAPI types | Phase tests |

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

Begin `PHASE-2` when all PHASE-1 tasks done, evidence archived, manifest updated.

First task: `MKT-P2-001`.

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
| Phase | PHASE-1 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-1 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-1 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-1 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-1 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-1 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-1 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-1 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
