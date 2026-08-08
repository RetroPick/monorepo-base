# UNUSUAL ACTIVITY HEURISTICS

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 6 — Trader intelligence quantitative specs

## Description

This document is the quantitative authority for **unusual-activity heuristics** in RetroPick Markets V1 trader intelligence. It defines five V1.1 detectors (UV-001…005)—velocity spike, clustered flow, silent volume, cutoff surge, and fresh-wallet large entry—each emitting `signalType: unusual_activity` with a constrained reason code—so clients can surface statistically odd flow without inventing insider accusations on device.

It sits in Wave 6 beside whale detection, market-health analytics, alert rules, and signal-provenance specs. Compute belongs in `apps/backend/internal/markets/intelligence/`; thresholds live under `intelligence_params_v1.yaml` (UV section when present). The surface is gated by `intelligence.unusual_activity` and requires 14-day shadow evaluation (precision@10 ≥ 0.55) before production push. Depth for UV-005 comes from MARKET_HEALTH (`depth_2pct`)—never invented. The doc explicitly rejects insider-wallet labels, auto-copy trading, and any LLM→order path (ADR-009 / Never V1).

Read this when implementing TI-V11-001, calibrating UV shadow_eval fixtures, or reviewing unusual-activity UX copy. Prefer sibling docs for WhaleScore notional math, alert delivery DSL, and evidence envelopes—not for UV fire conditions.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | BFF unusual-activity workers; web/Android surfaces behind `intelligence.unusual_activity`; ops running 14-day shadow evaluation; agents implementing TI-V11-001. Reviewers enforcing “informational reason codes only” — never insider language. |
| **What** | Five V1.1 heuristics (UV-001…005): velocity spike, clustered flow, silent volume, cutoff surge, fresh-wallet large entry — each emitting `signalType: unusual_activity` with a reason code. **Not** insider-wallet labels, auto-copy, AI→orders, or V1 default-on push without shadow mode. |
| **When** | **V1.1** only, flag `intelligence.unusual_activity`. Shadow mode required for 14 days before production push enable; precision@10 target ≥ 0.55 on labeled review set. Applies after normalized trades + depth priors exist for the relevant windows. |
| **Where** | Spec authority: this doc. Compute: `apps/backend/internal/markets/intelligence/`. Params/thresholds in `intelligence_params_v1.yaml` (UV section when present). Signals commit through shared envelope/lifecycle (SIGNAL_PROVENANCE…). Delivery via ALERT_RULES only after shadow graduation. Clients render descriptive copy only. |
| **Why** | Surface statistically odd flow patterns without accusing wallets of insider activity. Separate from whale notional scoring: UV is gated, calibrated, and language-constrained. Failures must stay isolated from balances, orders, and settlement (invariant 28). |
| **How** | Evaluate UV-001…005 per formulas (z-score velocity, multi-wallet cluster, price-volume divergence, late cutoff volume share, first-trade large notional vs depth). Emit reason codes `VELOCITY_SPIKE`, `CLUSTERED_FLOW`, `SILENT_VOLUME`, `CUTOFF_SURGE`, `FRESH_WALLET_LARGE`. Run shadow_eval metrics before enabling push. Never map these codes to “insider” UI strings or autonomous orders. |

### Tier and graduation gate

- Tier: **V1.1** — flag `intelligence.unusual_activity` (this doc §2).
- Shadow mode: **required** 14 days before production push enable.
- Calibration target: precision@10 ≥ 0.55 on labeled review set (`shadow_eval_*` fixtures).
- Distinct from V1 whale feed: UV is opt-in and language-constrained.

### Heuristic → reason code map

| code | heuristic | fire summary |
|------|-----------|--------------|
| UV-001 | VELOCITY_SPIKE | z ≥ 3.5 on 5m trade count AND trades_5m ≥ 8 |
| UV-002 | CLUSTERED_FLOW | ≥4 wallets, each ≥ $1k, 15m, pairwise gap ≤ 120s |
| UV-003 | SILENT_VOLUME | \|Δprice_30m\| < 2% AND vol ratio > 2.5 |
| UV-004 | CUTOFF_SURGE | within 24h of end_date; vol_1h / vol_24h > 0.35 |
| UV-005 | FRESH_WALLET_LARGE | first trade AND notional ≥ max(3000, 0.05×depth_2pct) |

