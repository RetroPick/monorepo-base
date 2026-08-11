# Task Spec Template

## Description

This blank template authors a single completable Markets V1 task spec (copy into a task note, PR body, or harness appendix). **Authoritative** Task IDs, statuses, `owned_paths`, and `commands` remain in `task-graph.yaml` — this template must not invent IDs that are not in the graph.

Fill identity (Task ID, Phase, Owner), Goal, read-only Inputs, writable Owned paths, Deliverables, Commands, Acceptance criteria, Rollback, and Handoff notes with concrete, falsifiable content. Underspecified tasks cause path collisions, missing verification, and cross-phase creep.

Use when promoting or splitting a task, or when the graph entry is too thin for safe execution. After filling, execute only that task and attach `VERIFICATION_EVIDENCE` for the Commands rows before status `done`.

## 0. Developer intent (5W+1H)

Blank template for authoring a single completable Markets V1 task spec. Copy it into a task note, PR body, or harness appendix. **Authoritative** Task IDs, statuses, `owned_paths`, and `commands` remain in `task-graph.yaml` — this template must not invent IDs that are not in the graph.

| Dimension | Intent |
|-----------|--------|
| **Who** | Orchestrator or owning agent refining a task to `ready`; reviewers checking that a task is small enough to complete safely. |
| **What** | Identity (Task ID, Phase, Owner), Goal paragraph, read-only Inputs, writable Owned paths, Deliverables, Commands, Acceptance criteria, Rollback, Handoff notes. |
| **When** | When promoting or splitting a task; before execution if the graph entry is too thin; when handoff shows the next task needs a clearer spec. |
| **Where** | Working copy beside the task; keep `task-graph.yaml` as source of truth for IDs/paths/commands. Align phase with `phases/PHASE-*.md`. |
| **Why** | Underspecified tasks cause path collisions (§17.3), missing verification, and cross-phase creep (e.g. wallet work inside a catalog task). |
| **How** | Fill every section with concrete, falsifiable content; Commands must be runnable; Owned paths exclusive; Acceptance maps to REQ IDs where possible. |

### How to fill each section

1. **Task ID / Phase** — Copy exact values from `task-graph.yaml` (example shape `MKT-P1-003` / `PHASE-1`).
2. **Owner agent** — Harness slug (`be-api`, `be-data`, `fe-markets`, `fe-wallet`, `qa-integration`, …).
3. **Goal** — One paragraph: smallest coherent unit that can be verified alone.
4. **Inputs (read-only)** — ADRs, OpenAPI path, upstream/phase docs the agent may read but not own.
5. **Owned paths (writable)** — Exclusive globs; no overlap with other `in_progress` tasks.
6. **Deliverables** — Files/behaviors that will exist when done.
7. **Commands** — Exact verification commands (mirror graph `commands` array).
8. **Acceptance criteria** — Numbered, testable; link REQ IDs from traceability when applicable.
9. **Rollback** — How to undo schema/flag/code safely.
10. **Handoff notes** — Next task ID and any blockers.

### Worked example (filled mini)

| Field | Value |
|-------|-------|
| Task ID | `MKT-P1-003` |
| Phase | `PHASE-1` |
| Owner agent | `be-data` |
| Goal | Add expand-only catalog migrations (`markets_catalog_events`, sync checkpoints) aligned with OpenAPI event IDs — no trading/funding tables. |
| Inputs | ADR-002; `schemas/openapi/markets-v1.yaml`; `PHASE-1-FOUNDATION-AND-READ-MARKETS.md` |
| Owned paths | `apps/backend/migrations/*catalog*` (as declared in task-graph) |
| Deliverables | Migration files; notes for sqlc consumers |
| Commands | Staging migrate up; `go test ./internal/markets/...` (per task-graph) |
| Acceptance | Migrations apply cleanly; no binary-float money columns; contract tests still pass |
| Rollback | Migrate down one step; disable catalog ingest flag |
| Handoff notes | `MKT-P1-004` may build web read routes against this schema |

After filling, execute only this task; attach `VERIFICATION_EVIDENCE` results for the Commands rows before status `done`.


## Identity

| Field | Value |
|-------|-------|
| Task ID | MKT-PN-NNN |
| Phase | PHASE-N |
| Owner agent | |

## Goal

One paragraph describing the smallest completable unit of work.

## Inputs (read-only)

- ADRs:
- OpenAPI:
- Upstream docs:

## Owned paths (writable)

-

## Deliverables

-

## Commands

```bash
# verification commands
```

## Acceptance criteria

1.

## Rollback

## Handoff notes
