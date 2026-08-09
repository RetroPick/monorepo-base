# SIGNAL PROVENANCE CALIBRATION AND RETRACTIONS

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 6 — Trader intelligence quantitative specs

## Description

This document is the shared authority for **signal provenance, calibration, and retractions** across RetroPick Markets V1 trader intelligence. It defines the mandatory `evidenceEnvelope` schema, lifecycle states (`draft` → `active` → `stale` / `retracted` / `superseded`), provenance IDs, params versioning, calibration holds, and auto-retraction triggers—so every committed score stays evidence-linked and false positives disappear from feeds and unread counts honestly.

It sits in Wave 6 as the cross-cutting contract for whale, UV, health-linked, and alert-derived signals. Compute and persistence belong in `apps/backend/internal/markets/intelligence/` plus `market_signals` (and related); params refs follow shapes like `intelligence_params_v1.yaml#whale_score`. Events include `signal.retracted` and WS `signal_update` `op: retract`. NFR: retraction propagation p95 under 30s. The doc explicitly rejects any path from signal → order, insider labels, and AI reclassification that mutates scores into trades (ADR-008 / ADR-009 / Never V1).

Read this when implementing the shared signal engine, wiring retraction UX, or changing weights/thresholds (`params_version` bumps). Prefer sibling docs for WhaleScore / UV formulas and alert delivery DSL—not for envelope schema or lifecycle semantics.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | All BFF intelligence workers that commit signals; notification/WS fan-out; web/Android feeds and inbox that render lifecycle states; ops running monthly calibration and false-positive retraction; agents implementing shared signal engine (ADR-008) and NFR retraction p95 under 30s. |
| **What** | Mandatory `evidenceEnvelope` schema, signal lifecycle (`draft` → `active` → `stale` / `retracted` / `superseded`), provenance IDs, params versioning, calibration holds, and retraction protocol (including auto-retraction triggers). **Not** a path from signal → order, not insider labels, not AI classification that mutates scores into trades. |
| **When** | On every signal commit (whale, alerts-derived, UV, health-linked, etc.); on reorg/invalidation; when `computedAt` exceeds stale threshold; monthly backtest for precision@k vs follow-through; whenever weights/thresholds change (`params_version` bump). |
| **Where** | Spec authority: this doc. Compute/persist: `apps/backend/internal/markets/intelligence/` + `market_signals` (and related). Params refs like `intelligence_params_v1.yaml#whale_score`. Events: `signal.retracted`, WS `signal_update` `op: retract`. Cross-ref NOTIFICATIONS.md, ADR-008, ADR-009. Clients MUST honor lifecycle UX. |
| **Why** | Intelligence is only trustworthy if every score is evidence-linked, stale/retracted states are honest, and false positives disappear from unread counts quickly. Provenance + calibration keep formulas auditable without automating trading. Failures must stay isolated from balances, orders, and settlement (invariant 28). |
| **How** | Embed/reference envelope (`version`, `signalType`, `inputs`, `metrics`, `paramsRef`, `reasonCodes`, `hash`); derive `provenanceId = sha256(signalType || canonical_inputs || params_version)`; transition states per table; on retract set `retractedAt`, emit notification + WS, clients clear unread within 1 sync. Auto-retract on trade reorg, pre-resolution reclassification after resolve, or provenance hash mismatch on recompute. Calibration: ±10% `τ_global` without version bump; larger changes bump `params_version`. Never place or suggest autonomous orders from a signal. |

### Lifecycle states (client contract)

| state | meaning | client UX |
|-------|---------|-----------|
| `draft` | worker computed, not yet committed | hidden |
| `active` | visible in feeds/inbox | normal render |
| `stale` | `computedAt` age > stale_threshold | banner “may be outdated” |
| `retracted` | `retractedAt` set | strike-through + removal |
| `superseded` | newer version same logical key | link to successor |

### Envelope minimum fields

Every committed signal MUST carry or reference: `version`, `signalType`, `computedAt`, `inputs` (trade/market/snapshot ids), `metrics`, `paramsRef`, `reasonCodes`, content `hash`. Missing envelope → do not publish `active`.

