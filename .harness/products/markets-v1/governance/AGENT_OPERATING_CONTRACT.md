# Agent Operating Contract — RetroPick Markets V1

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Wave:** 9 harness complete
**Source:** Master prompt §17.1

## Description

This is the mandatory pre-flight and execution contract for RetroPick Markets V1 agents. Read it before selecting a task or editing product code. It binds reading order, scope discipline, evidence honesty, human stop conditions, implementation ordering, verification, handoff, R0–R3 repo boundaries, and §23 invariant themes.

Executable product work is sequenced by live `current_phase` in `implementation-manifest.yaml` — **always read the file**; do not assume a phase from stale prose in this contract.

Execute: checklist → one ready task → `owned_paths` only → smallest coherent change → run commands → evidence + decision log + handoff → invariant greps at exits. Production wallets, Builder prod creds, real txs, Play prod, and similar §18 gates escalate via blockers — never improvise clearance.

## 0. Developer intent (5W+1H)

Mandatory pre-flight and execution contract for RetroPick Markets V1 agents. Read this before selecting a task or editing product code. Wave 9 harness completion is recorded in harness metadata; executable product work is sequenced by `current_phase` in `implementation-manifest.yaml` — read the live value from that file.

| Dimension | Intent |
|-----------|--------|
Current Markets V1 authority: `.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md`.
| **What** | Binding rules: before-you-act reading order, scope discipline, evidence/honesty, human stop conditions, implementation ordering, verification, handoff, R0–R3 repo boundaries, and §23 invariant themes. |
| **When** | Before any Markets product or harness execution change; when resuming after `blocked`; at every task handoff; before phase exit invariant re-check. |
| **Where** | This contract plus `implementation-manifest.yaml`, `task-graph.yaml`, phase specs under `../phases/`, `INVARIANT_CHECK.md`, root `AGENTS.md`, `docs/ARCHITECTURE.md`, `.dev/MARKETS.md`. |
| **Why** | Without a shared contract, agents invent addresses/test greens, edit PRISM/legacy, collide on paths, or jump phases (wallet/trading before read foundation). |
| **How** | Execute §2 checklist → one ready task → `owned_paths` only → smallest coherent change → run commands → evidence + decision log + handoff → invariant greps at exits. |

### In scope under this contract

- Authorized phase/task only; Markets greenfield under `apps/backend/internal/markets/`.
- Web markets product routes; OpenAPI `schemas/openapi/markets-v1.yaml` as shared web+Android contract.
- Harness doc updates when the task owns those paths.
- Contract-first ordering: schemas → clients; migrations → dependent code; read → write; preview → sign.

### Out of scope / stop conditions

Current Markets V1 authority: `.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md`.
- Editing the master prompt plan file; cross-phase “while you’re here” work.
- Production wallets, Builder prod creds, real txs, Play prod, destructive migrations, new jurisdictions, custom contract deploy — escalate via `BLOCKERS_AND_HUMAN_APPROVALS.md` (see also §5 below).

### What “done” means

Verification evidence + handoff filed; `owned_paths` match the diff; no new §23 contradictions; task `done` only with proof. Blocked work stays `blocked` with criteria — never marked complete. Phase advance is orchestrator-only after a filled phase gate.

### Worked example

Agent reads the manifest (e.g. `current_phase: PHASE-2`), selects an authorized ready task, confirms no path conflict with parallel tasks, implements within `owned_paths`, runs verification commands, fills evidence and handoff, and refuses cross-phase work in the same session.


## 1. Purpose

Bind all implementation agents to safe, evidence-based execution of Markets V1 work within authorized phases and tasks. This contract is mandatory before any product-code change.

## 2. Before you act

