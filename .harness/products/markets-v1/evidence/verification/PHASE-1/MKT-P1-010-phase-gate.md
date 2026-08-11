# Phase Gate — PHASE-1

## Phase metadata

| Field | Value |
|-------|-------|
| Phase ID | PHASE-1 |
| Reviewer | Chat K (exit gate agent) — orchestrator sign-off pending |
| Date | 2026-08-09 |

## Entry criteria

- [x] Prior phase exit gate approved (PHASE-0 complete per manifest)
- [x] No open blockers preventing read-path exit (BLK-006 OpenAPI stubs noted; conformance tests green on implemented read paths)

## Deliverables checklist

- [x] MKT-P1-001…009 implementation verified via automated tests
- [x] MKT-P1-010 evidence archived under `../../../../../../../.harness/products/markets-v1/evidence/verification/PHASE-1/`
- [x] Docs consistent with interim fe-v1 deploy model (doc drift on `marketsRoutes.tsx` flagged)
- [x] Tests passing per task commands (see evidence files)

## Exit criteria

- [x] Web renders canonical market from BFF (fe-v1 interim deploy + web product module tests)
- [x] Stale states explicit in UX/API (FreshnessBadge, backend stale orderbook test)
- [x] OpenAPI conformance tests pass
- [x] Metrics/SLO wiring evidenced (unit tests; live scrape optional)
- [x] Signal envelope reproducible from evidence (engine determinism tests)
- [x] No wallet connect / order submit in PHASE-1 markets feature modules
- [x] INVARIANT greps clean (product code)
- [x] Rollback path documented in PHASE-1 spec (disable ingest, stale banner)
- [x] Human approvals captured — staging deploy notice optional; none required for read-path exit

## Evidence links

- Verification:
  - [MKT-P1-008-evidence.md](./MKT-P1-008-evidence.md)
  - [MKT-P1-009-evidence.md](./MKT-P1-009-evidence.md)
  - [MKT-P1-010-evidence.md](./MKT-P1-010-evidence.md)
  - [MKT-P1-010-invariant-greps.txt](./MKT-P1-010-invariant-greps.txt)
- Traceability: [REQUIREMENTS_TO_TASK_TRACEABILITY.md](../../REQUIREMENTS_TO_TASK_TRACEABILITY.md) FR-001/002/010, NFR-001/060, WEB-001 rows

## Recorded debt (non-blocking)

| Item | Owner | When |
|------|-------|------|
| fe-v1 global `WalletButton` on markets routes | MKT-P2-001 | Quarantine before trading UX |
| `apps/web` shell wiring (`marketsRoutes.tsx`) | PHASE-6 | Next.js migration |
| WS gap conformance | PHASE-6 | Hardening track |
| Android Compose implementation | PHASE-5 | Post web trading |
| Postgres signal integration tests (DATABASE_URL) | CI/staging | Before production signal enablement |
| Live `/metrics` scrape validation | devops-sre | When markets-api deployed |

## Decision

- [x] **APPROVED** — catalog/read exit criteria met; advance `current_phase` to PHASE-2 pending orchestrator sign-off
- [ ] REJECTED

**Recommendation:** APPROVED. Do **not** advance `current_phase` until human/orchestrator explicitly approves after reviewing this gate artifact.

## Post-gate next task

**MKT-P2-001 — Wallet connect flow (web)**

First action: quarantine/hide legacy fe-v1 `WalletButton` on markets routes; implement `apps/web/src/products/markets/wallet/` per ADR-003 without raw key custody.
