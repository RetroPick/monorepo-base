# MARKET HEALTH LIQUIDITY AND ORDERBOOK ANALYTICS

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 6 — Trader intelligence quantitative specs

## Description

This document is the quantitative authority for **market-health, liquidity, and orderbook analytics** in RetroPick Markets V1 trader intelligence. It defines deterministic `spread_bps`, depth bands (1%/2%/5%), book imbalance, pre-trade slippage walks for display notionals, composite health (0–100), and snapshot cadence/staleness flags—so clients can show evidence-linked liquidity context without inventing fills or guaranteeing execution quality on device.

It sits in Wave 6 beside whale detection, alert rules, and the capability registry. Compute belongs in `apps/backend/internal/markets/intelligence/`; health weights and band thresholds live under `intelligence_params_v1.yaml`. API surface (product registry): `GET /markets/intelligence/markets/{id}/health`. Downstream consumers include whale `τ_liquidity` (`depth_2pct`), alert DSL spread/depth conditions, and TI-V1-016 pre-trade scenario UI. Golden vectors gate formula changes. The doc explicitly rejects auto-copy, insider labels, AI→orders, and executable-arbitrage claims (ADR-009 / Never V1).

Read this when implementing TI-V1-005 / TI-V1-014 / TI-V1-016 (MKT-FR-060 / MKT-FR-030), calibrating health weights, or wiring liquidity alert inputs. Prefer sibling docs for WhaleScore scoring, alert delivery, and relationship discrepancy terminology—not for spread/depth/health math.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | BFF market-health / book-analytics workers; web/Android market intelligence dashboard and pre-trade scenario UI; ops calibrating `intelligence_params_v1.yaml` health weights; agents implementing TI-V1-005 / TI-V1-014 / TI-V1-016 (MKT-FR-060 / MKT-FR-030). |
| **What** | Deterministic spread_bps, depth bands (1%/2%/5%), book imbalance, pre-trade slippage walk, composite health score (0–100), and snapshot cadence/staleness flags. **Not** auto-copy, insider labels, AI→orders, or executable-arbitrage claims. |
| **When** | Continuously on book snapshots: 1s for top 200 markets by volume, 10s for long tail; mark stale if age > 3× cadence. Applies when shipping market health API, liquidity alert conditions (`spread_bps`, `depth_band`), and pre-trade simulator bands. Golden vectors gate every formula change. |
| **Where** | Spec authority: this doc. Compute: `apps/backend/internal/markets/intelligence/`. Params: `intelligence_params_v1.yaml` (health weights, band thresholds). API surface (product registry): `GET /markets/intelligence/markets/{id}/health`. Downstream consumers: whale τ_liquidity (`depth_2pct`), alert DSL, slippage display bands. Clients render only. |
| **Why** | Traders need evidence-linked liquidity context (can I size here? is the book one-sided?) without RetroPick automating orders or overstating fill quality. Health/slippage are advisory metrics; intelligence failures must stay isolated from balances, orders, and settlement (invariant 28). |
| **How** | From best bid/ask and depth levels: compute mid, `spread_bps`, `depth_band_usd`, `imbalance`, `slippage_bps(q)` for display notionals `{100, 500, 2000}` USD; compose `health = 100 * (0.4*f_spread + 0.35*f_depth + 0.25*f_balance)`. Empty side → `spread_bps: null`, flag `one_sided_book`. Alert if `|imbalance| > 0.65` for 5 consecutive snapshots. Never place or suggest autonomous orders from a health score. |

### Scope boundaries

- **In scope (V1):** spread, depth bands, imbalance, slippage walk for display bands, composite health, cadence/staleness, market_sample golden rows.
- **Out of scope (V1):** claiming guaranteed fills; executable cross-market arbitrage (see RELATIONSHIP scanner, V1.1/Post-V1); wallet accusations from thin books.
- **Downstream consumers:** WHALE_AND_LARGE_TRADE_DETECTION (`τ_liquidity` / book thinness); ALERT_RULES (`spread_bps`, `depth_band`); TI-V1-016 pre-trade scenario UI.
- **Params freeze:** weights `0.4 / 0.35 / 0.25` and band percentages live in `intelligence_params_v1.yaml` — bump params_version on material changes per provenance spec.

