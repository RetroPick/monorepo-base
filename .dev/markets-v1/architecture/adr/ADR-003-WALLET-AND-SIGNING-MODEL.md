# ADR-003: Wallet and Signing Model

**Status:** accepted
**Date:** 2026-07-24
**Deciders:** platform-orchestrator, markets-engineering

## Context

Custody constraints.

## Decision

User signs; backend never silent-signs orders.

## Consequences

See linked architecture and phase docs.

## Compliance with §23 invariants

This ADR is referenced across PRD, backend, web, Android, and security docs. Any change requires updating [agent-harness/DECISION_AND_ASSUMPTION_LOG.md](../../agent-harness/DECISION_AND_ASSUMPTION_LOG.md).

## Links

- [TARGET_MONOREPO_ARCHITECTURE.md](../TARGET_MONOREPO_ARCHITECTURE.md)
- [REQUIREMENTS_TO_TASK_TRACEABILITY.md](../../agent-harness/REQUIREMENTS_TO_TASK_TRACEABILITY.md)

## Review checklist

- [ ] Consistent with master prompt §23 invariants
- [ ] Referenced from phase specs and traceability matrix
- [ ] No contradiction with OpenAPI `schemas/openapi/markets-v1.yaml` or legacy `/api/v1/legacy/markets/*`


## Implementation notes

- Repository paths: `apps/backend/internal/markets/`, `apps/web/`, `apps/android/`.
- Contract: `schemas/openapi/markets-v1.yaml`.
- Legacy frozen: `/api/v1/legacy/markets/*`.
- Phase alignment: see [phases/](../phases/) and [task-graph.yaml](../agent-harness/task-graph.yaml).

## Related documents

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
