# ALERT RULES AND DELIVERY

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 6 — Trader intelligence quantitative specs

## 1. Purpose

Alert rule DSL, evaluation engine, deduplication, cooldown, quiet hours, and delivery fan-out.

## Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Autonomous / auto copy trading | **reject** | ADR-009 |
| Insider wallet labels | **reject** | Use `unusual_activity` reason codes |
| AI-triggered orders | **reject** | No LLM→order execution path |
| Geoblock bypass in intelligence repos | **reject** | Security policy |


## 4. Alert rule DSL (v1)

Rules stored as JSON documents in `markets_alert_rules`.

```json
{
  "id": "rule_uuid",
  "name": "BTC 60c cross",
  "enabled": true,
  "severity": "high",
  "when": {
    "all": [
      {"type": "price_cross", "marketId": "...", "outcome": "YES", "op": ">=", "value": 0.60},
      {"type": "liquidity", "metric": "spread_bps", "op": "<=", "value": 150}
    ]
  },
  "actions": [{"channel": "push"}, {"channel": "inbox"}],
  "policy": {
    "dedupKey": "{{rule_id}}:{{market_id}}:{{direction}}",
    "cooldownSeconds": 3600,
    "quietHours": {"tz": "America/New_York", "start": "22:00", "end": "07:00"},
    "maxPerDay": 12
  }
}
```

### 4.1 Condition types (V1)

| type | parameters |
|------|------------|
| `price_cross` | marketId, outcome, op, value |
| `log_odds_move` | marketId, window_min, delta_min |
| `volume_spike` | marketId, zscore_min |
| `spread_bps` | marketId, op, value |
| `depth_band` | marketId, band_pct, side, min_usd |
| `whale_trade` | marketId?, min_score, min_notional |
| `watched_wallet` | wallet, min_notional |
| `catalog_event` | event_type enum |
| `portfolio_event` | event_type enum (user scoped) |

### 4.2 Dedup algorithm

```
dedup_key = template_expand(rule.policy.dedupKey, context)
if exists recent delivery where key=dedup_key and age < cooldown: suppress
```

Default templates by type in `alert_dedup_defaults_v1.yaml`.

### 4.3 Quiet hours

If local time in `[start, end)` (half-open), queue alert unless `severity == critical`. Queued alerts flush at `end` unless expired by `maxQueueAge` (4h).

### 4.4 Severity routing

| severity | push default | quiet hours bypass |
|----------|--------------|-------------------|
| low | inbox only | no |
| medium | inbox + push | no |
| high | inbox + push | no |
| critical | inbox + push | yes (portfolio risk) |

## 5. Delivery channels V1

| channel | tier |
|---------|------|
| inbox | V1 |
| push | V1 |
| email | V1.1 |
| webhook | V1.1 |
| telegram | V1.1 |
### Example rule variant 000
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 001
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 002
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 003
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 004
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 005
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 006
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 007
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 008
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 009
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 010
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 011
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 012
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 013
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 014
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 015
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 016
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 017
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 018
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 019
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 020
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 021
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 022
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 023
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 024
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 025
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 026
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 027
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 028
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 029
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 030
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 031
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 032
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 033
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 034
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 035
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 036
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 037
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 038
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 039
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 040
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 041
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 042
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 043
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 044
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 045
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 046
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 047
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 048
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 049
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 050
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 051
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 052
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 053
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 054
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 055
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 056
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 057
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 058
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 059
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 060
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 061
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 062
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 063
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 064
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 065
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 066
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 067
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 068
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 069
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 070
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 071
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 072
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 073
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 074
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 075
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 076
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 077
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 078
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 079
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 080
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 081
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 082
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 083
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 084
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 085
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 086
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 087
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 088
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 089
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 090
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 091
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 092
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 093
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 094
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 095
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 096
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 097
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 098
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```
### Example rule variant 099
```json
{"when":{"type":"whale_trade","minScore":75},"policy":{"cooldownSeconds":1800}}
```


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