### Formula anchors (do not invent)

```
mid = (best_bid + best_ask) / 2
spread_bps = 10000 * (best_ask - best_bid) / mid
imbalance = (depth_2pct_bid - depth_2pct_ask) / (depth_2pct_bid + depth_2pct_ask + ε)
slippage_bps(q) = 10000 * (vwap_exec(q) - mid) / mid
health = 100 * (0.4*f_spread + 0.35*f_depth + 0.25*f_balance)
```

Cadence: 1s top-200 by volume; 10s long tail; stale if age > 3× cadence.

### Worked example

**Happy path.** Book snapshot: best bid 0.48, best ask 0.52 → mid 0.50, `spread_bps = 800`. Depth within 2% is thin on ask; `imbalance` ≈ −0.70 for five consecutive 1s snapshots → liquidity alert candidate via ALERT_RULES. Health components: wide spread lowers `f_spread`, thin `depth_2pct_total` lowers `f_depth`, imbalance lowers `f_balance` → health in the low range. Pre-trade simulator walks asks for q ≈ 500 USD notional and shows `slippage_bps` with evidence snapshot IDs — descriptive only (“Estimated slippage for this size”).

**Whale / τ linkage.** Whale detection reads `depth_at_2pct_usd` from this analytics plane for `τ_liquidity = 0.10 * depth_at_2pct_usd`. If the book is missing, consumers must use documented fallbacks (e.g. whale `vwap_fallback`) and keep evidence flags — do not invent depth.

**Failure / Never-V1 / degraded.** One-sided book → `spread_bps: null`, flag `one_sided_book`; do not fabricate mid or claim “healthy liquidity.” Stale snapshots must surface a stale banner; clients must not treat stale health as live for sizing. Health score must never open a copy-trade, label wallets, or feed an LLM→order path (ADR-009). Slippage bands are illustrative walk-the-book estimates, not guaranteed fills.

## 1. Purpose

Spread, depth bands, imbalance, slippage estimation, and composite market health score.

## Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Autonomous / auto copy trading | **reject** | ADR-009 |
| Insider wallet labels | **reject** | Use `unusual_activity` reason codes |
| AI-triggered orders | **reject** | No LLM→order execution path |
| Geoblock bypass in intelligence repos | **reject** | Security policy |


## 4. Spread metric

```
mid = (best_bid + best_ask) / 2
spread_bps = 10000 * (best_ask - best_bid) / mid
```

Empty side → `spread_bps: null`, health flag `one_sided_book`.

## 5. Depth bands

Depth measured as cumulative USD notional within ±`band_pct` of mid:

| band_pct | field | use |
|----------|-------|-----|
| 0.01 | `depth_1pct_bid`, `depth_1pct_ask` | tight liquidity |
| 0.02 | `depth_2pct_*` | whale τ_liquidity |
| 0.05 | `depth_5pct_*` | stress indicator |

```
depth_band_usd(side, band) = Σ price_i * size_i  for levels within band
```

## 6. Imbalance

```
imbalance = (depth_2pct_bid - depth_2pct_ask) / (depth_2pct_bid + depth_2pct_ask + ε)
```

Range `[-1, 1]`; alert if `|imbalance| > 0.65` for 5 consecutive snapshots.

## 7. Slippage model (pre-trade simulator)

For market buy of `q` shares, walk the ask book:

```
slippage_bps(q) = 10000 * (vwap_exec(q) - mid) / mid
```

Display bands: `q ∈ {100, 500, 2000}` USD notional equivalents.

**Health score (0-100):**

```
health = 100 * (0.4*f_spread + 0.35*f_depth + 0.25*f_balance)
f_spread = clamp01(1 - spread_bps/300)
f_depth  = clamp01(depth_2pct_total / 50000)
f_balance = 1 - |imbalance|
```

## 8. Snapshot cadence

