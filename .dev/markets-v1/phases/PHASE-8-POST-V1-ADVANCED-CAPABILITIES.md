# PHASE-8 — Post-V1 Advanced Capabilities

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Description

PHASE-8 covers post-V1 advanced capabilities under explicit ADR/flag/approval: Combos gate, manual copy-intent, professional API, execution analytics, wallet/onramp providers, AI evidence narration (verified evidence only), cross-venue research, and scope review. It is not a bundle that quietly expands V1.

**UV / relationship / complex alert DSL** are **archived research gates only** under `intelligence/archive/` — **not** the default “next intel after launch.” Launch intel ends at Paper/Backtest/Alerts ([INTELLIGENCE_LAUNCH_V1.md](../intelligence/INTELLIGENCE_LAUNCH_V1.md)). Combos and manual-copy gates are unchanged; **no guaranteed arb**; [ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md).

Prerequisites: PHASE-7 launch **and** V1 SLOs stable 30+ days. Each `MKT-P8-*` may proceed only after its capability gate. LLM is narration-only over verified evidence; trading path isolation is mandatory. Autonomous/automatic copy trading and guaranteed-arbitrage labels remain Never-V1.

Implement behind flags with per-feature SLOs and disable-for-rollback that leave V1 untouched. Terminal program phase: further work needs new ADRs and manifest entries — not ad-hoc edits to V1 paths.

## 0. Developer intent (5W+1H)

Orientation for agents executing **PHASE-8 — Post-V1 Advanced Capabilities**. The document header **Status: reviewed** means this phase *spec* was reviewed for quality — it is **not** a claim that the phase has exited or that all tasks are complete. Live execution state lives only in `implementation-manifest.yaml` (`current_phase`) and per-task statuses in `task-graph.yaml`. Do not invent phase progress from this file.

| Dimension | Intent |
|-----------|--------|
| **Who** | Per-capability feature owners; product+legal+security approvers for each gate; orchestrator preventing silent V1 scope creep. |
| **What** | Post-V1 gated capabilities: combos, manual copy-intent, pro API, exec analytics, onramps, AI narration, optional cross-venue research. UV/relationship/complex alert DSL = archived research only unless a gate reopens them. |
| **When** | After PHASE-7 launch **and** V1 SLOs stable 30+ days. Each `MKT-P8-*` only after its capability gate — not as a silent V1 expansion or default intel backlog. |
| **Where** | Feature-flagged modules under `internal/markets/advanced/`; optional API v2 pro tier. Archived research lives under `intelligence/archive/` (not default agent load). LLM narration only; trading path isolation mandatory. |
| **Why** | Combos liquidity, AI hallucination, and autonomous copy trading are high-risk. Treating archived UV/relationship as “next after launch” recreates Wave-6 scope creep. |
| **How** | Follow the numbered procedure below; stay inside owned paths; file evidence; never mark the phase done without the exit-gate checklist. |

### In scope (agent boundary for this phase)

- `MKT-P8-001`…`MKT-P8-010` as separately gated deliverables (see archive annotation on unusual-activity)
- Official Combos API only when capability true; manual copy-intent still preview+eligibility+explicit auth (ADR-009; no guaranteed arb)
- Per-feature SLOs, LLM cost caps, flag-disable rollback with no V1 impact

### Out of scope (do not implement under this phase authorization)

- Autonomous/automatic copy trading; AI classification that invents metrics or triggers orders
- Guaranteed arbitrage labels; silent V1 creep; PRISM/legacy; custom exchange
- Default implementation of UV / relationship / complex alert DSL from `intelligence/archive/` without an explicit research reopen gate

### Exit gate — what “done” means for an agent

A single task is done only with verification evidence + handoff. The **phase** is done only when **all** of the following hold (orchestrator records manifest advance):

- Each shipped capability has ADR + approvals + evidence + flag rollback
- REQ MKT-FR-090/091 evidenced (combos gated; no auto copy trade / ADR-009)
- Terminal program phase: further work needs new ADRs and manifest entries — not ad-hoc edits to V1 paths

Until those are true, keep task statuses honest (`planned` / `ready` / `in_progress` / `blocked`). Do not advance dependents early.

### How (execution procedure)

1. Confirm 30d SLO prerequisite and per-feature human approvals before coding
2. Implement behind flags; keep intelligence failures isolated from balances/settlement
3. AI narration consumes verified deterministic evidence only
4. Manual copy-intent never skips preview/eligibility/authorization; never claim guaranteed arb
5. Disable flag for rollback; run flagged integration tests; update traceability — do not pull archive UV/relationship as default work

### Worked example

Agent on `MKT-P8-005` wires narration over signal envelopes with provenance IDs; model output cannot call order submit. Cost caps alert when exceeded.

`MKT-P8-001` hides Combos UI whenever `/markets/capabilities` is false; tests fail the build if UI appears while the flag is off. Agent asked to “ship relationship scanner next” points at `intelligence/archive/` and refuses unless an explicit gate reopens research.

## Production path

Post-V1 band after 30d SLO stability. Combos / manual-copy gates unchanged (ADR-009; no guaranteed arb). UV / relationship / complex alert DSL remain archived research — not default next intel after Launch. See [PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md](PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md).


## Phase ID and exact name

- **Phase ID:** `PHASE-8`
- **Exact name:** Post-V1 Advanced Capabilities

## Business outcome

Post-V1 capabilities without silent V1 expansion; archived intel research not treated as Launch follow-on by default.

## Technical outcome

