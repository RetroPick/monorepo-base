# PHASE-0 — Discovery and Spec Freeze

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Description

PHASE-0 is the documentation-only discovery and spec-freeze phase. It produces repository inventory, evidence register, capability matrix, ADR set, requirements/traceability baseline, OSS provenance, threat model, cost baseline, and an exit review — eliminating unknowns that would invalidate signing, custody, deployment, or product scope.

Smart Money Launch docs ([`intelligence/INTELLIGENCE_LAUNCH_V1.md`](../intelligence/INTELLIGENCE_LAUNCH_V1.md), [`01`](../intelligence/01_WHALE_TRADE_FEED.md)…[`10`](../intelligence/10_QUICK_BACKTEST.md)) are part of the freeze corpus. UV / relationship / OSS / market-health complex DSL surfaces are archived or deferred under [`intelligence/archive/`](../intelligence/archive/) — not Launch authority. Phase ownership and production bands: [PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md](PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md).

Header **Status: reviewed** means this phase *spec* was reviewed; it is not a claim the phase exited. Live state lives only in `implementation-manifest.yaml` and `task-graph.yaml`. No runtime API or trading/funding implementation is authorized here.

Exit only via `MKT-P0-008` after ADRs/scope approval with evidence. Downstream PHASE-1 must not start from speculation. Never invent contract addresses, secrets, or “verified” upstream facts without evidence-register rows.

## 0. Developer intent (5W+1H)

Orientation for agents executing **PHASE-0 — Discovery and Spec Freeze**. The document header **Status: reviewed** means this phase *spec* was reviewed for quality — it is **not** a claim that the phase has exited or that all tasks are complete. Live execution state lives only in `implementation-manifest.yaml` (`current_phase`) and per-task statuses in `task-graph.yaml`. Do not invent phase progress from this file.

| Dimension | Intent |
|-----------|--------|
| **Who** | Platform orchestrator, docs/research/security agents drafting ADRs and inventories; product owner for V1 scope human sign-off (see blockers log). |
| **What** | Documentation-only freeze: repository inventory, evidence register, capability matrix, ADR set, requirements/traceability baseline, OSS provenance, threat model, cost baseline, and PHASE-0 exit review — eliminating unknowns that would invalidate signing, custody, deployment, or product scope. |
| **When** | First program phase (no upstream phase). Enter after documentation baseline and master-prompt acceptance. Exit only via `MKT-P0-008` after ADRs/scope approval. Downstream PHASE-1 must not start from speculation. |
| **Where** | `.dev/markets-v1/` (research, architecture/adr, agent-harness), plus referenced maps (`00_DOCUMENT_MAP.md`, `AGENT_OPERATING_CONTRACT.md`). No runtime API changes; OpenAPI path is noted as source of truth for later phases only. |
| **Why** | Unverified addresses, signer ambiguity, or unclear V1 scope poison every later phase. Freezing evidence and ADRs first is cheaper than rewriting trading/custody code. |
| **How** | Follow the numbered procedure below; stay inside owned paths; file evidence; never mark the phase done without the exit-gate checklist. |

### In scope (agent boundary for this phase)

- Repository inventory and R0–R3 audit (`MKT-P0-001`)
- Evidence register bootstrap; capability matrix and scope freeze
- ADR set acceptance; requirements and traceability baseline
- Open-source provenance audit; threat model draft
- Smart Money Launch freeze corpus: [`INTELLIGENCE_LAUNCH_V1.md`](../intelligence/INTELLIGENCE_LAUNCH_V1.md) + [`01`](../intelligence/01_WHALE_TRADE_FEED.md)…[`10`](../intelligence/10_QUICK_BACKTEST.md); treat [`intelligence/archive/`](../intelligence/archive/) as archived/deferred (UV, relationship, OSS map, market-health complex DSL)
- Phase ownership cross-check via [PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md](PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md)
- PHASE-0 exit gate review with human V1 scope approval filed

### Out of scope (do not implement under this phase authorization)

- Production wallets, real transactions, trading or funding implementation
- Android product implementation; PRISM positions; legacy epoch API features
- Custom RetroPick exchange or default custom Markets contracts (ADR-001)
- Inventing PHASE-9 or any competing phase numbering
- Advancing `current_phase` in `implementation-manifest.yaml` from documentation edits alone

### Exit gate — what “done” means for an agent

A single task is done only with verification evidence + handoff. The **phase** is done only when **all** of the following hold (orchestrator records manifest advance):

- All `MKT-P0-001`…`MKT-P0-008` tasks `done` with evidence (no invented addresses)
- §15 exit themes met: stakeholders approve V1 scope with evidence-backed ADRs, requirements, threat model
- `INVARIANT_CHECK.md` re-run clean for doc edits; blockers/approvals updated
- Handoff names `MKT-P1-001`; orchestrator may then point execution at PHASE-1 in the manifest

Until those are true, keep task statuses honest (`planned` / `ready` / `in_progress` / `blocked`). Do not advance dependents early.

### How (execution procedure)

1. Read operating contract + this phase + task-graph entry for exactly one `MKT-P0-*` task
2. Work only in owned documentation paths; cite retrieval date/confidence for Polymarket claims
3. Never invent contract addresses, secrets, or “verified” upstream facts without evidence-register rows
4. Run listed verification (link checks / YAML validation as tasked); attach VERIFICATION_EVIDENCE
5. Complete handoff; for exit gate, ensure human V1 scope approval is in BLOCKERS_AND_HUMAN_APPROVALS

