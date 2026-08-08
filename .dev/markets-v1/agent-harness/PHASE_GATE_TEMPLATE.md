# Phase Gate Template

**Task:** Copy per phase exit review.

## Phase metadata

| Field | Value |
|-------|-------|
| Phase ID | PHASE-N |
| Reviewer | |
| Date | |

## Entry criteria

- [ ] Prior phase exit gate approved
- [ ] No open blockers for this phase

## Deliverables checklist

- [ ] All phase tasks `done` with evidence
- [ ] Docs updated
- [ ] Tests passing

## Exit criteria

- [ ] Acceptance criteria from phase spec met
- [ ] Rollback path documented and tested
- [ ] Human approvals captured (if required)

## Evidence links

- Verification:
- Traceability:

## Decision

- [ ] APPROVED — advance `current_phase`
- [ ] REJECTED — list remediations


## Implementation notes

- Repository paths: `apps/backend/internal/markets/`, `apps/web/`, `apps/android/`.
- Contract: `schemas/openapi/markets-v1.yaml`.
- Legacy frozen: `/api/v1/legacy/markets/*`.
- Phase alignment: see [phases/](../phases/) and [task-graph.yaml](../agent-harness/task-graph.yaml).

## Related documents

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