Each shipped capability has ADR, evidence, approval; no autonomous copy trading (ADR-009); no guaranteed arb.

## Prerequisites

PHASE-7 launch; V1 SLOs stable 30+ days.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../../../.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: PHASE-7 complete.
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- Combos gate (unchanged; official API only when capability true)
- Manual copy-intent (ADR-009; no auto; no guaranteed arb)
- Cross-venue research (gated)
- AI narration
- Pro API
- Exec analytics
- Onramps
- ~~Unusual activity~~ → **archived research** (`intelligence/archive/`) unless explicit gate reopens — see `MKT-P8-002`
- ~~Relationship scanner~~ → **archived research** (`intelligence/archive/`) — not default post-launch intel

## Out of scope

- Autonomous copy trade
- Silent V1 creep
- Guaranteed arb
- AI trade signals
- Default-load of `intelligence/archive/**` as implementation authority
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)

## Repository areas affected

- internal/markets/advanced/
- `intelligence/archive/` only if a research gate reopens UV/relationship/DSL — not default Load

## New modules/files expected

- Feature-flagged modules per ADR

## Data migrations

Per-feature with approval.
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

- API v2 pro tier optional
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- Combos if official
- Onramps
- LLM narration only

## On-chain interactions

Per-feature human approval.
RetroPick never holds user private keys.

## Security controls

- Isolated from trading path
- AI cannot trigger orders

## Observability

- Per-feature SLOs
- LLM cost caps

## Test plan

- Flagged integration tests
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- Separate deploy per flag

## Deployment sequence

- Staged feature-flag rollout

## Rollback sequence

- Disable flag
- no V1 impact

## Risks and mitigations

- **Risk:** Combos liquidity — **Mitigation:** Official API only
- **Risk:** AI hallucination — **Mitigation:** Narration only

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

- Per-feature product+legal+security approval
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P8-001 | Combos capability gate | Deliver combos capability gate (ADR-009; no guaranteed arb) | MKT-P8-004 |
| MKT-P8-002 | Unusual activity heuristics | **ARCHIVED** unless explicit gate reopens research (`intelligence/archive/`). Not default next intel after Launch. | — |
| MKT-P8-003 | Relationship scanner | **ARCHIVED** research gate only (`intelligence/archive/`) — not default post-launch intel | — |
| MKT-P8-004 | Cross-venue normalization | Deliver cross-venue normalization | MKT-P8-005 |
| MKT-P8-005 | AI evidence narration | Deliver ai evidence narration | MKT-P8-006 |
| MKT-P8-006 | Manual copy-intent | Manual copy-intent (ADR-009; preview+sign; no auto; no guaranteed arb) | MKT-P8-007 |
| MKT-P8-007 | Professional API | Deliver professional api | MKT-P8-008 |
| MKT-P8-008 | Execution analytics | Deliver execution analytics | MKT-P8-009 |
| MKT-P8-009 | Wallet/onramp providers | Deliver wallet/onramp providers | MKT-P8-010 |
| MKT-P8-010 | Post-V1 scope review | Deliver post-v1 scope review | — |

### MKT-P8-001 — Combos capability gate

**Goal:** Implement Combos capability gate within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P8-002 — Unusual activity heuristics

> **Annotation (2026-08-09):** **Archived** unless an explicit human/research gate reopens work under `intelligence/archive/`. Not default “next intel after launch.” Launch alerts authority remains [08_BASIC_WHALE_ALERTS.md](../intelligence/08_BASIC_WHALE_ALERTS.md). Task-graph may still list this ID — do not implement from archive by default.

**Goal:** Historical / research-gated only — do not implement as default PHASE-8 backlog.

**Acceptance:** N/A unless gate reopens; then ADR + approvals + evidence + flag rollback; no guaranteed arb.

**Commands:** See task-graph.yaml `commands` array (pending gate).

**Owned paths:** Do not treat archive paths as default exclusive ownership.

### MKT-P8-003 — Relationship scanner

> **Annotation (2026-08-09):** **Archived research** under `intelligence/archive/` — not default post-launch intel. Explicit gate required to reopen.

**Goal:** Historical / research-gated only — do not implement as default PHASE-8 backlog.

**Acceptance:** N/A unless gate reopens; no guaranteed arbitrage labels (ADR-009 / Never V1).

**Commands:** See task-graph.yaml `commands` array (pending gate).

**Owned paths:** Do not treat archive paths as default exclusive ownership.

### MKT-P8-004 — Cross-venue normalization

**Goal:** Implement Cross-venue normalization within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P8-005 — AI evidence narration

**Goal:** Implement AI evidence narration within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P8-006 — Manual copy-intent

**Goal:** Manual copy-intent with preview + eligibility + explicit user auth only ([ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)); no auto-copy; no guaranteed arb labels.

**Acceptance:** Tests pass; no path conflicts; evidence filed; capability-gated.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P8-007 — Professional API

**Goal:** Implement Professional API within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P8-008 — Execution analytics

**Goal:** Implement Execution analytics within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P8-009 — Wallet/onramp providers

**Goal:** Implement Wallet/onramp providers within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P8-010 — Post-V1 scope review

**Goal:** Implement Post-V1 scope review within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

Each MKT-P8-* independent after gate review.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-8 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-FR-090 | Combos gated | Phase tests |
| MKT-FR-091 | No auto copy trade | Phase tests |

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

Terminal program phase; new capabilities need ADRs and manifest entries.

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
| Phase | PHASE-8 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-8 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-8 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-8 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-8 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-8 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-8 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-8 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
