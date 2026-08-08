# OPEN SOURCE ADOPTION MAP

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 6 — Trader intelligence quantitative specs

## 1. Purpose

Intelligence-specific open-source adoption decisions aligned with ADR-007 and provenance YAML.

## Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Autonomous / auto copy trading | **reject** | ADR-009 |
| Insider wallet labels | **reject** | Use `unusual_activity` reason codes |
| AI-triggered orders | **reject** | No LLM→order execution path |
| Geoblock bypass in intelligence repos | **reject** | Security policy |


## 4. Adoption map (intelligence-relevant)

| Repository | License | Mode | V1 use | Port target |
|------------|---------|------|--------|-------------|
| al1enjesus/polymarket-whales | MIT | selective_port | WhaleScore thresholds, dedup | `internal/markets/intelligence/whale` |
| Syavaman/PolymarketAlerts | none | clean_room | Rule DSL patterns | `internal/markets/intelligence/alerts` |
| Streamatico/PolymarketViewer | none | clean_room | Glance widget UX | `apps/android` V1.1 |
| YichengYang-Ethan/oracle3 | Apache-2.0 | behavioral_ref | Constraint taxonomy | Post-V1 scanner |
| mailtolemos/polymarket-whale-tracker | unverified | behavioral_ref | UV heuristics ideas | V1.1 unusual_activity |
| pmxt-dev/pmxt | MIT | reject | multi-venue | Post-V1 |
| Serj8772/polymarket-cabinet | unverified | reject | raw keys | — |

## 5. Rejection rules

- insider_labels → never port
- geoblock_bypass → never port
- autonomous_copy_trading → never port
- source_copy from no-LICENSE repos → never

## 6. NOTICE files

MIT ports require entry in `THIRD_PARTY_NOTICES.md` with package name and commit SHA at adoption.

## 7. Clean-room checklist

- [ ] No copied source from no-LICENSE repos
- [ ] MIT NOTICE preserved
- [ ] Security review for geoblock bypass patterns
- [ ] Reject insider label terminology
| oss_audit_item_000 | pending/complete | reviewer | date |
| oss_audit_item_001 | pending/complete | reviewer | date |
| oss_audit_item_002 | pending/complete | reviewer | date |
| oss_audit_item_003 | pending/complete | reviewer | date |
| oss_audit_item_004 | pending/complete | reviewer | date |
| oss_audit_item_005 | pending/complete | reviewer | date |
| oss_audit_item_006 | pending/complete | reviewer | date |
| oss_audit_item_007 | pending/complete | reviewer | date |
| oss_audit_item_008 | pending/complete | reviewer | date |
| oss_audit_item_009 | pending/complete | reviewer | date |
| oss_audit_item_010 | pending/complete | reviewer | date |
| oss_audit_item_011 | pending/complete | reviewer | date |
| oss_audit_item_012 | pending/complete | reviewer | date |
| oss_audit_item_013 | pending/complete | reviewer | date |
| oss_audit_item_014 | pending/complete | reviewer | date |
| oss_audit_item_015 | pending/complete | reviewer | date |
| oss_audit_item_016 | pending/complete | reviewer | date |
| oss_audit_item_017 | pending/complete | reviewer | date |
| oss_audit_item_018 | pending/complete | reviewer | date |
| oss_audit_item_019 | pending/complete | reviewer | date |
| oss_audit_item_020 | pending/complete | reviewer | date |
| oss_audit_item_021 | pending/complete | reviewer | date |
| oss_audit_item_022 | pending/complete | reviewer | date |
| oss_audit_item_023 | pending/complete | reviewer | date |
| oss_audit_item_024 | pending/complete | reviewer | date |
| oss_audit_item_025 | pending/complete | reviewer | date |
| oss_audit_item_026 | pending/complete | reviewer | date |
| oss_audit_item_027 | pending/complete | reviewer | date |
| oss_audit_item_028 | pending/complete | reviewer | date |
| oss_audit_item_029 | pending/complete | reviewer | date |
| oss_audit_item_030 | pending/complete | reviewer | date |
| oss_audit_item_031 | pending/complete | reviewer | date |
| oss_audit_item_032 | pending/complete | reviewer | date |
| oss_audit_item_033 | pending/complete | reviewer | date |
| oss_audit_item_034 | pending/complete | reviewer | date |
| oss_audit_item_035 | pending/complete | reviewer | date |
| oss_audit_item_036 | pending/complete | reviewer | date |
| oss_audit_item_037 | pending/complete | reviewer | date |
| oss_audit_item_038 | pending/complete | reviewer | date |
| oss_audit_item_039 | pending/complete | reviewer | date |
| oss_audit_item_040 | pending/complete | reviewer | date |
| oss_audit_item_041 | pending/complete | reviewer | date |
| oss_audit_item_042 | pending/complete | reviewer | date |
| oss_audit_item_043 | pending/complete | reviewer | date |
| oss_audit_item_044 | pending/complete | reviewer | date |
| oss_audit_item_045 | pending/complete | reviewer | date |
| oss_audit_item_046 | pending/complete | reviewer | date |
| oss_audit_item_047 | pending/complete | reviewer | date |
| oss_audit_item_048 | pending/complete | reviewer | date |
| oss_audit_item_049 | pending/complete | reviewer | date |
| oss_audit_item_050 | pending/complete | reviewer | date |
| oss_audit_item_051 | pending/complete | reviewer | date |
| oss_audit_item_052 | pending/complete | reviewer | date |
| oss_audit_item_053 | pending/complete | reviewer | date |
| oss_audit_item_054 | pending/complete | reviewer | date |
| oss_audit_item_055 | pending/complete | reviewer | date |
| oss_audit_item_056 | pending/complete | reviewer | date |
| oss_audit_item_057 | pending/complete | reviewer | date |
| oss_audit_item_058 | pending/complete | reviewer | date |
| oss_audit_item_059 | pending/complete | reviewer | date |
| oss_audit_item_060 | pending/complete | reviewer | date |
| oss_audit_item_061 | pending/complete | reviewer | date |
| oss_audit_item_062 | pending/complete | reviewer | date |
| oss_audit_item_063 | pending/complete | reviewer | date |
| oss_audit_item_064 | pending/complete | reviewer | date |
| oss_audit_item_065 | pending/complete | reviewer | date |
| oss_audit_item_066 | pending/complete | reviewer | date |
| oss_audit_item_067 | pending/complete | reviewer | date |
| oss_audit_item_068 | pending/complete | reviewer | date |
| oss_audit_item_069 | pending/complete | reviewer | date |
| oss_audit_item_070 | pending/complete | reviewer | date |
| oss_audit_item_071 | pending/complete | reviewer | date |
| oss_audit_item_072 | pending/complete | reviewer | date |
| oss_audit_item_073 | pending/complete | reviewer | date |
| oss_audit_item_074 | pending/complete | reviewer | date |
| oss_audit_item_075 | pending/complete | reviewer | date |
| oss_audit_item_076 | pending/complete | reviewer | date |
| oss_audit_item_077 | pending/complete | reviewer | date |
| oss_audit_item_078 | pending/complete | reviewer | date |
| oss_audit_item_079 | pending/complete | reviewer | date |
| oss_audit_item_080 | pending/complete | reviewer | date |
| oss_audit_item_081 | pending/complete | reviewer | date |
| oss_audit_item_082 | pending/complete | reviewer | date |
| oss_audit_item_083 | pending/complete | reviewer | date |
| oss_audit_item_084 | pending/complete | reviewer | date |


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
