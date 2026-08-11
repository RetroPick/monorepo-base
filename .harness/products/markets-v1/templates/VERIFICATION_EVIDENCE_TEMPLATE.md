# Verification Evidence Template

## Description

This is the proof artifact template for Markets V1 task completion. Without a filled copy (or equivalent structured evidence), agents must **not** mark tasks `done`. It enforces the operating-contract honesty rule: never invent successful tests, contract addresses, or deploy outcomes.

Capture Task ID, date/agent, environment (branch/commit), commands executed, pass/fail results, redacted logs/screenshots, requirement traceability, and sign-off checkboxes. Never commit secrets, private keys, mnemonics, or raw prod credentials.

Failed commands mean the task is not done (or is `blocked` with evidence of the failure). Prefer CI deep-links when available; local runs must still show the commit SHA. Phase gates and invariant checks are meaningless without auditable output tied to a commit.

## 0. Developer intent (5W+1H)

Proof artifact template for Markets V1 task completion. Without a filled copy (or equivalent structured evidence), agents must **not** mark tasks `done`. This enforces the operating-contract honesty rule: never invent successful tests, contract addresses, or deploy outcomes.

| Dimension | Intent |
|-----------|--------|
| **Who** | Implementing agent captures results; reviewer/orchestrator audits; QA may append rows for contract/E2E. |
| **What** | Task ID, date/agent, environment (branch/commit), commands executed, pass/fail results table, redacted logs/screenshots, requirement traceability, sign-off checkboxes. |
| **When** | While/after running the task `commands` array; before handoff; before aggregating evidence into a phase exit gate. |
| **Where** | Beside the PR or under an agreed evidence path. **Never** commit secrets, private keys, mnemonics, or raw prod credentials — redact first. |
| **Why** | Phase gates, traceability, and invariant checks are meaningless without auditable command output tied to a commit SHA. |
| **How** | Copy template → fill identity/env → paste exact commands → record Pass/Fail → map REQ IDs → tick sign-off only when true. |

### How to fill

1. **Task ID** — Exact `MKT-*` from task-graph.
2. **Date / agent** — Date + harness slug.
3. **Environment** — Branch name + commit SHA (non-secret metadata only).
4. **Commands executed** — Full commands from the task spec / graph (include invariant greps when the task touches boundaries).
5. **Results** — Table rows: check name, Pass/Fail, short notes (include failure excerpts if Fail).
6. **Screenshots / logs** — Redact tokens, cookies, wallet secrets, API keys.
7. **Traceability** — Requirement ID → test name → result (from `REQUIREMENTS_TO_TASK_TRACEABILITY.md`).
8. **Sign-off** — Acceptance criteria met; no secrets in artifact. Leave unchecked if blocked.

Failed commands mean the task is not done (or is `blocked` with evidence of the failure). Do not weaken tests solely to force a green row. Prefer CI deep-links when available; local runs must still show the commit SHA.

### Worked example (filled mini)

| Field | Value |
|-------|-------|
| Task ID | `MKT-P1-008` |
| Date / agent | 2026-07-25 / `qa-integration` |
| Environment | Branch `markets-p1-contracts`; commit `abc1234` *(placeholder — replace with real SHA)* |
| Commands | `go test ./internal/markets/... -count=1`; OpenAPI contract suite per task-graph |
| Results | Handler contract → Pass; order-book staleness case → Pass |
| Traceability | `MKT-FR-010` → `OrderBookStale` contract test → Pass |
| Sign-off | Acceptance met ☑; No secrets in artifact ☑ |

Replace every placeholder with output from your machine/CI. Copying this mini-example unchanged as “proof” violates the honesty rule and will fail phase-gate review.


## Task ID

## Date / agent

## Environment

- Branch:
- Commit:

## Commands executed

```bash
```

## Results

| Check | Pass/Fail | Notes |
|-------|-----------|-------|

## Screenshots / logs (redacted)

## Traceability

| Requirement | Test | Result |
|-------------|------|--------|

## Sign-off

- [ ] Acceptance criteria met
- [ ] No secrets in artifact


## Implementation notes

- Repository paths: `apps/backend/internal/markets/`, `apps/web/`, `apps/android/`.
- Contract: `schemas/openapi/markets-v1.yaml`.
- Legacy frozen: `/api/v1/legacy/markets/*`.
- Phase alignment: see [phases/](../phases/) and [task-graph.yaml](../../../../.harness/products/markets-v1/planning/task-graph.yaml).

## Related documents

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