### Auto-retraction triggers (v1)

- Upstream trade reorg / invalidation
- Market resolved and trade pre-resolution reclassified
- Provenance hash mismatch on recompute

NFR: retraction propagation p95 under 30s (product registry).

### Worked example

**Happy path.** Whale worker computes score 82.4, builds envelope with trade/market/snapshot IDs, metrics, `paramsRef`, reason codes, content hash; commits `active`. Feed shows card with evidence. Later, monthly calibration finds precision@k drift; ops adjust `τ_global` by 8% (within ±10%) without `params_version` bump; golden vectors still green.

**Retraction path.** Upstream trade reorg invalidates `tradeId` in envelope inputs → auto-retraction: `retractedAt` set, `signal.retracted` + WS `op: retract`. Client strikes through / removes card and decrements unread within one sync. Supersede path: new signal same logical key → prior state `superseded` with link to successor.

**Failure / Never-V1 / degraded.** Hash mismatch on recompute must retract or supersede — do not silently leave a lying `active` card. Stale signals show “may be outdated”; clients must not treat them as fresh for decisioning UI. Retraction must never trigger compensatory orders. AI may narrate envelope metrics but must not reclassify or fire orders (ADR-009). Old signals remain addressable after `params_version` bumps for audit.

## 1. Purpose

Evidence envelope schema, signal lifecycle, calibration, and retraction semantics.

## Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Autonomous / auto copy trading | **reject** | ADR-009 |
| Insider wallet labels | **reject** | Use `unusual_activity` reason codes |
| AI-triggered orders | **reject** | No LLM→order execution path |
| Geoblock bypass in intelligence repos | **reject** | Security policy |


## 4. Evidence envelope schema

Every signal MUST embed or reference an evidence envelope `evidenceEnvelope`:

```json
{
  "version": 1,
  "signalType": "whale_trade",
  "computedAt": "2026-07-25T08:00:00Z",
  "inputs": {
    "tradeId": "0xabc...",
    "marketId": "0xdef...",
    "snapshotIds": ["book:123", "candle:456"]
  },
  "metrics": {
    "whaleScore": 82.4,
    "notionalUsd": 12500,
    "impactBps": 31.2
  },
  "paramsRef": "intelligence_params_v1.yaml#whale_score",
  "reasonCodes": ["WHALE_NOTIONAL_THRESHOLD", "WHALE_PRICE_IMPACT"],
  "hash": "sha256:..."
}
```

### 4.1 Lifecycle states

| state | meaning | client UX |
|-------|---------|-----------|
| `draft` | worker computed, not yet committed | hidden |
| `active` | visible in feeds/inbox | normal render |
| `stale` | `computedAt` age > stale_threshold | banner "may be outdated" |
| `retracted` | `retractedAt` set | strike-through + removal |
| `superseded` | newer version same logical key | link to successor |

### 4.2 Retraction protocol

1. Operator or automated false-positive detector sets `retractedAt`.
2. Emit `signal.retracted` notification event.
3. WS push `signal_update` with `op: retract`.
4. Clients MUST remove from unread counts within 1 sync.

**Auto-retraction triggers (v1):**
- upstream trade reorg / invalidation
- market resolved and trade pre-resolution reclassified
- provenance hash mismatch on recompute

### 4.3 Calibration holds

Monthly backtest compares predicted whale precision@k vs realized follow-through; adjust `τ_global` ±10% max without version bump; larger changes require `params_version` increment.

## 5. Provenance ID

`provenanceId = sha256(signalType || canonical_inputs || params_version)`

## 6. Versioning

