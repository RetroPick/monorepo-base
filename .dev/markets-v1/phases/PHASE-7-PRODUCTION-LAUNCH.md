# PHASE-7 — Production Launch

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Description

PHASE-7 is controlled production launch: legal compliance pack, Builder production verify, web/backend canary, Android staged rollout, on-call activation, launch metrics, rollback rehearsal, evidence archive, and post-launch smoke. Agents prepare checklists and evidence; humans clear Play/Builder/legal gates before any prod write.

Ordering is legal → Builder verify → canary (1→5→25→100%) → Android staged % → smoke/archive. No silent jurisdiction expansion. Fake “staging-live success” without registry/on-chain proof is forbidden.

Scan BLK-003/020/021 and related gates before deploy steps. Rehearse rollback (kill switches + image revert + halt Play rollout). Exit only with legal/store approval, healthy canary, proven rollback, archived evidence, and green smoke — then PHASE-8 still waits on 30d SLO stability.

## 0. Developer intent (5W+1H)

Orientation for agents executing **PHASE-7 — Production Launch**. The document header **Status: reviewed** means this phase *spec* was reviewed for quality — it is **not** a claim that the phase has exited or that all tasks are complete. Live execution state lives only in `implementation-manifest.yaml` (`current_phase`) and per-task statuses in `task-graph.yaml`. Do not invent phase progress from this file.

| Dimension | Intent |
|-----------|--------|
| **Who** | Ops/SRE release engineers, legal, product, Android release owners. Agents prepare checklists, configs, and evidence; humans clear Play/Builder/legal gates before any prod write. |
| **What** | Controlled production launch: legal compliance pack, Builder production verify, web/backend canary, Android staged rollout, on-call activation, launch metrics, rollback rehearsal, evidence archive, post-launch smoke. |
| **When** | Only after PHASE-6 exit. Ordering: legal → Builder verify → canary (1→5→25→100%) → Android staged % → smoke/archive. No silent jurisdiction expansion. |
| **Where** | `infra/production/`, deploy configs, Play tracks, monitoring/canary dashboards, pinned prod OpenAPI. Real user txs only with disclosed fees and cleared gates. |
| **Why** | Launch without legal/Builder/rollback readiness creates regulatory, fee, and incident exposure. Fake “staging-live success” without registry/on-chain proof is forbidden by project norms. |
| **How** | Follow the numbered procedure below; stay inside owned paths; file evidence; never mark the phase done without the exit-gate checklist. |

### In scope (agent boundary for this phase)

- `MKT-P7-001`…`MKT-P7-010` legal through exit gate
- Canary + Android staged rollout machinery; on-call; launch metrics; rollback rehearsal; evidence archive; smoke

### Out of scope (do not implement under this phase authorization)

- Post-V1 feature build-out; combos without capability gate; new jurisdictions without legal
- PRISM/legacy; custom exchange; auto-merge/deploy/push without explicit human approval

### Exit gate — what “done” means for an agent

A single task is done only with verification evidence + handoff. The **phase** is done only when **all** of the following hold (orchestrator records manifest advance):

- Legal/store approved; canary healthy; rollback proven; evidence archived; smoke green
- Human gates cleared in blockers log (Play prod, Builder creds, legal)
- REQ MKT-OPS-002/003 evidenced; handoff to PHASE-8 only after V1 launch exit — still subject to 30d SLO prerequisite before post-V1 work

Until those are true, keep task statuses honest (`planned` / `ready` / `in_progress` / `blocked`). Do not advance dependents early.

### How (execution procedure)

1. Scan BLK-003/020/021 and approval gates; stop if open
2. Prepare canary and smoke commands; pin prod OpenAPI
3. Execute only authorized deploy steps; capture real CI/canary links
4. Rehearse rollback (kill switches + image revert + halt Play rollout)
5. Archive evidence; never fabricate Alfajores/mainnet/Play success

### Worked example

Agent working `MKT-P7-003` drafts canary checklist and wiring but finds BLK-003 Builder prod credentials still open: task set `blocked`, handoff cites unblock criteria, no verification evidence claims prod canary passed.