### Worked example

Agent authorized for `MKT-P0-002` bootstraps `research/evidence-register.yaml` with Polymarket doc URLs, retrieval dates, and confidence (`partial`/`verified`), leaving address fields empty or marked unverified rather than guessing.

At `MKT-P0-008`, the same program refuses exit while signer-vs-account-wallet ADR-003 is missing: exit gate stays rejected, remediation listed on a filled PHASE_GATE_TEMPLATE copy, and PHASE-1 tasks remain untouched.

## Production path

Spec freeze → staging build (PHASE-1…5) → harden (PHASE-6) → production enablement (PHASE-7). This phase is documentation only; it does not authorize runtime deploy or manifest phase advance. See [PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md](PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md).

## Phase ID and exact name

- **Phase ID:** `PHASE-0`
- **Exact name:** Discovery and Spec Freeze

## Business outcome

Eliminate unknowns that can invalidate signing, custody, deployment, or product scope.

## Technical outcome

Stakeholders approve V1 scope with evidence-backed ADRs, requirements, threat model, and no unverified contract addresses.

## Prerequisites

Documentation baseline, repository access, master prompt acceptance.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../../../.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: None (first phase).
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- Repository inventory
- Evidence register
- Capability matrix
- ADR set
- Requirements baseline
- Threat model
- Cost baseline
- Smart Money Launch docs (`intelligence/INTELLIGENCE_LAUNCH_V1.md`, `01`…`10`); archive under `intelligence/archive/` noted as deferred

## Out of scope

- Production wallets
- Real transactions
- Trading code
- Android implementation
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)
- Inventing PHASE-9
- Advancing `current_phase` from docs alone

## Repository areas affected

- .dev/markets-v1/
- docs/ARCHITECTURE.md
- apps/backend/internal/markets/

## New modules/files expected

- .dev/markets-v1/research/evidence-register.yaml
- .dev/markets-v1/architecture/adr/
- .harness/products/markets-v1/

## Data migrations

None (documentation phase).
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

No runtime API changes.
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- Polymarket docs (research)
- OSS license audit

## On-chain interactions

None.
RetroPick never holds user private keys.

## Security controls

- No secrets in Git
- OSS licenses verified
- Threat model for signing/custody

## Observability

- Doc completeness metrics

## Test plan

- Documentation review checklist
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- Doc link checker
- YAML validation

## Deployment sequence

- Merge documentation PR

## Rollback sequence

- Revert doc commits if scope reversed

## Risks and mitigations

- **Risk:** Unverified addresses — **Mitigation:** Block exit gate
- **Risk:** Signer ambiguity — **Mitigation:** ADR-003 required

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

- Human V1 scope approval
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P0-001 | Repository inventory and R0-R3 audit | Deliver repository inventory and r0-r3 audit | MKT-P0-002 |
| MKT-P0-002 | Evidence register bootstrap | Deliver evidence register bootstrap | MKT-P0-003 |
| MKT-P0-003 | Capability matrix and scope freeze | Deliver capability matrix and scope freeze | MKT-P0-004 |
| MKT-P0-004 | ADR set acceptance | Deliver adr set acceptance | MKT-P0-005 |
| MKT-P0-005 | Requirements and traceability baseline | Deliver requirements and traceability baseline | MKT-P0-006 |
| MKT-P0-006 | Open-source provenance audit | Deliver open-source provenance audit | MKT-P0-007 |
| MKT-P0-007 | Threat model draft | Deliver threat model draft | MKT-P0-008 |
| MKT-P0-008 | PHASE-0 exit gate review | Deliver phase-0 exit gate review | MKT-P1-001 |

### MKT-P0-001 — Repository inventory and R0-R3 audit

**Goal:** Implement Repository inventory and R0-R3 audit within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P0-002 — Evidence register bootstrap

**Goal:** Implement Evidence register bootstrap within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P0-003 — Capability matrix and scope freeze

**Goal:** Implement Capability matrix and scope freeze within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P0-004 — ADR set acceptance

**Goal:** Implement ADR set acceptance within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P0-005 — Requirements and traceability baseline

**Goal:** Implement Requirements and traceability baseline within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P0-006 — Open-source provenance audit

**Goal:** Implement Open-source provenance audit within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P0-007 — Threat model draft

**Goal:** Implement Threat model draft within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P0-008 — PHASE-0 exit gate review

**Goal:** Implement PHASE-0 exit gate review within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

MKT-P0-004/MKT-P0-006 parallel after MKT-P0-002.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-0 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-NFR-020 | Secrets outside Git | Phase tests |
| MKT-SEC-001 | No key custody policy | Phase tests |

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

Begin `PHASE-1` when all PHASE-0 tasks done, evidence archived, manifest updated.

First task: `MKT-P1-001`.

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
| Phase | PHASE-0 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-0 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-0 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-0 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-0 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-0 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-0 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-0 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.

## Supplement — PHASE-0 coordination note 0

Coordinate PHASE-0 entry via implementation-manifest.yaml and task-graph.yaml. Agents must preserve unrelated changes and run listed verification commands.

## Supplement — PHASE-0 coordination note 1

Coordinate PHASE-0 entry via implementation-manifest.yaml and task-graph.yaml. Agents must preserve unrelated changes and run listed verification commands.

## Supplement — PHASE-0 coordination note 2

Coordinate PHASE-0 entry via implementation-manifest.yaml and task-graph.yaml. Agents must preserve unrelated changes and run listed verification commands.