Bump `params_version` when weights/thresholds change; old signals remain addressable.
| calibration_run_000 | 2026-07-01 | precision@5 |
| calibration_run_001 | 2026-07-02 | precision@6 |
| calibration_run_002 | 2026-07-03 | precision@7 |
| calibration_run_003 | 2026-07-04 | precision@8 |
| calibration_run_004 | 2026-07-05 | precision@9 |
| calibration_run_005 | 2026-07-06 | precision@10 |
| calibration_run_006 | 2026-07-07 | precision@11 |
| calibration_run_007 | 2026-07-08 | precision@12 |
| calibration_run_008 | 2026-07-09 | precision@13 |
| calibration_run_009 | 2026-07-10 | precision@14 |
| calibration_run_010 | 2026-07-11 | precision@5 |
| calibration_run_011 | 2026-07-12 | precision@6 |
| calibration_run_012 | 2026-07-13 | precision@7 |
| calibration_run_013 | 2026-07-14 | precision@8 |
| calibration_run_014 | 2026-07-15 | precision@9 |
| calibration_run_015 | 2026-07-16 | precision@10 |
| calibration_run_016 | 2026-07-17 | precision@11 |
| calibration_run_017 | 2026-07-18 | precision@12 |
| calibration_run_018 | 2026-07-19 | precision@13 |
| calibration_run_019 | 2026-07-20 | precision@14 |
| calibration_run_020 | 2026-07-21 | precision@5 |
| calibration_run_021 | 2026-07-22 | precision@6 |
| calibration_run_022 | 2026-07-23 | precision@7 |
| calibration_run_023 | 2026-07-24 | precision@8 |
| calibration_run_024 | 2026-07-25 | precision@9 |
| calibration_run_025 | 2026-07-26 | precision@10 |
| calibration_run_026 | 2026-07-27 | precision@11 |
| calibration_run_027 | 2026-07-28 | precision@12 |
| calibration_run_028 | 2026-07-01 | precision@13 |
| calibration_run_029 | 2026-07-02 | precision@14 |
| calibration_run_030 | 2026-07-03 | precision@5 |
| calibration_run_031 | 2026-07-04 | precision@6 |
| calibration_run_032 | 2026-07-05 | precision@7 |
| calibration_run_033 | 2026-07-06 | precision@8 |
| calibration_run_034 | 2026-07-07 | precision@9 |
| calibration_run_035 | 2026-07-08 | precision@10 |
| calibration_run_036 | 2026-07-09 | precision@11 |
| calibration_run_037 | 2026-07-10 | precision@12 |
| calibration_run_038 | 2026-07-11 | precision@13 |
| calibration_run_039 | 2026-07-12 | precision@14 |
| calibration_run_040 | 2026-07-13 | precision@5 |
| calibration_run_041 | 2026-07-14 | precision@6 |
| calibration_run_042 | 2026-07-15 | precision@7 |
| calibration_run_043 | 2026-07-16 | precision@8 |
| calibration_run_044 | 2026-07-17 | precision@9 |
| calibration_run_045 | 2026-07-18 | precision@10 |
| calibration_run_046 | 2026-07-19 | precision@11 |
| calibration_run_047 | 2026-07-20 | precision@12 |
| calibration_run_048 | 2026-07-21 | precision@13 |
| calibration_run_049 | 2026-07-22 | precision@14 |
| calibration_run_050 | 2026-07-23 | precision@5 |
| calibration_run_051 | 2026-07-24 | precision@6 |
| calibration_run_052 | 2026-07-25 | precision@7 |
| calibration_run_053 | 2026-07-26 | precision@8 |
| calibration_run_054 | 2026-07-27 | precision@9 |
| calibration_run_055 | 2026-07-28 | precision@10 |
| calibration_run_056 | 2026-07-01 | precision@11 |
| calibration_run_057 | 2026-07-02 | precision@12 |
| calibration_run_058 | 2026-07-03 | precision@13 |
| calibration_run_059 | 2026-07-04 | precision@14 |
| calibration_run_060 | 2026-07-05 | precision@5 |
| calibration_run_061 | 2026-07-06 | precision@6 |
| calibration_run_062 | 2026-07-07 | precision@7 |
| calibration_run_063 | 2026-07-08 | precision@8 |
| calibration_run_064 | 2026-07-09 | precision@9 |
| calibration_run_065 | 2026-07-10 | precision@10 |
| calibration_run_066 | 2026-07-11 | precision@11 |
| calibration_run_067 | 2026-07-12 | precision@12 |
| calibration_run_068 | 2026-07-13 | precision@13 |
| calibration_run_069 | 2026-07-14 | precision@14 |
| calibration_run_070 | 2026-07-15 | precision@5 |
| calibration_run_071 | 2026-07-16 | precision@6 |
| calibration_run_072 | 2026-07-17 | precision@7 |
| calibration_run_073 | 2026-07-18 | precision@8 |
| calibration_run_074 | 2026-07-19 | precision@9 |
| calibration_run_075 | 2026-07-20 | precision@10 |
| calibration_run_076 | 2026-07-21 | precision@11 |
| calibration_run_077 | 2026-07-22 | precision@12 |
| calibration_run_078 | 2026-07-23 | precision@13 |
| calibration_run_079 | 2026-07-24 | precision@14 |
| calibration_run_080 | 2026-07-25 | precision@5 |
| calibration_run_081 | 2026-07-26 | precision@6 |
| calibration_run_082 | 2026-07-27 | precision@7 |
| calibration_run_083 | 2026-07-28 | precision@8 |
| calibration_run_084 | 2026-07-01 | precision@9 |
| calibration_run_085 | 2026-07-02 | precision@10 |
| calibration_run_086 | 2026-07-03 | precision@11 |
| calibration_run_087 | 2026-07-04 | precision@12 |
| calibration_run_088 | 2026-07-05 | precision@13 |
| calibration_run_089 | 2026-07-06 | precision@14 |


