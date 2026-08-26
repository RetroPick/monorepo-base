# PHASE-6 — Hardening, CI/CD, and SRE

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1

---

> Per-phase contract per master prompt §16. Phase IDs locked per §15.

## Description

PHASE-6 is the **Harden** delivery band before PHASE-7 Production: production readiness without new product features — security review, load/chaos, CI/CD completion, SLO dashboards, backup/restore drill, kill-switch exercise, SBOM, signal/intel load tests, and incident runbook drills. Feature freeze applies for load tests; security findings block PHASE-7 launch.

Hardening must cover **intel poller load/429**, **paper/backtest abuse limits**, and **kill-switch drills for `intelligence.*` flags** alongside Core trading kill switches. Untested backups, fatiguing alerts, and unproven kill switches turn the first prod incident into prolonged outage or fund risk. Emergency capability flags are in scope; new trading features and the launch itself are not.

Paths include `.github/workflows/`, `platform/`, `security/`, `testing/`, and dashboards/DR runbooks. Exit via `MKT-P6-010` only when restore/rollback drills, kill-switch evidence (Core + intel), and P0/P1 security closure/acceptance are real.

## 0. Developer intent (5W+1H)

Orientation for agents executing **PHASE-6 — Hardening, CI/CD, and SRE**. The document header **Status: reviewed** means this phase *spec* was reviewed for quality — it is **not** a claim that the phase has exited or that all tasks are complete. Live execution state lives only in `implementation-manifest.yaml` (`current_phase`) and per-task statuses in `task-graph.yaml`. Do not invent phase progress from this file.

| Dimension | Intent |
|-----------|--------|
| **Who** | devops-sre, security, qa-integration; on-call designers; humans for residual risk acceptance and destructive migration rehearsal approval. |
| **What** | Harden band: security review, load/chaos (incl. intel poller 429), CI/CD, SLO dashboards, backup/restore, kill-switch exercise (trading + `intelligence.*`), SBOM, paper/backtest abuse limits, incident runbook drills. |
| **When** | After PHASE-4/5 staging complete. Feature freeze for load tests; security findings block PHASE-7 launch. This phase is **not** Production launch (that is PHASE-7). |
| **Where** | `.github/workflows/`, `platform/`, `security/`, `testing/`, dashboards/DR runbooks, emergency capability flags in OpenAPI/capabilities API (Core + `intelligence.*`). Integrations: paging (e.g. PagerDuty) and all prod dependency contracts under test. |
| **Why** | Untested backups, fatiguing alerts, unproven kill switches, and unbounded intel/paper/backtest load turn first prod incident into prolonged outage or fund risk. |
| **How** | Follow the numbered procedure below; stay inside owned paths; file evidence; never mark the phase done without the exit-gate checklist. |

### In scope (agent boundary for this phase)

- `MKT-P6-001`…`MKT-P6-010` security through exit gate
- Signed containers, migration gates, full SLI catalog, synthetics
- Emergency capability flags only — not new trading features
- Intel poller load/429; paper/backtest abuse limits; kill-switch for `intelligence.*` flags

### Out of scope (do not implement under this phase authorization)

- New product features, combos, production canary/launch execution (PHASE-7)
- PRISM/legacy; custom exchange

### Exit gate — what “done” means for an agent

A single task is done only with verification evidence + handoff. The **phase** is done only when **all** of the following hold (orchestrator records manifest advance):

- Reproducible artifacts; restore/rollback drills pass; kill switches exercised with evidence (Core + `intelligence.*`)
- Intel poller 429/stale and paper/backtest abuse limits evidenced under load
- P0/P1 security fixed or explicitly accepted; REQ MKT-NFR-010/070, MKT-OPS-001 evidenced
- `MKT-P6-010` complete before PHASE-7 canary authorization

Until those are true, keep task statuses honest (`planned` / `ready` / `in_progress` / `blocked`). Do not advance dependents early.

