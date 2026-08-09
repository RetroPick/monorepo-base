# Agent Handoff Template

## Description

This is the end-of-task handoff form so the next agent or human can continue without rediscovering intent from a dirty worktree or chat scrollback. The operating contract requires a filled handoff before task status `done` (and when moving to `blocked`).

Capture summary, exact Task ID, path-level Changes, Verification run table, Evidence link, open issues/blockers, and suggested next `MKT-*` task. Facts only — list commands actually executed; cite blocker IDs from `BLOCKERS_AND_HUMAN_APPROVALS.md`; never fabricate passes.

Preserve unrelated user changes in the worktree. Consumers should re-run critical commands if the worktree moved. If verification failed, leave Suggested next task empty and keep status `blocked`/`in_progress`.

## 0. Developer intent (5W+1H)

End-of-task handoff form so the next agent or human can continue without rediscovering intent from a dirty worktree or chat scrollback. Required by `AGENT_OPERATING_CONTRACT` before task status `done` (and when moving to `blocked`).

| Dimension | Intent |
|-----------|--------|
| **Who** | Completing agent (author) → next agent, orchestrator, or human reviewer (consumer). |
| **What** | Summary, Task ID, path-level Changes table, Verification run table, Evidence link, Open issues/blockers, Suggested next task. |
| **When** | Immediately when acceptance is met, or when work must stop on a blocker; before requesting status `done`. |
| **Where** | PR description, harness note, or attached artifact. Must reference a real verification evidence document (filled `VERIFICATION_EVIDENCE_TEMPLATE`). |
| **Why** | Multi-agent, path-exclusive execution fails when handoffs omit commands run, paths touched, or blocker IDs — leading to duplicate writes and invented greens. |
| **How** | Fill every section with facts only; list commands actually executed; cite blocker IDs from `BLOCKERS_AND_HUMAN_APPROVALS.md`; suggest the exact next `MKT-*` task ID (or stop). |

### How to fill

1. **Summary** — 2–4 sentences: goal, outcome, residual risk.
2. **Task ID** — Exact graph ID (`MKT-P1-001`, etc.).
3. **Changes** — One row per path; must match `owned_paths` / actual diff.
4. **Verification run** — Command → Result (Pass/Fail). No fabricated passes.
5. **Evidence** — Link/path to verification artifact (redacted).
6. **Open issues / blockers** — IDs + unblock criteria; empty only if truly none.
7. **Suggested next task** — Next graph ID, or “none — blocked on BLK-…”.

Preserve unrelated user changes in the worktree; note them if they constrained your diff. Remind consumers of frozen legacy routes and OpenAPI contract location if your change touches API surfaces.

### Worked example (filled mini)

| Field | Value |
|-------|-------|
| Summary | Expanded OpenAPI `MarketSummary` to use fixed-point decimal strings for prices; no web UI wiring in this task. |
| Task ID | `MKT-P1-001` |
| Changes | `schemas/openapi/markets-v1.yaml` — money fields as decimal strings; removed float examples |
| Verification | OpenAPI lint → Pass; `rg float64 schemas/openapi/markets-v1.yaml` → no matches |
| Evidence | `artifacts/MKT-P1-001-evidence.md` (example path) |
| Open issues | None for schema; generated web types await `MKT-P1-004` |
| Suggested next task | `MKT-P1-002` Gamma catalog client hardening |

Consumers should re-run critical commands if the worktree moved, not trust the table blindly when commits diverge. If verification failed, leave Suggested next task empty and keep status `blocked`/`in_progress`.


## Summary

## Task ID

## Changes

| Path | Summary |
|------|---------|

## Verification run

| Command | Result |
|---------|--------|

## Evidence

Link to VERIFICATION_EVIDENCE artifact.

## Open issues / blockers

## Suggested next task


## Implementation notes

- Repository paths: `apps/backend/internal/markets/`, `apps/web/`, `apps/android/`.
- Contract: `schemas/openapi/markets-v1.yaml`.
- Legacy frozen: `/api/v1/legacy/markets/*`.
- Phase alignment: see [phases/](../phases/) and [task-graph.yaml](../agent-harness/task-graph.yaml).

## Related documents

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
