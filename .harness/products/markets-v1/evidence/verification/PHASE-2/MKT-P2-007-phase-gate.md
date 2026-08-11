# Phase Gate — PHASE-2 (MKT-P2-007)

**Task:** MKT-P2-007 exit gate verification  
**Agent:** Chat S  
**Date:** 2026-08-09

## Phase metadata

| Field | Value |
|-------|-------|
| Phase ID | PHASE-2 |
| Reviewer | platform-orchestrator (pending human authorization for phase advance) |
| Date | 2026-08-09 |

## Entry criteria

- [x] Prior phase exit approved (PHASE-1 / MKT-P1-010)
- [x] No open blockers that invalidate *verification* of shipped foundations — **BLK-001 acknowledged as ops-pending, not bypassed**

## Deliverables checklist

- [x] MKT-P2-004 evidence linked (backend + web OpenAPI align)
- [x] MKT-P2-005 evidence linked (backend SIWE + web session client)
- [x] MKT-P2-006 evidence linked (balances + main wire)
- [x] Glue tests: session ↔ wallets ↔ balances on full router
- [x] Stack smoke + unit/contract tests green — see [MKT-P2-007-test-output.txt](./MKT-P2-007-test-output.txt)
- [x] Invariant greps — see [MKT-P2-007-invariant-greps.txt](./MKT-P2-007-invariant-greps.txt)

## Exit criteria

- [x] Wallet connect without key custody (ADR-003; SIWE + custody tests)
- [x] Fail-closed eligibility in default deploy (`eligible:false`, `geo_unknown`)
- [x] `eligibility_fail_closed` metric unit test passes
- [x] No order submit (`order_submit: false`; no mounted submit routes)
- [x] Funding sandbox UX (banner; CREATE flag off)
- [ ] **Full production eligibility** — blocked on BLK-001 ops staging proof (`eligible:true` for allowed region)

## Evidence links

### Verification

- [MKT-P2-007-evidence.md](./MKT-P2-007-evidence.md) — master aggregation
- [MKT-P2-007-test-output.txt](./MKT-P2-007-test-output.txt)
- [MKT-P2-007-invariant-greps.txt](./MKT-P2-007-invariant-greps.txt)
- Upstream: P2-004/005/006, GLUE session-wallet, health-ready fix, BLK-001 tracker

### Traceability

- MKT-FR-020, MKT-FR-021, MKT-SEC-001, MKT-SEC-003 — rows satisfied per [MKT-P2-007-evidence.md](./MKT-P2-007-evidence.md)

### Invariant re-run

- [INVARIANT_CHECK.md](../../INVARIANT_CHECK.md) — greps in MKT-P2-007-invariant-greps.txt; no product violations

## Decision

- [ ] APPROVED — advance `current_phase` to PHASE-3
- [x] **CONDITIONAL — foundations verified; phase advance blocked**

### Remediations before phase advance

1. Ops inject `MARKETS_GEOIP_*` + `MARKETS_GEOBLOCK_*` in staging; prove `GET /eligibility` → `eligible:true` for allowed region (clears BLK-001)
2. Orchestrator explicit authorization to advance `current_phase`
3. Optional: complete P2-005-web manual staging checklist; resolve BLK-005 manifest title vs partial delivery

### Rationale

Wallet/session/funding **foundations** are verified in dev stack and test suite: SIWE, auth-only wallet discovery 200, eligible-gated balances 403 under BLK-001, sandbox funding client, no order submit. **BLK-001 remains open** with honest fail-closed behavior — phase advance must not proceed until ops staging proof and human authorization.