### How (execution procedure)

1. Run security review and track findings to closure/acceptance
2. Load/chaos against frozen build; include intel poller 429/backoff; capture SLO dashboards
3. Backup restore drill with measured RPO; document gaps
4. Exercise kill switches end-to-end in staging: e.g. `order_submission` and `intelligence.*` flags
5. SBOM + signal isolation load tests; paper/backtest abuse limits; incident drill with runbooks

### Worked example

Agent on `MKT-P6-006` toggles the trading kill switch, verifies clients fail closed, then toggles an `intelligence.*` flag and confirms intel surfaces degrade without blocking order preview/submit (ADR-008). Captures metrics and runbook steps, then restores flags.

They reject a teammate’s “while we’re in CI” feature PR as out of scope for PHASE-6.

## Production path

This phase **is** the Harden delivery band before PHASE-7 Production. Staging criteria: restore/kill-switch drills; intel 429/stale load; paper/backtest abuse limits; P0/P1 security closed → then Production canary. See [PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md](PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md) §4–§7.


## Phase ID and exact name

- **Phase ID:** `PHASE-6`
- **Exact name:** Hardening, CI/CD, and SRE

## Business outcome

Security, performance, chaos, pipelines, observability, backup, incident readiness — Harden band before Production (PHASE-7).

## Technical outcome

Reproducible artifacts; restore/rollback pass; kill switches exercised (Core + `intelligence.*`); intel poller/paper/backtest abuse limits proven.

## Prerequisites

PHASE-4/5 staging complete.

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [AGENT_OPERATING_CONTRACT.md](../../../.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md)

## Dependencies

- Upstream: PHASE-4 and PHASE-5.
- Polymarket docs per evidence register
- ADRs and OpenAPI baseline

## In scope

- Security review
- Load/chaos (incl. intel poller load/429)
- CI/CD
- SLO dashboards
- Backup drill
- Kill switches (trading + `intelligence.*` flags)
- Paper/backtest abuse limits
- SBOM
- Signal load
- Runbook drills

## Out of scope

- New features
- Combos
- Launch itself (PHASE-7 Production)
- Custom exchange (ADR-001)

## Repository areas affected

- .github/workflows/
- platform/
- security/
- testing/

## New modules/files expected

- CI implementation
- dashboards
- DR runbooks

## Data migrations

Destructive migrations need approval.
Expand→migrate→contract; destructive changes need §18 approval.

## API/schema changes

- Emergency capability flags
Source: `schemas/openapi/markets-v1.yaml`.

## External integrations

- PagerDuty
- all prod deps

## On-chain interactions

None new on-chain.
RetroPick never holds user private keys.

## Security controls

- Pen test fixes
- Secret rotation
- Rate limits

## Observability

- Full SLI catalog
- synthetics

## Test plan

- Full PR gates
- nightly E2E
- load test
- SBOM
- Unit, contract, integration, E2E per MASTER_TEST_PLAN.md
- Evidence per VERIFICATION_EVIDENCE_TEMPLATE.md

## CI/CD changes

- Signed containers
- migration gate

## Deployment sequence

- Promote hardened artifacts to staging

## Rollback sequence

- Web/backend/android rollback
- DB restore

## Risks and mitigations

- **Risk:** Alert fatigue — **Mitigation:** SLO paging
- **Risk:** Backup untested — **Mitigation:** Quarterly drill

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

- Accept security risk
- Destructive migration rehearsal
See BLOCKERS_AND_HUMAN_APPROVALS.md.

## Task breakdown

