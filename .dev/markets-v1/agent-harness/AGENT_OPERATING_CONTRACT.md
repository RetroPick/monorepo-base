# Agent Operating Contract — RetroPick Markets V1

**Status:** active
**Owner:** platform-orchestrator
**Last updated:** 2026-07-24
**Source:** Master prompt §17.1

## 1. Purpose

Bind all implementation agents to safe, evidence-based execution of Markets V1 work
within authorized phases and tasks.

## 2. Before you act

1. Read [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md) and this contract.
2. Read [implementation-manifest.yaml](implementation-manifest.yaml) — note `current_phase`.
3. Select exactly one task from [task-graph.yaml](task-graph.yaml) in `planned` or `ready` status.
4. Read the task's phase spec under [phases/](../phases/), relevant ADRs, and [REQUIREMENTS_TO_TASK_TRACEABILITY.md](REQUIREMENTS_TO_TASK_TRACEABILITY.md).
5. Read repository instructions: root `AGENTS.md`, `docs/ARCHITECTURE.md`, `.dev/MARKETS.md`.
6. Verify worktree state; **preserve unrelated user changes**.

## 3. Scope discipline

- Remain within the authorized **phase** and **task** only.
- Do not start cross-phase work "while you're here."
- One owner per writable path in parallel work (see task `owned_paths`).
- Do not edit PRISM (`contracts/prism/`) or extend legacy epoch (`archived epoch API (see archive/)/*`).

## 4. Evidence and honesty

- **Never** invent external contract addresses, API versions, secrets, or successful test results.
- **Never** mark blocked work complete.
- Cite retrieval date and confidence for time-sensitive upstream claims.
- Use fixed-point / base-unit examples for money; no binary floating point in specs.

## 5. Stop conditions (escalate to human)

Stop and document in [BLOCKERS_AND_HUMAN_APPROVALS.md](BLOCKERS_AND_HUMAN_APPROVALS.md) when:

- missing authority for custody, signing, or production writes;
- ambiguous signer vs account-wallet semantics;
- destructive migration without approved rollback;
- production wallet, Builder credentials, or real transaction required;
- new jurisdiction enablement;
- custom smart contract deployment;
- Google Play production release;
- high/critical security finding without acceptance.

## 6. Implementation rules

- Make the **smallest coherent change** that satisfies the task.
- Backend contract (`schemas/openapi/markets-v1.yaml`) precedes web/Android integration.
- Schemas precede generated clients; migrations precede code that needs them.
- Read-only catalog precedes trading; preview precedes signing/submission.
- Update tests and docs with code changes.

## 7. Verification

- Run commands listed in the task `commands` array.
- Capture evidence using [VERIFICATION_EVIDENCE_TEMPLATE.md](VERIFICATION_EVIDENCE_TEMPLATE.md).
- Record decisions in [DECISION_AND_ASSUMPTION_LOG.md](DECISION_AND_ASSUMPTION_LOG.md).

## 8. Handoff

- Complete [AGENT_HANDOFF_TEMPLATE.md](AGENT_HANDOFF_TEMPLATE.md) at task end.
- Set task status to `done` only with verification evidence attached.
- List follow-ups and blockers explicitly.

## 9. Repository boundaries (R0–R3)

| Area | Path | Rule |
|------|------|------|
| Markets BFF | `apps/backend/internal/markets/` | Greenfield Markets work |
| Legacy epoch | `apps/backend/archive/apps/backend/internal/legacy/domain/` | Quarantine; no new Markets features |
| Web shell | `apps/web/` | Product routes under `src/products/markets` |
| Android | `apps/android/` | README-only at R3; Compose implementation in PHASE-5 |
| OpenAPI | `schemas/openapi/markets-v1.yaml` | Canonical web+Android contract |
| PRISM | placeholder | Out of scope |

## 10. Cross-document invariants (§23)

Agents MUST preserve: Polymarket venue authority; no PRISM positions from Markets;
no raw key custody; fail-closed eligibility; Combos capability-gated; Android Kotlin+Compose;
backend projections are not ownership authority.

## 11. Acceptance

- Every completed task has verification evidence and handoff.
- No §23 invariant contradictions introduced.