After credentials clear, canary proceeds with auto-rollback criteria documented from PHASE-6 drills.


## Phase ID and exact name

- **Phase ID:** `PHASE-7`
- **Exact name:** Production Launch

## Business outcome

Controlled web/backend prod launch and staged Android release.

## Technical outcome

Legal/store approved; canary OK; rollback ready; evidence archived.

## Prerequisites

PHASE-6 exit.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../agent-harness/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: PHASE-6 complete.
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- Legal pack
- Builder verify
- Canary deploy
- Android rollout
- On-call
- Launch metrics
- Rollback rehearsal
- Evidence archive
- Smoke

## Out of scope

- Post-V1 features
- Combos without gate
- New jurisdictions
- PRISM and legacy epoch APIs
- Custom exchange (ADR-001)

## Repository areas affected

- infra/production/
- deploy configs
- play/

## New modules/files expected

- Launch checklist artifacts

## Data migrations

Prod migrations expand/contract with approval.
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

- Prod OpenAPI pinned
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- Builder prod
- Play prod
- Monitoring

## On-chain interactions

- Real user txs with disclosed fees
RetroPick never holds user private keys.

## Security controls

- Prod geoblock
- Relayer budgets
- Incident comms

## Observability

- Launch dashboards
- canary views

## Test plan

- Prod smoke CI
- release matrix
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- Canary 1→5→25→100%
- Android staged %

## Deployment sequence

- Production canary promotion

## Rollback sequence

- Kill switches
- revert images
- halt rollout

## Risks and mitigations

- **Risk:** Canary regression — **Mitigation:** Auto-rollback
- **Risk:** Store rejection — **Mitigation:** Hotfix ready

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

- Play production
- Builder prod creds
- Legal sign-off
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P7-001 | Legal compliance pack | Deliver legal compliance pack | MKT-P7-002 |
| MKT-P7-002 | Builder production verify | Deliver builder production verify | MKT-P7-003 |
| MKT-P7-003 | Canary deploy | Deliver canary deploy | MKT-P7-004 |
| MKT-P7-004 | Android staged rollout | Deliver android staged rollout | MKT-P7-005 |
| MKT-P7-005 | On-call activation | Deliver on-call activation | MKT-P7-006 |
| MKT-P7-006 | Launch metrics | Deliver launch metrics | MKT-P7-007 |
| MKT-P7-007 | Rollback rehearsal | Deliver rollback rehearsal | MKT-P7-008 |
| MKT-P7-008 | Launch evidence archive | Deliver launch evidence archive | MKT-P7-009 |
| MKT-P7-009 | Post-launch smoke | Deliver post-launch smoke | MKT-P7-010 |
| MKT-P7-010 | PHASE-7 exit gate | Deliver phase-7 exit gate | MKT-P8-001 |

### MKT-P7-001 — Legal compliance pack

**Goal:** Implement Legal compliance pack within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-002 — Builder production verify

**Goal:** Implement Builder production verify within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-003 — Canary deploy

**Goal:** Implement Canary deploy within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-004 — Android staged rollout

**Goal:** Implement Android staged rollout within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-005 — On-call activation

**Goal:** Implement On-call activation within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-006 — Launch metrics

**Goal:** Implement Launch metrics within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-007 — Rollback rehearsal

**Goal:** Implement Rollback rehearsal within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-008 — Launch evidence archive

**Goal:** Implement Launch evidence archive within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-009 — Post-launch smoke

**Goal:** Implement Post-launch smoke within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P7-010 — PHASE-7 exit gate

**Goal:** Implement PHASE-7 exit gate within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

Legal before prod; Builder before canary.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-7 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-OPS-002 | Launch checklist | Phase tests |
| MKT-OPS-003 | Canary rollback | Phase tests |

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

Begin `PHASE-8` when all PHASE-7 tasks done, evidence archived, manifest updated.

First task: `MKT-P8-001`.

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
| Phase | PHASE-7 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-7 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-7 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-7 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-7 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-7 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-7 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-7 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