1. Read [README.md](../README.md) and [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
2. Read this contract and [INVARIANT_CHECK.md](INVARIANT_CHECK.md) (28 §23 invariants).
3. Read [implementation-manifest.yaml](implementation-manifest.yaml) — note live `current_phase` from the file.
4. Select exactly one task from [task-graph.yaml](task-graph.yaml) in `planned` or `ready` status.
5. Confirm requirement mapping in [REQUIREMENTS_TO_TASK_TRACEABILITY.md](REQUIREMENTS_TO_TASK_TRACEABILITY.md).
6. Read the task's phase spec under [phases/](../phases/), relevant ADRs, and owned `.dev/markets-v1/` docs.
7. Read repository instructions: root `AGENTS.md`, `docs/ARCHITECTURE.md`, `.dev/MARKETS.md`.
8. Verify worktree state; **preserve unrelated user changes**.

## 3. Scope discipline

- Remain within the authorized **phase** and **task** only.
- Do not start cross-phase work "while you're here."
- One owner per writable path in parallel work (see task `owned_paths` and manifest `parallelization_rules`).
Current Markets V1 authority: `.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md`.
- Do not edit the master prompt plan file.

## 4. Evidence and honesty

- **Never** invent external contract addresses, API versions, secrets, or successful test results.
- **Never** mark blocked work complete.
- Cite retrieval date and confidence for time-sensitive upstream claims.
- Use fixed-point / base-unit examples for money; no binary floating point in specs (§23 #13).

## 5. Stop conditions (escalate to human)

Stop and document in [BLOCKERS_AND_HUMAN_APPROVALS.md](BLOCKERS_AND_HUMAN_APPROVALS.md) when:

- missing authority for custody, signing, or production writes;
- ambiguous signer vs account-wallet semantics (§23 #8);
- destructive migration without approved rollback;
- production wallet, Builder credentials, or real transaction required;
- new jurisdiction enablement (§23 #16, #21);
- custom smart contract deployment;
- Google Play production release;
- high/critical security finding without acceptance;
- any §23 invariant would be violated by proceeding.

## 6. Implementation rules

- Make the **smallest coherent change** that satisfies the task.
- Backend contract (`schemas/openapi/markets-v1.yaml`) precedes web/Android integration.
- Schemas precede generated clients; migrations precede code that needs them.
- Read-only catalog (PHASE-1) precedes trading (PHASE-3); preview precedes signing/submission.
- Update tests and owned `.dev/markets-v1/` docs with code changes.
- Link `owned_paths` in task-graph to actual files touched.

## 7. Verification

- Run commands listed in the task `commands` array.
- Capture evidence using [VERIFICATION_EVIDENCE_TEMPLATE.md](VERIFICATION_EVIDENCE_TEMPLATE.md).
- Record decisions in [DECISION_AND_ASSUMPTION_LOG.md](DECISION_AND_ASSUMPTION_LOG.md).
- Re-run [INVARIANT_CHECK.md](INVARIANT_CHECK.md) grep commands before phase exit.

## 8. Handoff

- Complete [AGENT_HANDOFF_TEMPLATE.md](AGENT_HANDOFF_TEMPLATE.md) at task end.
- Set task status to `done` only with verification evidence attached.
- List follow-ups and blockers explicitly.
- Update [REQUIREMENTS_TO_TASK_TRACEABILITY.md](REQUIREMENTS_TO_TASK_TRACEABILITY.md) if REQ mappings change.

## 9. Repository boundaries (R0–R3)

| Area | Path | Rule |
|------|------|------|
| Markets BFF | `apps/backend/internal/markets/` | Greenfield Markets work |
Current Markets V1 authority: `.harness/products/markets-v1/governance/AGENT_OPERATING_CONTRACT.md`.
| Web shell | `apps/web/` | Product routes under `src/products/markets` |
| Android | `apps/android/` | README-only at Wave 9; Compose implementation in PHASE-5 |
| OpenAPI | `schemas/openapi/markets-v1.yaml` | Canonical web+Android contract |
| Harness docs | `.harness/products/markets-v1/` | Update with harness changes only |
| PRISM | `contracts/prism/` | Out of scope |

## 10. Cross-document invariants (§23)

All 28 invariants are enumerated in [INVARIANT_CHECK.md](INVARIANT_CHECK.md). Agents MUST preserve:

| Theme | Key rule |
|-------|----------|
| Venue | Polymarket is authority; no custom exchange (ADR-001) |
| Custody | No raw key custody; preview-before-sign (ADR-003) |
| Clients | Android Kotlin+Compose; shared OpenAPI (ADR-004, ADR-006) |
| Eligibility | Fail closed; no VPN bypass |
| Intelligence | Deterministic, evidence-linked; no auto copy trading (ADR-009) |
| Data | Backend projections ≠ ownership; fixed-point money |

## 11. Acceptance

- Every completed task has verification evidence and handoff.
- No §23 invariant contradictions introduced.
- Task-graph `owned_paths` match actual diff.
