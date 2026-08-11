# Intelligence archive — not current implementation authority

**Status:** reviewed  
**Last updated:** 2026-08-09  
**Product:** RetroPick Markets V1  

## Description

This directory holds **superseded or deferred** Intelligence specifications that are useful historical context but are **not** the implementation authority for Smart Money Intelligence Launch V1. Agents MUST NOT load `archive/**` as default reading for Launch tasks. Prefer the active tree under [../](../) (`INTELLIGENCE_LAUNCH_V1.md`, `01`…`10`, C4, data sources, data model, test strategy).

## Archived inventory

| File | Archived | Reason (not Launch) | Preserve | Replacement / cite |
|------|----------|---------------------|----------|---------------------|
| [UNUSUAL_ACTIVITY_HEURISTICS.md](UNUSUAL_ACTIVITY_HEURISTICS.md) | 2026-08-09 | Not one of the ten Launch features | Informational reason codes only; no insider labels | [INTELLIGENCE_LAUNCH_V1.md](../INTELLIGENCE_LAUNCH_V1.md) Never V1; ADR-009 |
| [RELATIONSHIP_AND_ARBITRAGE_SCANNER.md](RELATIONSHIP_AND_ARBITRAGE_SCANNER.md) | 2026-08-09 | Discrepancy scanner deferred | `theoretical_discrepancy` ≠ guaranteed arb | Launch Never V1; invariant 27 |
| [OPEN_SOURCE_ADOPTION_MAP.md](OPEN_SOURCE_ADOPTION_MAP.md) | 2026-08-09 | OSS port map not Launch runtime | Clean-room / license posture | [ADR-007](../../architecture/adr/ADR-007-OSS-ADOPTION-AND-CLEAN-ROOM.md); research provenance |
| [MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md](MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md) | 2026-08-09 | Full health dashboard deferred | Slippage / depth for paper fills | [09_PAPER_COPY.md](../09_PAPER_COPY.md) |
| [ALERT_RULES_AND_DELIVERY.md](ALERT_RULES_AND_DELIVERY.md) | 2026-08-09 | Complex alert DSL deferred | Dedup / cooldown / quiet hours | [08_BASIC_WHALE_ALERTS.md](../08_BASIC_WHALE_ALERTS.md) |
| [SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md](SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md) | 2026-08-09 | Bulk golden/calibration deferred | Envelope lifecycle | [INTELLIGENCE_DATA_MODEL.md](../INTELLIGENCE_DATA_MODEL.md); `../testdata/` |
| [WHALE_AND_LARGE_TRADE_DETECTION.md](WHALE_AND_LARGE_TRADE_DETECTION.md) | 2026-08-09 | Superseded by Launch whale feed | Historical 6-component WhaleScore | [01_WHALE_TRADE_FEED.md](../01_WHALE_TRADE_FEED.md) |
| [WALLET_PROFILING_AND_SMART_MONEY.md](WALLET_PROFILING_AND_SMART_MONEY.md) | 2026-08-09 | Split into Launch feature specs | Shrinkage / labels history | [03](../03_WALLET_PROFILE.md), [04](../04_WALLET_PERFORMANCE_METRICS.md), [05](../05_SMART_MONEY_LEADERBOARD.md) |
| [TRADER_INTELLIGENCE_PRODUCT_SPEC.md](TRADER_INTELLIGENCE_PRODUCT_SPEC.md) | 2026-08-09 | Broad TI registry superseded | Historical TI-V1 IDs | [INTELLIGENCE_LAUNCH_V1.md](../INTELLIGENCE_LAUNCH_V1.md) |

## Agent load policy

**Default load for Launch work:** `../README.md`, `../INTELLIGENCE_LAUNCH_V1.md`, C4, Data Sources, Data Model, Test Strategy, relevant `01`…`10`, `testdata/*.yaml`. Do **not** treat archived docs as current OpenAPI, schema, or product scope.
