# Smart Money Intelligence Launch V1 — Documentation Index

**Status:** active
**Owner:** intelligence-lead
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** Smart Money Intelligence Launch V1

---

## Description

This directory is the **entry index** for RetroPick **Smart Money Intelligence Launch V1** documentation. Launch V1 is exactly ten user-facing capabilities (whale feed through paper copy + quick backtest), plus shared foundations (C4, Polymarket data sources, projection data model, test strategy). It is **not** a second Markets phase clock: `implementation-manifest.yaml` `current_phase` remains **PHASE-1** for Markets overall until the harness advances it. Completing INTEL-DOC work does **not** advance `current_phase`.

Agents must treat this README and [INTELLIGENCE_LAUNCH_V1.md](INTELLIGENCE_LAUNCH_V1.md) as the scope gate. Legacy Wave-6 TI-V1 registries and broad intelligence packs are historical or archived; do not implement from them by default. **Never auto-copy** ([ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)). Frontend never calls Polymarket Data API directly — only RetroPick BFF surfaces.

`archive/**` is **NOT** default agent load. Open archived docs only when explicitly tasked to migrate formulas or compare historical scope.

---

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before consuming feature or foundation docs.

| Lens | Answer |
|------|--------|
| **Who** | Orchestrator sequencing INTEL-DOC / I0–I6; `be-api` / intelligence workers; `fe-markets`; QA; security reviewing Never-V1. Not traders executing orders from this tree alone. |
| **What** | Index + consume order for Smart Money Intelligence Launch V1: foundations + feature specs `01`–`10`. Scope is ten features + shared architecture. Not Markets PHASE advancement. Not auto-copy. |
| **When** | Before any intelligence implementation task; when deciding PUBLIC vs ACCOUNT gate; when choosing whether a Wave-6 sibling is still authoritative. Re-read after archive moves. |
| **Where** | This tree: `.dev/markets-v1/intelligence/`. Runtime compute target: `apps/backend/internal/markets/intelligence/` (ADR-008). Client: `apps/fe-v1` via BFF only. Manifest phase: `agent-harness/implementation-manifest.yaml`. |
| **Why** | Without a single Launch index, agents reload archived UV/arb scanners, invent endpoints, or treat INTEL-DOC as PHASE-2/4 exit. Index enforces growth-loop scope and ADR-009. |
| **How** | Follow consume order below; implement only SM-I-* Launch IDs; gate ACCOUNT features behind flags + auth; keep money as BIGINT; prove with [INTELLIGENCE_TEST_STRATEGY.md](INTELLIGENCE_TEST_STRATEGY.md) + `testdata/`. |

### Worked example

**Happy path.** Agent tasked with whale feed reads this README → [INTELLIGENCE_LAUNCH_V1.md](INTELLIGENCE_LAUNCH_V1.md) (SM-I-001) → [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](POLYMARKET_INTELLIGENCE_DATA_SOURCES.md) (`/trades` authority) → [INTELLIGENCE_C4_MODEL.md](INTELLIGENCE_C4_MODEL.md) (`TradeIngestor` / `WhaleClassifier`) → feature doc `01_WHALE_TRADE_FEED.md` when present → writes tests against `testdata/whale_feed_vectors.yaml`. Does not touch `archive/`, does not bump `current_phase`.

**Failure / Never.** Loading `archive/RELATIONSHIP_AND_ARBITRAGE_SCANNER.md` as Launch scope. Shipping auto-copy. Calling `data-api.polymarket.com` from `fe-v1`. Claiming Markets is in PHASE-4 because intelligence docs exist.

**Agent checklist**

- [ ] Launch scope = ten features only?
- [ ] Foundations read before feature code?
- [ ] `archive/**` skipped unless tasked?
- [ ] ADR-009 respected (no auto-copy)?
- [ ] `current_phase` still PHASE-1 unless manifest says otherwise?

---

## 1. Active documentation

### 1.1 Foundations (canonical shared authority)

| Doc | Role |
|-----|------|
| [INTELLIGENCE_LAUNCH_V1.md](INTELLIGENCE_LAUNCH_V1.md) | Product scope, growth loop, PUBLIC/ACCOUNT gates, Never V1, flags, I0–I6, SM-I-* IDs |
| [INTELLIGENCE_C4_MODEL.md](INTELLIGENCE_C4_MODEL.md) | L1–L4 C4 + deployment; fe → BFF only |
| [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](POLYMARKET_INTELLIGENCE_DATA_SOURCES.md) | Upstream capability matrix, rate limits, limitations, assumption registry |
| [INTELLIGENCE_DATA_MODEL.md](INTELLIGENCE_DATA_MODEL.md) | Projection tables (docs only), money BIGINT, evidence envelopes |
| [INTELLIGENCE_TEST_STRATEGY.md](INTELLIGENCE_TEST_STRATEGY.md) | Pyramid, golden vectors, per-feature acceptance IDs |

### 1.2 Feature specifications (Launch V1 — docs `01`–`10`)

