# Phase Gate Template

**Task:** Copy per phase exit review.

## Description

This is the copy-per-phase **exit review** form. Use a filled copy to approve or reject advancing `current_phase`. The template does not itself mutate the manifest — the orchestrator updates `current_phase` only on APPROVED — and it does not replace the phase spec’s Definition of done.

Fill phase metadata, entry criteria, deliverables checklist, exit criteria, evidence links (verification + traceability + invariant re-run), and an honest APPROVED/REJECTED decision. “Docs look finished” is not an exit.

Use at `MKT-P0-008` or `MKT-P*-010` after other phase tasks claim `done` with evidence. REJECTED lists remediations and keeps the phase; never invent approval to unblock dependents.

## 0. Developer intent (5W+1H)

Copy-per-phase **exit review** form. Use a filled copy to approve or reject advancing `current_phase`. This template does not itself mutate the manifest — the orchestrator updates `current_phase` only on APPROVED — and it does not replace the phase spec’s Definition of done or acceptance tables.

| Dimension | Intent |
|-----------|--------|
| **Who** | Phase reviewer / platform-orchestrator decides; implementing agents prepare evidence links and checklists but do not self-approve exits. |
| **What** | Phase metadata, entry criteria, deliverables checklist, exit criteria, evidence links (verification + traceability), and APPROVED/REJECTED decision. |
| **When** | At the phase exit-gate task (`MKT-P0-008` or `MKT-P*-010`), after all other phase tasks claim `done` with evidence. |
| **Where** | Filled artifact stored with the verification archive; template in `.harness/products/markets-v1/templates/`; live `current_phase` only in `implementation-manifest.yaml`. |
| **Why** | “Docs look finished” is not an exit. Gates catch missing tests, untested rollback, open blockers, skipped human approvals, and skipped invariant re-checks. |
| **How** | Copy template → fill metadata → tick entry/deliverables/exit honestly → paste evidence URLs → APPROVED (orchestrator advances manifest) or REJECTED (list remediations, keep phase). |

### How to fill

1. **Phase metadata** — Exact `PHASE-N`, reviewer identity, calendar date.
2. **Entry criteria** — Prior phase exit approved; no open blockers that block *this* phase’s exit (cite `BLOCKERS_AND_HUMAN_APPROVALS.md` IDs).
3. **Deliverables checklist** — Every phase task `done` with evidence; owned docs updated; tests passing per task `commands`.
4. **Exit criteria** — Phase acceptance criteria met; rollback path documented and tested; required human approvals captured.
5. **Evidence links** — Verification artifacts; updated `REQUIREMENTS_TO_TASK_TRACEABILITY` rows; `INVARIANT_CHECK` re-run notes.
6. **Decision** — APPROVED only when all boxes are truly satisfied; otherwise REJECTED with remediations. Never invent an approval to unblock dependents.

Also confirm Implementation notes paths still apply: Markets code under `apps/backend/internal/markets/`, web/Android clients, contract `schemas/openapi/markets-v1.yaml`, legacy frozen at `/api/v1/legacy/markets/*`.

### Worked example (filled mini)

| Field | Value |
|-------|-------|
| Phase ID | `PHASE-1` |
| Reviewer | platform-orchestrator |
| Date | 2026-07-25 |
| Entry | PHASE-0 exit approved; no blockers preventing read-path exit |
| Deliverables | `MKT-P1-001`…`010` done with CI links; OpenAPI + web build green |
| Exit | Stale book UX explicit; ingest disable + stale banner rollback documented |
| Evidence | VERIFICATION_EVIDENCE for `MKT-P1-010`; FR-001/002/010 rows; invariant greps attached |
| Decision | *Example shape only:* APPROVED — advance `current_phase` to PHASE-2 |

**Do not treat the mini-example as a live gate result.** Always read `implementation-manifest.yaml` for the real `current_phase` and only file APPROVED when evidence exists for *that* phase’s exit task.


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
- Phase alignment: see [phases/](../phases/) and [task-graph.yaml](../../../../.harness/products/markets-v1/planning/task-graph.yaml).

## Related documents

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
