# Current Implementation State — Phase 1.3

- **Branch:** `cursor/markets-v1-phase1-3-runtime-closure`
- **Base merge SHA (PR #8):** `64bce05ae16229d22405ff1b72893352ca9e15a8`
- **Phase:** 1.3 — Realtime data and deterministic intelligence (runtime closure)
- **Status:** `runtime_closure_in_progress` — **NOT complete**

## Phase lineage

| Phase | Status | Notes |
|-------|--------|-------|
| 1.0 backend read | closed | MKT-P1-001 … MKT-P1-010 + P1C-001 … P1C-009 (PR #7) |
| 1.2 web read terminal | closed | P1W-000 … P1W-012; `apps/fe-v1` mobile-first read terminal |
| 1.3 realtime intelligence | **in progress** | Implementation landed in PR #8; closure tasks P13C-000 … P13C-008 open |

## Delivered in Phase 1.3 (implementation slice)

| Task | Outcome | Honest status |
|------|---------|---------------|
| MKT-P13-000 | ADR-011 … ADR-014 accepted; architecture contract frozen | done |
| MKT-P13-001 | Upstream WS supervisor (`internal/markets/upstream/ws`) | done (unit tests) |
| MKT-P13-002 | Snapshot-first reconciler (`internal/markets/marketdata/reconciler.go`) | done (unit tests) |
| MKT-P13-003 | `streamEpoch` / `deliveryCounter` delivery metadata | done (unit tests) |
| MKT-P13-004 | Migration 000017 + sqlc observation queries | **partial** — schema only; no transactional producer |
| MKT-P13-005 | Public WS hub, producer bridge, `apps/fe-v1` realtime hook scaffold | **partial** — capability off by default |

## Signal pipeline honesty (MKT-P1-008 vs Phase 1.3)

| Path | Scope | Status |
|------|-------|--------|
| **MKT-P1-008** (Phase 1) | Catalog-sync signals: `new_market`, `rule_changed` via `CatalogSignalProducer` inside `ApplyPage` transaction | **done** — verified P1C-008 |
| **Phase 1.3 live pipeline** | Reconciler-driven `price_move`, `liquidity_change` from bounded observation buckets → durable evidence → signal emit | **NOT wired** — ADR-014 design accepted; transactional `RealtimeSignalProducer` missing (P13C-002) |

Do not conflate catalog-sync signal correctness (Phase 1) with live observation-driven signals (Phase 1.3).

## Open closure tasks (P13C)

| ID | Title | Blocker |
|----|-------|---------|
| P13C-000 | Runtime reconciliation gate | — |
| P13C-001 | Catalog-backed token registry wiring | BLK-003 |
| P13C-002 | Transactional observation + signal pipeline | BLK-004 |
| P13C-003 | Upstream → hub E2E integration tests | — |
| P13C-004 | Capability flags reflect runtime truth | — |
| P13C-005 | Reconnect/resnapshot integration verification | — |
| P13C-006 | Single-replica deployment guardrails | BLK-006 |
| P13C-007 | SEC-P13-001 rotation gate | BLK-005 (`ROTATION_PENDING_OWNER`) |
| P13C-008 | Harness reconciliation and closure evidence | — |

## Capability honesty

- `capabilities.trading=false` — no order submission
- `capabilities.features.realtime=false` until hub + ingestion operational and P13C-004 passes
- `capabilities.features.intelligence=false` for live `price_move`/`liquidity_change` until P13C-002 passes
- Catalog signals (`new_market`, `rule_changed`) may be enabled independently via `SignalsEnabled`
- Frontend (`apps/fe-v1`) polls when realtime capability is false; labels say "Snapshot polling — not realtime"

## Unresolved blockers

See [implementation-manifest.yaml](implementation-manifest.yaml) `unresolved_blockers`: token registry (BLK-003), signal pipeline (BLK-004), rotation (BLK-005), single-replica (BLK-006).

## Verification

```bash
go -C apps/backend test ./internal/markets/... -count=1
go -C apps/backend test ./internal/markets/upstream/ws ./internal/markets/marketdata ./internal/markets/realtime ./internal/markets/signals -count=1
pnpm --filter @retropick/polymarket test
pnpm --filter @retropick/markets-v1 test
bash scripts/check-markets-openapi-drift.sh
```

Phase 1.3 exit requires P13C-000 … P13C-008 evidence and human review. **Do not advance to Phase 2 until Phase 1.3 closure is approved.**

## Next action

Complete P13C-001 (catalog token registry) and P13C-002 (transactional observation-to-signal wiring) before claiming ADR-014 implemented or Phase 1.3 complete.
