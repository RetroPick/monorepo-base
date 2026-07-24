# Architecture Decision Records

| ADR | Document |
|-----|----------|
| ADR-001 | [ADR-001-MARKETS-HAS-NO-CUSTOM-EXCHANGE.md](ADR-001-MARKETS-HAS-NO-CUSTOM-EXCHANGE.md) |
| ADR-002 | [ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md](ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md) |
| ADR-003 | [ADR-003-WALLET-AND-SIGNING-MODEL.md](ADR-003-WALLET-AND-SIGNING-MODEL.md) |
| ADR-004 | [ADR-004-SHARED-WEB-ANDROID-API.md](ADR-004-SHARED-WEB-ANDROID-API.md) |
| ADR-005 | [ADR-005-REALTIME-AND-RECONCILIATION.md](ADR-005-REALTIME-AND-RECONCILIATION.md) |
| ADR-006 | [ADR-006-ANDROID-JETPACK-COMPOSE.md](ADR-006-ANDROID-JETPACK-COMPOSE.md) |
| ADR-007 | [ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md](ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md) |
| ADR-008 | [ADR-008-SHARED-SIGNAL-ENGINE.md](ADR-008-SHARED-SIGNAL-ENGINE.md) |
| ADR-009 | [ADR-009-NO-AUTO-COPY-TRADING-V1.md](ADR-009-NO-AUTO-COPY-TRADING-V1.md) |


## Implementation notes

- Repository paths: `apps/backend/internal/markets/`, `apps/web/`, `apps/android/`.
- Contract: `schemas/openapi/markets-v1.yaml`.
- Legacy frozen: `/api/v1/legacy/markets/*`.
- Phase alignment: see [phases/](../phases/) and [task-graph.yaml](../agent-harness/task-graph.yaml).

## Related documents

- [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md)
- [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md)
