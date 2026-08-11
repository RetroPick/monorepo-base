# Orchestrator Patch — MKT-P1-010 (human applies)

**Do NOT apply `current_phase` change until gate reviewer explicitly approves.**

## 1. Task graph status updates

In `../../../../../../../.harness/products/markets-v1/planning/task-graph.yaml`, set `status: done` and link verification evidence for:

| Task ID | verification_evidence |
|---------|----------------------|
| MKT-P1-001 | (prior session — link if exists) |
| MKT-P1-002 | (prior session) |
| MKT-P1-003 | (prior session) |
| MKT-P1-004 | `../../../../../../../.harness/products/markets-v1/evidence/verification/PHASE-1/MKT-P1-010-evidence.md` |
| MKT-P1-005 | `../../../../../../../.harness/products/markets-v1/evidence/verification/PHASE-1/MKT-P1-010-evidence.md` |
| MKT-P1-006 | (prior session) |
| MKT-P1-007 | (prior session) |
| MKT-P1-008 | `../../../../../../../.harness/products/markets-v1/evidence/verification/PHASE-1/MKT-P1-008-evidence.md` |
| MKT-P1-009 | `../../../../../../../.harness/products/markets-v1/evidence/verification/PHASE-1/MKT-P1-009-evidence.md` |
| MKT-P1-010 | `../../../../../../../.harness/products/markets-v1/evidence/verification/PHASE-1/MKT-P1-010-evidence.md` |

## 2. Manifest update (ONLY after explicit human approval)

In `../../../../../../../.harness/products/markets-v1/planning/implementation-manifest.yaml`:

```yaml
current_phase: PHASE-2
# Under phase_order, set PHASE-1 status: complete and PHASE-2 status: ready
```

## 3. Phase gate filing

Archive gate decision: `../../../../../../../.harness/products/markets-v1/evidence/verification/PHASE-1/MKT-P1-010-phase-gate.md`

## 4. Next executable task

Unlock **MKT-P2-001** — Wallet connect flow (web)

- Owned paths: `apps/web/src/products/markets/wallet/`
- First action: quarantine fe-v1 `WalletButton` on markets routes

## Out of scope (do not start from this gate)

- I0 intelligence runtime
- Android Compose (PHASE-5)
- fe-v1 → Next shell migration (PHASE-6)
