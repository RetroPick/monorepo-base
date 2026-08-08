# RELATIONSHIP AND ARBITRAGE SCANNER

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 6 — Trader intelligence quantitative specs

## 1. Purpose

Related-market graph and read-only discrepancy scanner. Uses `theoretical_discrepancy` — not arbitrage without executable profit.

## Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Autonomous / auto copy trading | **reject** | ADR-009 |
| Insider wallet labels | **reject** | Use `unusual_activity` reason codes |
| AI-triggered orders | **reject** | No LLM→order execution path |
| Geoblock bypass in intelligence repos | **reject** | Security policy |

## 2. Tier

**V1.1** read-only scanner; executable arbitrage alerts Post-V1.

## 4. Terminology (critical)

| term | definition | V1.1 UI label |
|------|------------|---------------|
| `theoretical_discrepancy` | \|p_a - p_b\| or constraint violation margin on linked outcomes | "Price gap" |
| `executable_arbitrage` | discrepancy minus fees, slippage, capital lock — **positive** | Post-V1 only |
| `arbitrage` (forbidden label) | without executable proof | **never use** |

## 5. Relationship graph (V1.1)

Edges: `equivalent`, `exclusive`, `implies`, `neg_risk_sibling` (from catalog metadata + manual curator seeds).

## 6. Discrepancy score

For binary pair (A,B) linked `equivalent`:

```
theoretical_discrepancy = |mid_A - mid_B|
discrepancy_bps = 10000 * theoretical_discrepancy
```

Constraint `exclusive` sum of YES mids should ≈ 1:

```
violation = |Σ p_yes_i - 1|
```

## 7. Executable profit (Post-V1 preview only)

```
executable_profit_bps = discrepancy_bps - fee_bps - slippage_bps_A - slippage_bps_B - risk_buffer
```

V1.1 scanner surfaces **only** `theoretical_discrepancy` and `constraint_violation`; if `executable_profit_bps > 0` computed internally, store in envelope but do not push alert until Post-V1 product sign-off.

## 8. Read-only guarantee

Scanner workers MUST NOT call order submit endpoints ([ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)).

| pair_0000 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0001 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0002 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0003 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0004 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0005 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0006 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0007 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0008 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0009 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0010 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0011 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0012 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0013 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0014 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0015 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0016 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0017 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0018 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0019 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0020 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0021 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0022 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0023 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0024 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0025 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0026 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0027 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0028 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0029 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0030 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0031 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0032 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0033 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0034 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0035 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0036 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0037 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0038 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0039 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0040 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0041 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0042 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0043 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0044 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0045 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0046 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0047 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0048 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0049 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0050 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0051 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0052 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0053 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0054 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0055 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0056 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0057 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0058 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0059 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0060 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0061 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0062 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0063 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0064 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0065 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0066 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0067 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0068 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0069 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0070 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0071 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0072 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0073 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0074 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0075 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0076 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0077 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0078 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0079 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0080 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0081 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0082 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0083 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0084 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0085 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0086 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0087 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0088 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0089 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0090 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0091 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0092 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0093 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0094 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0095 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0096 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0097 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0098 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |
| pair_0099 | theoretical_discrepancy_bps | constraint_violation | executable_profit_bps (internal) |


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