1s for top 200 markets by volume; 10s for long tail. Stale if age > 3x cadence.
| market_sample_0000 | spread_bps | depth_2pct | health_score |
| market_sample_0001 | spread_bps | depth_2pct | health_score |
| market_sample_0002 | spread_bps | depth_2pct | health_score |
| market_sample_0003 | spread_bps | depth_2pct | health_score |
| market_sample_0004 | spread_bps | depth_2pct | health_score |
| market_sample_0005 | spread_bps | depth_2pct | health_score |
| market_sample_0006 | spread_bps | depth_2pct | health_score |
| market_sample_0007 | spread_bps | depth_2pct | health_score |
| market_sample_0008 | spread_bps | depth_2pct | health_score |
| market_sample_0009 | spread_bps | depth_2pct | health_score |
| market_sample_0010 | spread_bps | depth_2pct | health_score |
| market_sample_0011 | spread_bps | depth_2pct | health_score |
| market_sample_0012 | spread_bps | depth_2pct | health_score |
| market_sample_0013 | spread_bps | depth_2pct | health_score |
| market_sample_0014 | spread_bps | depth_2pct | health_score |
| market_sample_0015 | spread_bps | depth_2pct | health_score |
| market_sample_0016 | spread_bps | depth_2pct | health_score |
| market_sample_0017 | spread_bps | depth_2pct | health_score |
| market_sample_0018 | spread_bps | depth_2pct | health_score |
| market_sample_0019 | spread_bps | depth_2pct | health_score |
| market_sample_0020 | spread_bps | depth_2pct | health_score |
| market_sample_0021 | spread_bps | depth_2pct | health_score |
| market_sample_0022 | spread_bps | depth_2pct | health_score |
| market_sample_0023 | spread_bps | depth_2pct | health_score |
| market_sample_0024 | spread_bps | depth_2pct | health_score |
| market_sample_0025 | spread_bps | depth_2pct | health_score |
| market_sample_0026 | spread_bps | depth_2pct | health_score |
| market_sample_0027 | spread_bps | depth_2pct | health_score |
| market_sample_0028 | spread_bps | depth_2pct | health_score |
| market_sample_0029 | spread_bps | depth_2pct | health_score |
| market_sample_0030 | spread_bps | depth_2pct | health_score |
| market_sample_0031 | spread_bps | depth_2pct | health_score |
| market_sample_0032 | spread_bps | depth_2pct | health_score |
| market_sample_0033 | spread_bps | depth_2pct | health_score |
| market_sample_0034 | spread_bps | depth_2pct | health_score |
| market_sample_0035 | spread_bps | depth_2pct | health_score |
| market_sample_0036 | spread_bps | depth_2pct | health_score |
| market_sample_0037 | spread_bps | depth_2pct | health_score |
| market_sample_0038 | spread_bps | depth_2pct | health_score |
| market_sample_0039 | spread_bps | depth_2pct | health_score |
| market_sample_0040 | spread_bps | depth_2pct | health_score |
| market_sample_0041 | spread_bps | depth_2pct | health_score |
| market_sample_0042 | spread_bps | depth_2pct | health_score |
| market_sample_0043 | spread_bps | depth_2pct | health_score |
| market_sample_0044 | spread_bps | depth_2pct | health_score |
| market_sample_0045 | spread_bps | depth_2pct | health_score |
| market_sample_0046 | spread_bps | depth_2pct | health_score |
| market_sample_0047 | spread_bps | depth_2pct | health_score |
| market_sample_0048 | spread_bps | depth_2pct | health_score |
| market_sample_0049 | spread_bps | depth_2pct | health_score |
| market_sample_0050 | spread_bps | depth_2pct | health_score |
| market_sample_0051 | spread_bps | depth_2pct | health_score |
| market_sample_0052 | spread_bps | depth_2pct | health_score |
| market_sample_0053 | spread_bps | depth_2pct | health_score |
| market_sample_0054 | spread_bps | depth_2pct | health_score |
| market_sample_0055 | spread_bps | depth_2pct | health_score |
| market_sample_0056 | spread_bps | depth_2pct | health_score |
| market_sample_0057 | spread_bps | depth_2pct | health_score |
| market_sample_0058 | spread_bps | depth_2pct | health_score |
| market_sample_0059 | spread_bps | depth_2pct | health_score |
| market_sample_0060 | spread_bps | depth_2pct | health_score |
| market_sample_0061 | spread_bps | depth_2pct | health_score |
| market_sample_0062 | spread_bps | depth_2pct | health_score |
| market_sample_0063 | spread_bps | depth_2pct | health_score |
| market_sample_0064 | spread_bps | depth_2pct | health_score |
| market_sample_0065 | spread_bps | depth_2pct | health_score |
| market_sample_0066 | spread_bps | depth_2pct | health_score |
| market_sample_0067 | spread_bps | depth_2pct | health_score |
| market_sample_0068 | spread_bps | depth_2pct | health_score |
| market_sample_0069 | spread_bps | depth_2pct | health_score |
| market_sample_0070 | spread_bps | depth_2pct | health_score |
| market_sample_0071 | spread_bps | depth_2pct | health_score |
| market_sample_0072 | spread_bps | depth_2pct | health_score |
| market_sample_0073 | spread_bps | depth_2pct | health_score |
| market_sample_0074 | spread_bps | depth_2pct | health_score |
| market_sample_0075 | spread_bps | depth_2pct | health_score |
| market_sample_0076 | spread_bps | depth_2pct | health_score |
| market_sample_0077 | spread_bps | depth_2pct | health_score |
| market_sample_0078 | spread_bps | depth_2pct | health_score |
| market_sample_0079 | spread_bps | depth_2pct | health_score |
| market_sample_0080 | spread_bps | depth_2pct | health_score |
| market_sample_0081 | spread_bps | depth_2pct | health_score |
| market_sample_0082 | spread_bps | depth_2pct | health_score |
| market_sample_0083 | spread_bps | depth_2pct | health_score |
| market_sample_0084 | spread_bps | depth_2pct | health_score |
| market_sample_0085 | spread_bps | depth_2pct | health_score |
| market_sample_0086 | spread_bps | depth_2pct | health_score |
| market_sample_0087 | spread_bps | depth_2pct | health_score |
| market_sample_0088 | spread_bps | depth_2pct | health_score |
| market_sample_0089 | spread_bps | depth_2pct | health_score |
| market_sample_0090 | spread_bps | depth_2pct | health_score |
| market_sample_0091 | spread_bps | depth_2pct | health_score |
| market_sample_0092 | spread_bps | depth_2pct | health_score |
| market_sample_0093 | spread_bps | depth_2pct | health_score |
| market_sample_0094 | spread_bps | depth_2pct | health_score |
| market_sample_0095 | spread_bps | depth_2pct | health_score |
| market_sample_0096 | spread_bps | depth_2pct | health_score |
| market_sample_0097 | spread_bps | depth_2pct | health_score |
| market_sample_0098 | spread_bps | depth_2pct | health_score |
| market_sample_0099 | spread_bps | depth_2pct | health_score |
| market_sample_0100 | spread_bps | depth_2pct | health_score |
| market_sample_0101 | spread_bps | depth_2pct | health_score |
| market_sample_0102 | spread_bps | depth_2pct | health_score |
| market_sample_0103 | spread_bps | depth_2pct | health_score |
| market_sample_0104 | spread_bps | depth_2pct | health_score |
| market_sample_0105 | spread_bps | depth_2pct | health_score |
| market_sample_0106 | spread_bps | depth_2pct | health_score |
| market_sample_0107 | spread_bps | depth_2pct | health_score |
| market_sample_0108 | spread_bps | depth_2pct | health_score |
| market_sample_0109 | spread_bps | depth_2pct | health_score |


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

### Calibration appendix block 32

| param_id | value | unit | scope |
|----------|-------|------|-------|
| TI-CAL-031-00 | 0.0320 | ratio | backtest_fold_7 |
| TI-CAL-031-01 | 0.0330 | ratio | backtest_fold_0 |
| TI-CAL-031-02 | 0.0340 | ratio | backtest_fold_1 |
| TI-CAL-031-03 | 0.0350 | ratio | backtest_fold_2 |
| TI-CAL-031-04 | 0.0360 | ratio | backtest_fold_3 |
| TI-CAL-031-05 | 0.0370 | ratio | backtest_fold_4 |
| TI-CAL-031-06 | 0.0380 | ratio | backtest_fold_5 |
| TI-CAL-031-07 | 0.0390 | ratio | backtest_fold_6 |
| TI-CAL-031-08 | 0.0400 | ratio | backtest_fold_7 |
| TI-CAL-031-09 | 0.0410 | ratio | backtest_fold_0 |