Depth for UV-005 comes from MARKET_HEALTH (`depth_2pct`) — never invent.

### Worked example

**Happy path — UV-001.** In a liquid market, `trades_5m = 20`, EWMA μ and σ yield `z ≥ 3.5` and count ≥ 8 → fire `VELOCITY_SPIKE`. Worker writes `unusual_activity` signal with evidence envelope (window counts, z, paramsRef). In shadow mode, signal is logged/scored for precision@10 but not pushed to users.

**Happy path — UV-002 / UV-005.** Four distinct wallets each trade ≥ $1k in 15m with pairwise gaps ≤ 120s → `CLUSTERED_FLOW`. Separately, a wallet’s first platform trade at notional ≥ max(3000, 0.05×depth_2pct) → `FRESH_WALLET_LARGE`. Copy stays factual (“Clustered large trades”, “Large first-time wallet activity”).

**Failure / Never-V1 / degraded.** UI or ops label “likely insider” → hard reject; use UV reason codes only. Enabling push before 14d shadow or below precision@10 0.55 → blocked. Flag off → no public UV surface. Signals must not open copy-trades or AI→orders (ADR-009). Missing depth for UV-005 → do not fire on invented depth; skip or evidence-flag degraded inputs.

## 1. Purpose

V1.1 gated heuristics for unusual activity detection. Informational reason codes only.

## Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Autonomous / auto copy trading | **reject** | ADR-009 |
| Insider wallet labels | **reject** | Use `unusual_activity` reason codes |
| AI-triggered orders | **reject** | No LLM→order execution path |
| Geoblock bypass in intelligence repos | **reject** | Security policy |

## 2. Tier

**V1.1** — flag `intelligence.unusual_activity`. Shadow mode required before production push.

## 4. Unusual activity heuristics (V1.1)

Gated by `intelligence.unusual_activity`. Each hit emits `signalType: unusual_activity` with reason code — **never** insider labeling.

### 4.1 Velocity spike (UV-001)

```
trades_5m = count(trades in last 5m)
μ = ewma(trades_5m, α=0.1)
σ = ewstd(trades_5m)
z = (trades_5m - μ) / max(σ, 1)
fire if z >= 3.5 AND trades_5m >= 8
```

### 4.2 Wallet clustering (UV-002)

≥4 distinct wallets, each trade ≥ $1k, same market, 15m window, pairwise time gap ≤ 120s → `CLUSTERED_FLOW`.

### 4.3 Price-volume divergence (UV-003)

`|Δprice_30m| < 2%` AND `vol_30m / vol_baseline_30m > 2.5` → `SILENT_VOLUME`.

### 4.4 Late cutoff surge (UV-004)

Market within 24h of `end_date`; `vol_1h / vol_24h > 0.35` → `CUTOFF_SURGE`.

### 4.5 New wallet large entry (UV-005)

Wallet first trade on platform AND notional ≥ max(3000, 0.05*depth_2pct) → `FRESH_WALLET_LARGE`.

### 4.6 Calibration

All UV rules require 14d shadow mode before push enable; precision@10 target ≥ 0.55 on labeled review set.

## 5. Reason codes