| Task ID | Title | Goal | Handoff |
|---|---|---|---|
| MKT-P6-001 | Security review | Deliver security review | MKT-P6-002 |
| MKT-P6-002 | Load and chaos tests | Deliver load and chaos tests | MKT-P6-003 |
| MKT-P6-003 | CI/CD completion | Deliver ci/cd completion | MKT-P6-004 |
| MKT-P6-004 | SLO dashboards | Deliver slo dashboards | MKT-P6-005 |
| MKT-P6-005 | Backup restore drill | Deliver backup restore drill | MKT-P6-006 |
| MKT-P6-006 | Kill switch exercise | Trading + `intelligence.*` kill switches | MKT-P6-007 |
| MKT-P6-007 | SBOM supply chain | Deliver sbom supply chain | MKT-P6-008 |
| MKT-P6-008 | Signal load tests | Intel poller 429 + paper/backtest abuse limits | MKT-P6-009 |
| MKT-P6-009 | Incident runbook drill | Deliver incident runbook drill | MKT-P6-010 |
| MKT-P6-010 | PHASE-6 exit gate | Deliver phase-6 exit gate | MKT-P7-001 |

### MKT-P6-001 — Security review

**Goal:** Implement Security review within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-002 — Load and chaos tests

**Goal:** Implement Load and chaos tests within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-003 — CI/CD completion

**Goal:** Implement CI/CD completion within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-004 — SLO dashboards

**Goal:** Implement SLO dashboards within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-005 — Backup restore drill

**Goal:** Implement Backup restore drill within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-006 — Kill switch exercise

**Goal:** Exercise kill switches for Core trading **and** `intelligence.*` flags; clients fail closed / degrade intel without blocking settlement.

**Acceptance:** Tests pass; no path conflicts; evidence filed for both Core and intel flag paths.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-007 — SBOM supply chain

**Goal:** Implement SBOM supply chain within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-008 — Signal load tests

**Goal:** Signal/intel load tests including poller 429/backoff and paper/backtest abuse limits; intelligence failures isolated from trading (ADR-008).

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-009 — Incident runbook drill

**Goal:** Implement Incident runbook drill within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

### MKT-P6-010 — PHASE-6 exit gate

**Goal:** Implement PHASE-6 exit gate within owned_paths in task-graph.yaml.

**Acceptance:** Tests pass; no path conflicts; evidence filed.

**Commands:** See task-graph.yaml `commands` array.

**Owned paths:** Exclusive during execution per §17.3.

## Parallelization constraints

Security blocks launch; load after freeze.

§17.3: one owner per path; schemas→clients; migrations→code; read→write; preview→sign.

## Definition of ready

- Prior exit gate signed
- Tasks in task-graph with owned_paths
- ADRs accepted
- No phase blockers
- Fixtures available
- Approvals filed
## Acceptance criteria

- PHASE-6 §15 exit gate met
- Final task verification complete

| REQ ID | Description | Verify |
|---|---|---|
| MKT-NFR-010 | 99.5% uptime | Phase tests |
| MKT-NFR-070 | Backup RPO<24h | Phase tests |
| MKT-OPS-001 | Incident runbooks | Phase tests |

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

Begin `PHASE-7` when all PHASE-6 tasks done, evidence archived, manifest updated.

First task: `MKT-P7-001`.

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
| Phase | PHASE-6 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order preview

| Attribute | Value |
|---|---|
| Phase | PHASE-6 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Order submit

| Attribute | Value |
|---|---|
| Phase | PHASE-6 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Position reconcile

| Attribute | Value |
|---|---|
| Phase | PHASE-6 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### CTF relay

| Attribute | Value |
|---|---|
| Phase | PHASE-6 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Push notify

| Attribute | Value |
|---|---|
| Phase | PHASE-6 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Eligibility

| Attribute | Value |
|---|---|
| Phase | PHASE-6 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

### Signal compute

| Attribute | Value |
|---|---|
| Phase | PHASE-6 |
| Kill switch | capabilities API |
| Runbook | PRODUCTION_OPERATIONS_RUNBOOK.md |

## Agent execution notes

- Read AGENT_OPERATING_CONTRACT before tasks.
- Stay in authorized phase/task.
- Never invent secrets, addresses, or test results.
- File verification evidence before completion.