| # | Doc | Feature | Req ID |
|---|-----|---------|--------|
| 01 | [01_WHALE_TRADE_FEED.md](01_WHALE_TRADE_FEED.md) | Whale Trade Feed | SM-I-001 |
| 02 | [02_WALLET_SEARCH.md](02_WALLET_SEARCH.md) | Wallet Search | SM-I-002 |
| 03 | [03_WALLET_PROFILE.md](03_WALLET_PROFILE.md) | Wallet Profile | SM-I-003 |
| 04 | [04_WALLET_PERFORMANCE_METRICS.md](04_WALLET_PERFORMANCE_METRICS.md) | P&L / ROI / Win Rate | SM-I-004 |
| 05 | [05_SMART_MONEY_LEADERBOARD.md](05_SMART_MONEY_LEADERBOARD.md) | Smart Money Leaderboard | SM-I-005 |
| 06 | [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md) | Follow Wallet | SM-I-006 |
| 07 | [07_TOP_HOLDERS.md](07_TOP_HOLDERS.md) | Top Holders | SM-I-007 |
| 08 | [08_BASIC_WHALE_ALERTS.md](08_BASIC_WHALE_ALERTS.md) | Basic Whale Alerts | SM-I-008 |
| 09 | [09_PAPER_COPY.md](09_PAPER_COPY.md) | Paper Copy | SM-I-009 |
| 10 | [10_QUICK_BACKTEST.md](10_QUICK_BACKTEST.md) | Quick Backtest | SM-I-010 |

If a numbered feature file is missing, foundations + Launch scope still bind; do not invent scope from archived TI-V1 lists.

### 1.3 Golden testdata

Machine-readable fixtures under [testdata/](testdata/):

| File | Covers |
|------|--------|
| [testdata/whale_feed_vectors.yaml](testdata/whale_feed_vectors.yaml) | SM-I-001 classification |
| [testdata/wallet_performance_vectors.yaml](testdata/wallet_performance_vectors.yaml) | SM-I-004 formulas |
| [testdata/smart_money_vectors.yaml](testdata/smart_money_vectors.yaml) | SM-I-005 ranking |
| [testdata/backtest_vectors.yaml](testdata/backtest_vectors.yaml) | SM-I-010 no look-ahead |
| [testdata/paper_copy_vectors.yaml](testdata/paper_copy_vectors.yaml) | SM-I-009 virtual fills |

---

## 2. Consume order for agents

1. This README (scope + archive rule).
2. [INTELLIGENCE_LAUNCH_V1.md](INTELLIGENCE_LAUNCH_V1.md) — SM-I ID, gate, Never V1, micro-phase.
3. [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](POLYMARKET_INTELLIGENCE_DATA_SOURCES.md) — upstream authority and limits.
4. [INTELLIGENCE_C4_MODEL.md](INTELLIGENCE_C4_MODEL.md) — component ownership.
5. [INTELLIGENCE_DATA_MODEL.md](INTELLIGENCE_DATA_MODEL.md) — projection tables / envelope lifecycle.
6. [INTELLIGENCE_TEST_STRATEGY.md](INTELLIGENCE_TEST_STRATEGY.md) + relevant `testdata/*.yaml`.
7. Feature doc `01`–`10` for the tasked capability.
8. Cross-cutting Markets docs only as needed: [ADR-008](../architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md), [ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md), [API_SDK_AND_ENDPOINT_REGISTRY.md](../polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md), OpenAPI `schemas/openapi/markets-v1.yaml`.

Do **not** start with `archive/**` or the historical TI-V1 broad registry unless the task is explicitly archival migration.

---

## 3. Archive policy

| Path | Default load |
|------|----------------|
| Active foundations + `01`–`10` | Yes |
| [testdata/](testdata/) | Yes (for tests) |
| [archive/](archive/) | **No** — not default agent context |

Archived material may retain useful math history (e.g. unusual-activity heuristics, relationship scanner, OSS adoption map). It is **not** Launch V1 implementation authority.

---

## 4. Phase and harness rules

| Rule | Binding |
|------|---------|
| Markets `current_phase` | Still **PHASE-1** until manifest changes |
| INTEL-DOC completion | Documentation / design only — **does not** advance `current_phase` |
| Intelligence micro-phases | I0–I6 (Launch), I7 future — see Launch doc |
| Auto-copy | **Forbidden** (ADR-009) |
| Client → Data API | **Forbidden** in production |

---

## 5. Historical / demoted docs (still on disk)

These are **not** Launch authority. Prefer Launch docs above.

| Legacy path | Status |
|-------------|--------|
| `TRADER_INTELLIGENCE_PRODUCT_SPEC.md` (TI-V1-*) | Historical broad registry — demoted; use SM-I-* |
| `WHALE_AND_LARGE_TRADE_DETECTION.md` | Superseded by `01` + Launch/C4 when rewritten |
| `WALLET_PROFILING_AND_SMART_MONEY.md` | Split into `03`/`04`/`05` |
| `ALERT_RULES_AND_DELIVERY.md` | Narrowed into `08`; complex DSL not Launch |
| `SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md` | Shared envelope rules migrate into data model + ProvenanceWriter; keep until feature docs absorb |
| `MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md` | Not a Launch-ten feature; supporting only if holders/whale enrich needs it |
| `archive/*` | Archived — not default load |

---

## 6. Cross-references

- [INTELLIGENCE_LAUNCH_V1.md](INTELLIGENCE_LAUNCH_V1.md)
- [INTELLIGENCE_C4_MODEL.md](INTELLIGENCE_C4_MODEL.md)
- [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](POLYMARKET_INTELLIGENCE_DATA_SOURCES.md)
- [INTELLIGENCE_DATA_MODEL.md](INTELLIGENCE_DATA_MODEL.md)
- [INTELLIGENCE_TEST_STRATEGY.md](INTELLIGENCE_TEST_STRATEGY.md)
- [ADR-009 No Auto Copy](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
- [ADR-008 Shared Signal Engine](../architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md)
- Markets phases: [phases/README.md](../phases/README.md)
