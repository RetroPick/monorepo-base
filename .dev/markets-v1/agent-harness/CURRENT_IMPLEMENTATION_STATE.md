# Current Implementation State — Phase 1.3

- **Worktree:** `/home/asyam/dev/set-up/projects/retropick-markets-v1`
- **Branch:** `codex/p13c-000-reconciliation`
- **Authoritative baseline:** PR #9 merge `54ae0f9fd98ada0c2ec646deea65b973fce885ca` on `origin/main`
- **Phase:** 1.3 — Realtime data and deterministic intelligence (runtime closure)
- **Status:** `runtime_closure_in_progress` — **NOT complete**
- **Last reconciliation:** P13C-001 accepted 2026-08-06; Phase 1.3 runtime closure still in progress

## Phase lineage

| Phase | Status | Notes |
|-------|--------|-------|
| 1.0 backend read | closed | PR #7 |
| 1.2 web read terminal | closed | P1W-000 … P1W-012 |
| 1.3 realtime intelligence | **in progress** | PR #9 landed; P13C-000 … P13C-008 open |

## Delivered in Phase 1.3

| Task | Honest status |
|------|---------------|
| MKT-P13-000 | done |
| MKT-P13-001 | done (tests not re-run locally) |
| MKT-P13-002 | done (tests not re-run locally) |
| MKT-P13-003 | done (tests not re-run locally) |
| MKT-P13-004 | **partial** — PR #9 landed observation + committer wiring; P13C-002 pending |
| MKT-P13-005 | **partial** — PR #9 landed hub/runtime/registry wiring; P13C-001/003/004/005 pending |

## Signal pipeline honesty

| Path | Status |
|------|--------|
| MKT-P1-008 catalog-sync signals | **done** |
| Phase 1.3 live pipeline | **wired in PR #9**; ADR-014 NOT implemented until P13C-002 |

## Open closure tasks (P13C)

| ID | Blocker |
|----|---------|
| P13C-000 | **accepted** — Go/TS/drift evidence recorded; independent review pending |
| P13C-001 | **done** — catalog registry fail-closed validation (evidence: P13C-001-VERIFICATION-EVIDENCE.md) |
| P13C-002 | PR #9 code landed; ADR-014 closure pending |
| P13C-003 | Local Go verification blocked |
| P13C-004 | — |
| P13C-005 | — |
| P13C-006 | BLK-006 |
| P13C-007 | BLK-005 (`ROTATION_PENDING_OWNER`) |
| P13C-008 | — |

## Capability honesty

- `capabilities.trading=false`
- `capabilities.features.realtime=false` by default (`MARKETS_REALTIME_ENABLED=0`)
- `capabilities.features.intelligence=false` until P13C-002
- Frontend polls when realtime off; no direct Polymarket connection (network boundary tests)

## Blockers

- BLK-003 **resolved** (P13C-001); BLK-004 remains open under P13C-002
- BLK-005: `ROTATION_PENDING_OWNER` — production blocked
- BLK-006: single-replica limitation

## Toolchain

| Source | Go | Node |
|--------|-----|------|
| go.mod | 1.25 | — |
| CI | 1.26 | 22 |
| Local verification | 1.26.5 (`~/toolchain/go1.26.5`) | v22.22.0 (nvm) |

## Verification

```bash
go -C apps/backend test ./internal/markets/... -count=1   # PASS (Go 1.26.5)
pnpm --filter @retropick/markets-v1 test                   # PASS (75)
pnpm --filter @retropick/polymarket test                   # PASS (20)
bash scripts/check-markets-openapi-drift.sh              # PASS
bash scripts/check-markets-realtime-asyncapi-drift.sh    # PASS
```

**Do not advance to Phase 2 until Phase 1.3 closure is approved.**

## Next action

1. Independent human review of P13C-000 evidence.
2. P13C-001 closed; next gated slice is P13C-002 (do not begin without explicit gate).