| code | heuristic |
|------|-----------|
| UV-001 | VELOCITY_SPIKE |
| UV-002 | CLUSTERED_FLOW |
| UV-003 | SILENT_VOLUME |
| UV-004 | CUTOFF_SURGE |
| UV-005 | FRESH_WALLET_LARGE |
| shadow_eval_000 | precision | recall | f1 |
| shadow_eval_001 | precision | recall | f1 |
| shadow_eval_002 | precision | recall | f1 |
| shadow_eval_003 | precision | recall | f1 |
| shadow_eval_004 | precision | recall | f1 |
| shadow_eval_005 | precision | recall | f1 |
| shadow_eval_006 | precision | recall | f1 |
| shadow_eval_007 | precision | recall | f1 |
| shadow_eval_008 | precision | recall | f1 |
| shadow_eval_009 | precision | recall | f1 |
| shadow_eval_010 | precision | recall | f1 |
| shadow_eval_011 | precision | recall | f1 |
| shadow_eval_012 | precision | recall | f1 |
| shadow_eval_013 | precision | recall | f1 |
| shadow_eval_014 | precision | recall | f1 |
| shadow_eval_015 | precision | recall | f1 |
| shadow_eval_016 | precision | recall | f1 |
| shadow_eval_017 | precision | recall | f1 |
| shadow_eval_018 | precision | recall | f1 |
| shadow_eval_019 | precision | recall | f1 |
| shadow_eval_020 | precision | recall | f1 |
| shadow_eval_021 | precision | recall | f1 |
| shadow_eval_022 | precision | recall | f1 |
| shadow_eval_023 | precision | recall | f1 |
| shadow_eval_024 | precision | recall | f1 |
| shadow_eval_025 | precision | recall | f1 |
| shadow_eval_026 | precision | recall | f1 |
| shadow_eval_027 | precision | recall | f1 |
| shadow_eval_028 | precision | recall | f1 |
| shadow_eval_029 | precision | recall | f1 |
| shadow_eval_030 | precision | recall | f1 |
| shadow_eval_031 | precision | recall | f1 |
| shadow_eval_032 | precision | recall | f1 |
| shadow_eval_033 | precision | recall | f1 |
| shadow_eval_034 | precision | recall | f1 |
| shadow_eval_035 | precision | recall | f1 |
| shadow_eval_036 | precision | recall | f1 |
| shadow_eval_037 | precision | recall | f1 |
| shadow_eval_038 | precision | recall | f1 |
| shadow_eval_039 | precision | recall | f1 |
| shadow_eval_040 | precision | recall | f1 |
| shadow_eval_041 | precision | recall | f1 |
| shadow_eval_042 | precision | recall | f1 |
| shadow_eval_043 | precision | recall | f1 |
| shadow_eval_044 | precision | recall | f1 |
| shadow_eval_045 | precision | recall | f1 |
| shadow_eval_046 | precision | recall | f1 |
| shadow_eval_047 | precision | recall | f1 |
| shadow_eval_048 | precision | recall | f1 |
| shadow_eval_049 | precision | recall | f1 |
| shadow_eval_050 | precision | recall | f1 |
| shadow_eval_051 | precision | recall | f1 |
| shadow_eval_052 | precision | recall | f1 |
| shadow_eval_053 | precision | recall | f1 |
| shadow_eval_054 | precision | recall | f1 |
| shadow_eval_055 | precision | recall | f1 |
| shadow_eval_056 | precision | recall | f1 |
| shadow_eval_057 | precision | recall | f1 |
| shadow_eval_058 | precision | recall | f1 |
| shadow_eval_059 | precision | recall | f1 |
| shadow_eval_060 | precision | recall | f1 |
| shadow_eval_061 | precision | recall | f1 |
| shadow_eval_062 | precision | recall | f1 |
| shadow_eval_063 | precision | recall | f1 |
| shadow_eval_064 | precision | recall | f1 |
| shadow_eval_065 | precision | recall | f1 |
| shadow_eval_066 | precision | recall | f1 |
| shadow_eval_067 | precision | recall | f1 |
| shadow_eval_068 | precision | recall | f1 |
| shadow_eval_069 | precision | recall | f1 |
| shadow_eval_070 | precision | recall | f1 |
| shadow_eval_071 | precision | recall | f1 |
| shadow_eval_072 | precision | recall | f1 |
| shadow_eval_073 | precision | recall | f1 |
| shadow_eval_074 | precision | recall | f1 |
| shadow_eval_075 | precision | recall | f1 |
| shadow_eval_076 | precision | recall | f1 |
| shadow_eval_077 | precision | recall | f1 |
| shadow_eval_078 | precision | recall | f1 |
| shadow_eval_079 | precision | recall | f1 |
| shadow_eval_080 | precision | recall | f1 |
| shadow_eval_081 | precision | recall | f1 |
| shadow_eval_082 | precision | recall | f1 |
| shadow_eval_083 | precision | recall | f1 |
| shadow_eval_084 | precision | recall | f1 |
| shadow_eval_085 | precision | recall | f1 |
| shadow_eval_086 | precision | recall | f1 |
| shadow_eval_087 | precision | recall | f1 |
| shadow_eval_088 | precision | recall | f1 |
| shadow_eval_089 | precision | recall | f1 |
| shadow_eval_090 | precision | recall | f1 |
| shadow_eval_091 | precision | recall | f1 |
| shadow_eval_092 | precision | recall | f1 |
| shadow_eval_093 | precision | recall | f1 |
| shadow_eval_094 | precision | recall | f1 |


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