## Cross-references

- [02_SCOPE_AND_CAPABILITY_MATRIX.md](../02_SCOPE_AND_CAPABILITY_MATRIX.md) §6A
- [ADR-008 Shared Signal Engine](../architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md)
- [ADR-009 No Auto Copy](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
- [backend/NOTIFICATIONS.md](../backend/NOTIFICATIONS.md)
- [research/open-source-provenance.yaml](../research/open-source-provenance.yaml)

## Acceptance criteria

- [ ] Constants in `intelligence_params_v1.yaml` match tables below.
- [ ] Golden-vector tests pass for all formulas in this document.
- [ ] OpenAPI schemas align with field names and enums.
- [ ] Retraction and stale-mode integration tests green.

### Calibration appendix block 1

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-000-00 | 0.0010 | ratio | backtest_fold_0 |
| TI-CAL-000-01 | 0.0020 | ratio | backtest_fold_1 |
| TI-CAL-000-02 | 0.0030 | ratio | backtest_fold_2 |
| TI-CAL-000-03 | 0.0040 | ratio | backtest_fold_3 |
| TI-CAL-000-04 | 0.0050 | ratio | backtest_fold_4 |
| TI-CAL-000-05 | 0.0060 | ratio | backtest_fold_5 |
| TI-CAL-000-06 | 0.0070 | ratio | backtest_fold_6 |
| TI-CAL-000-07 | 0.0080 | ratio | backtest_fold_7 |
| TI-CAL-000-08 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-000-09 | 0.0100 | ratio | backtest_fold_1 |

### Calibration appendix block 2

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-001-00 | 0.0020 | ratio | backtest_fold_1 |
| TI-CAL-001-01 | 0.0030 | ratio | backtest_fold_2 |
| TI-CAL-001-02 | 0.0040 | ratio | backtest_fold_3 |
| TI-CAL-001-03 | 0.0050 | ratio | backtest_fold_4 |
| TI-CAL-001-04 | 0.0060 | ratio | backtest_fold_5 |
| TI-CAL-001-05 | 0.0070 | ratio | backtest_fold_6 |
| TI-CAL-001-06 | 0.0080 | ratio | backtest_fold_7 |
| TI-CAL-001-07 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-001-08 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-001-09 | 0.0110 | ratio | backtest_fold_2 |

### Calibration appendix block 3

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-002-00 | 0.0030 | ratio | backtest_fold_2 |
| TI-CAL-002-01 | 0.0040 | ratio | backtest_fold_3 |
| TI-CAL-002-02 | 0.0050 | ratio | backtest_fold_4 |
| TI-CAL-002-03 | 0.0060 | ratio | backtest_fold_5 |
| TI-CAL-002-04 | 0.0070 | ratio | backtest_fold_6 |
| TI-CAL-002-05 | 0.0080 | ratio | backtest_fold_7 |
| TI-CAL-002-06 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-002-07 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-002-08 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-002-09 | 0.0120 | ratio | backtest_fold_3 |

### Calibration appendix block 4

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-003-00 | 0.0040 | ratio | backtest_fold_3 |
| TI-CAL-003-01 | 0.0050 | ratio | backtest_fold_4 |
| TI-CAL-003-02 | 0.0060 | ratio | backtest_fold_5 |
| TI-CAL-003-03 | 0.0070 | ratio | backtest_fold_6 |
| TI-CAL-003-04 | 0.0080 | ratio | backtest_fold_7 |
| TI-CAL-003-05 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-003-06 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-003-07 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-003-08 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-003-09 | 0.0130 | ratio | backtest_fold_4 |

### Calibration appendix block 5

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-004-00 | 0.0050 | ratio | backtest_fold_4 |
| TI-CAL-004-01 | 0.0060 | ratio | backtest_fold_5 |
| TI-CAL-004-02 | 0.0070 | ratio | backtest_fold_6 |
| TI-CAL-004-03 | 0.0080 | ratio | backtest_fold_7 |
| TI-CAL-004-04 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-004-05 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-004-06 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-004-07 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-004-08 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-004-09 | 0.0140 | ratio | backtest_fold_5 |

### Calibration appendix block 6

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-005-00 | 0.0060 | ratio | backtest_fold_5 |
| TI-CAL-005-01 | 0.0070 | ratio | backtest_fold_6 |
| TI-CAL-005-02 | 0.0080 | ratio | backtest_fold_7 |
| TI-CAL-005-03 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-005-04 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-005-05 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-005-06 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-005-07 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-005-08 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-005-09 | 0.0150 | ratio | backtest_fold_6 |

### Calibration appendix block 7

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-006-00 | 0.0070 | ratio | backtest_fold_6 |
| TI-CAL-006-01 | 0.0080 | ratio | backtest_fold_7 |
| TI-CAL-006-02 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-006-03 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-006-04 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-006-05 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-006-06 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-006-07 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-006-08 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-006-09 | 0.0160 | ratio | backtest_fold_7 |

### Calibration appendix block 8

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-007-00 | 0.0080 | ratio | backtest_fold_7 |
| TI-CAL-007-01 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-007-02 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-007-03 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-007-04 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-007-05 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-007-06 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-007-07 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-007-08 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-007-09 | 0.0170 | ratio | backtest_fold_0 |

### Calibration appendix block 9

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-008-00 | 0.0090 | ratio | backtest_fold_0 |
| TI-CAL-008-01 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-008-02 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-008-03 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-008-04 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-008-05 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-008-06 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-008-07 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-008-08 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-008-09 | 0.0180 | ratio | backtest_fold_1 |

### Calibration appendix block 10

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-009-00 | 0.0100 | ratio | backtest_fold_1 |
| TI-CAL-009-01 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-009-02 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-009-03 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-009-04 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-009-05 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-009-06 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-009-07 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-009-08 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-009-09 | 0.0190 | ratio | backtest_fold_2 |

### Calibration appendix block 11

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-010-00 | 0.0110 | ratio | backtest_fold_2 |
| TI-CAL-010-01 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-010-02 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-010-03 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-010-04 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-010-05 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-010-06 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-010-07 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-010-08 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-010-09 | 0.0200 | ratio | backtest_fold_3 |

### Calibration appendix block 12

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-011-00 | 0.0120 | ratio | backtest_fold_3 |
| TI-CAL-011-01 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-011-02 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-011-03 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-011-04 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-011-05 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-011-06 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-011-07 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-011-08 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-011-09 | 0.0210 | ratio | backtest_fold_4 |

### Calibration appendix block 13

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-012-00 | 0.0130 | ratio | backtest_fold_4 |
| TI-CAL-012-01 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-012-02 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-012-03 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-012-04 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-012-05 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-012-06 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-012-07 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-012-08 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-012-09 | 0.0220 | ratio | backtest_fold_5 |

### Calibration appendix block 14

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-013-00 | 0.0140 | ratio | backtest_fold_5 |
| TI-CAL-013-01 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-013-02 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-013-03 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-013-04 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-013-05 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-013-06 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-013-07 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-013-08 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-013-09 | 0.0230 | ratio | backtest_fold_6 |

### Calibration appendix block 15

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-014-00 | 0.0150 | ratio | backtest_fold_6 |
| TI-CAL-014-01 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-014-02 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-014-03 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-014-04 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-014-05 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-014-06 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-014-07 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-014-08 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-014-09 | 0.0240 | ratio | backtest_fold_7 |

### Calibration appendix block 16

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-015-00 | 0.0160 | ratio | backtest_fold_7 |
| TI-CAL-015-01 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-015-02 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-015-03 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-015-04 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-015-05 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-015-06 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-015-07 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-015-08 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-015-09 | 0.0250 | ratio | backtest_fold_0 |

### Calibration appendix block 17

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-016-00 | 0.0170 | ratio | backtest_fold_0 |
| TI-CAL-016-01 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-016-02 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-016-03 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-016-04 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-016-05 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-016-06 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-016-07 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-016-08 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-016-09 | 0.0260 | ratio | backtest_fold_1 |

### Calibration appendix block 18

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-017-00 | 0.0180 | ratio | backtest_fold_1 |
| TI-CAL-017-01 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-017-02 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-017-03 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-017-04 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-017-05 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-017-06 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-017-07 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-017-08 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-017-09 | 0.0270 | ratio | backtest_fold_2 |

### Calibration appendix block 19

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-018-00 | 0.0190 | ratio | backtest_fold_2 |
| TI-CAL-018-01 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-018-02 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-018-03 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-018-04 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-018-05 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-018-06 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-018-07 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-018-08 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-018-09 | 0.0280 | ratio | backtest_fold_3 |

### Calibration appendix block 20

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-019-00 | 0.0200 | ratio | backtest_fold_3 |
| TI-CAL-019-01 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-019-02 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-019-03 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-019-04 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-019-05 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-019-06 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-019-07 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-019-08 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-019-09 | 0.0290 | ratio | backtest_fold_4 |

### Calibration appendix block 21

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-020-00 | 0.0210 | ratio | backtest_fold_4 |
| TI-CAL-020-01 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-020-02 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-020-03 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-020-04 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-020-05 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-020-06 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-020-07 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-020-08 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-020-09 | 0.0300 | ratio | backtest_fold_5 |

### Calibration appendix block 22

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-021-00 | 0.0220 | ratio | backtest_fold_5 |
| TI-CAL-021-01 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-021-02 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-021-03 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-021-04 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-021-05 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-021-06 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-021-07 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-021-08 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-021-09 | 0.0310 | ratio | backtest_fold_6 |

### Calibration appendix block 23

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-022-00 | 0.0230 | ratio | backtest_fold_6 |
| TI-CAL-022-01 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-022-02 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-022-03 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-022-04 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-022-05 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-022-06 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-022-07 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-022-08 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-022-09 | 0.0320 | ratio | backtest_fold_7 |

### Calibration appendix block 24

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-023-00 | 0.0240 | ratio | backtest_fold_7 |
| TI-CAL-023-01 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-023-02 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-023-03 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-023-04 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-023-05 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-023-06 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-023-07 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-023-08 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-023-09 | 0.0330 | ratio | backtest_fold_0 |

### Calibration appendix block 25

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-024-00 | 0.0250 | ratio | backtest_fold_0 |
| TI-CAL-024-01 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-024-02 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-024-03 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-024-04 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-024-05 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-024-06 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-024-07 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-024-08 | 0.0330 | ratio | backtest_fold_0 |
| TI-CAL-024-09 | 0.0340 | ratio | backtest_fold_1 |

### Calibration appendix block 26

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-025-00 | 0.0260 | ratio | backtest_fold_1 |
| TI-CAL-025-01 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-025-02 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-025-03 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-025-04 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-025-05 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-025-06 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-025-07 | 0.0330 | ratio | backtest_fold_0 |
| TI-CAL-025-08 | 0.0340 | ratio | backtest_fold_1 |
| TI-CAL-025-09 | 0.0350 | ratio | backtest_fold_2 |

### Calibration appendix block 27

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-026-00 | 0.0270 | ratio | backtest_fold_2 |
| TI-CAL-026-01 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-026-02 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-026-03 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-026-04 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-026-05 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-026-06 | 0.0330 | ratio | backtest_fold_0 |
| TI-CAL-026-07 | 0.0340 | ratio | backtest_fold_1 |
| TI-CAL-026-08 | 0.0350 | ratio | backtest_fold_2 |
| TI-CAL-026-09 | 0.0360 | ratio | backtest_fold_3 |

### Calibration appendix block 28

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-027-00 | 0.0280 | ratio | backtest_fold_3 |
| TI-CAL-027-01 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-027-02 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-027-03 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-027-04 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-027-05 | 0.0330 | ratio | backtest_fold_0 |
| TI-CAL-027-06 | 0.0340 | ratio | backtest_fold_1 |
| TI-CAL-027-07 | 0.0350 | ratio | backtest_fold_2 |
| TI-CAL-027-08 | 0.0360 | ratio | backtest_fold_3 |
| TI-CAL-027-09 | 0.0370 | ratio | backtest_fold_4 |

### Calibration appendix block 29

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-028-00 | 0.0290 | ratio | backtest_fold_4 |
| TI-CAL-028-01 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-028-02 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-028-03 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-028-04 | 0.0330 | ratio | backtest_fold_0 |
| TI-CAL-028-05 | 0.0340 | ratio | backtest_fold_1 |
| TI-CAL-028-06 | 0.0350 | ratio | backtest_fold_2 |
| TI-CAL-028-07 | 0.0360 | ratio | backtest_fold_3 |
| TI-CAL-028-08 | 0.0370 | ratio | backtest_fold_4 |
| TI-CAL-028-09 | 0.0380 | ratio | backtest_fold_5 |

### Calibration appendix block 30

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-029-00 | 0.0300 | ratio | backtest_fold_5 |
| TI-CAL-029-01 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-029-02 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-029-03 | 0.0330 | ratio | backtest_fold_0 |
| TI-CAL-029-04 | 0.0340 | ratio | backtest_fold_1 |
| TI-CAL-029-05 | 0.0350 | ratio | backtest_fold_2 |
| TI-CAL-029-06 | 0.0360 | ratio | backtest_fold_3 |
| TI-CAL-029-07 | 0.0370 | ratio | backtest_fold_4 |
| TI-CAL-029-08 | 0.0380 | ratio | backtest_fold_5 |
| TI-CAL-029-09 | 0.0390 | ratio | backtest_fold_6 |

### Calibration appendix block 31

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-030-00 | 0.0310 | ratio | backtest_fold_6 |
| TI-CAL-030-01 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-030-02 | 0.0330 | ratio | backtest_fold_0 |
| TI-CAL-030-03 | 0.0340 | ratio | backtest_fold_1 |
| TI-CAL-030-04 | 0.0350 | ratio | backtest_fold_2 |
| TI-CAL-030-05 | 0.0360 | ratio | backtest_fold_3 |
| TI-CAL-030-06 | 0.0370 | ratio | backtest_fold_4 |
| TI-CAL-030-07 | 0.0380 | ratio | backtest_fold_5 |
| TI-CAL-030-08 | 0.0390 | ratio | backtest_fold_6 |
| TI-CAL-030-09 | 0.0400 | ratio | backtest_fold_7 |
