# QUICK BACKTEST

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** Smart Money Intelligence Launch V1

## Description

This document is the launch authority for **Quick Backtest** in RetroPick Smart Money Intelligence Launch V1. It defines a **bounded-window, anti-lookahead** historical simulation that answers the growth-loop question **WOULD COPYING HAVE WORKED**—replaying a follower strategy against a wallet’s observable trades with starting notional, not the wallet’s realized P&L as a proxy—so users get an honest, degraded-aware sketch before Follow / Paper Copy.

API: `POST /markets/intelligence/backtests`. Flag: `intelligence.backtest`. Fixtures: [testdata/backtest_vectors.yaml](testdata/backtest_vectors.yaml). Outputs include return, max drawdown, trade count, and degraded flags when price history gaps. Never triggers real orders (ADR-009). Do not silently use present-day Smart Money scores as if they were known historically.

Read this when implementing profile “Quick backtest” CTA, backtest workers, or conversion to Paper Copy. Prefer [09_PAPER_COPY.md](09_PAPER_COPY.md) for live/incremental simulation and [04_WALLET_PERFORMANCE_METRICS.md](04_WALLET_PERFORMANCE_METRICS.md) for descriptive wallet stats (not follower simulation).

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | Traders on wallet profile; backtest compute worker; agents implementing `intelligence.backtest`. |
| **What** | One-shot (or short-lived) simulation: inputs wallet, window, starting notional / copy size; outputs return, max DD, trade count, assumptions, degraded flags. **Not** wallet P&L replay-as-follower, lookahead fills, or live orders. |
| **When** | On-demand from profile; bounded CPU/time budget. Applies when shipping “Would copying have worked?” CTA. |
| **Where** | Spec: this doc. API: `POST /markets/intelligence/backtests`. Fixtures: `testdata/backtest_vectors.yaml`. Flag: `intelligence.backtest`. Data: wallet trades + prices-history (+ book if available historically). |
| **Why** | Scientifically honest persuasion step before Follow / Paper—reduces blind copying and builds trust. |
| **How** | Paginate wallet trades in window → for each eligible trade, fill at next observable price after trade time → mark path → summarize; flag gaps. |

### Scope boundaries

- **In scope:** bounded horizon (e.g. 7/30/90d caps); starting notional; fixed copy amount; anti-lookahead fills; return / max drawdown / trade count; assumption + coverage warnings; degraded price-gap flags.
- **Out of scope:** tick-perfect HFT replay; portfolio optimization; using future resolution at entry; presenting results as guaranteed live performance; auto-start paper without user confirm.
- **Depends on:** wallet historical trades; market metadata; prices-history; pagination/rate-limit policy from data-sources doc.
- **Auth:** Launch compute may be rate-limited for guests on public profiles; **persisted/saved runs are ACCOUNT**. Prefer ACCOUNT for heavy windows.

## 1. Purpose and growth-loop position

**Primary question:** *Would following this trader historically have worked?*

Growth-loop stage: **WOULD COPYING HAVE WORKED** — after skill metrics, before Follow / Paper Copy. Results should CTA into Follow and Paper with simulation caveats intact.

## 2. Inputs

| Input | Required | Notes |
|-------|----------|-------|
| `walletAddress` | yes | Source trader |
| `window` | yes | Enum/bounded: e.g. `7d`, `30d`, `90d` (max launch horizon) |
| `startingNotionalUsd` | yes | Initial virtual capital |
| `copyAmountUsd` | yes | Fixed per copied trade |
| `maxProbability` | no | Skip entries above mid threshold |
| `marketFilter` | no | Optional allowlist/category |

Reject unbounded custom ranges that exceed cost/pagination budgets.

## 3. Anti-lookahead rules (mandatory)

1. No future market resolution information at simulated entry.
2. No future price data when selecting simulated fill—use next price ≤ as-of path, ≥ trade timestamp.
3. No using the whale’s final P&L to decide whether to copy a trade.
4. No using **future** SmartMoneyScore for historical decisions. If score history unavailable: run **raw wallet-follow** strategy **or** label score filters as present-day retrospective (explicit warning)—never silent survivorship.

## 4. Computation sketch

```text
cash = startingNotionalUsd
equity_curve = []
for trade in wallet_trades(window) sorted by time:
  if filters reject: continue
  px = next_observable_price(market, t >= trade.ts)  # no lookahead
  if px missing: mark gap; skip or degrade; continue
  fill at px with deterministic spread/slippage assumption
  update cash/positions
  record equity
summarize: return_pct, max_drawdown_pct, trade_count, degraded_flags
```

Fill assumptions must be listed in the response (`assumptions[]`).

## 5. Outputs (launch)

Example summary fields:

```text
period, initialCapital, copyAmount
tradesCopied, returnPct, pnlUsd, winRate, maxDrawdownPct, endingEquity
assumptions[], dataCoverage, warnings[], degradedFlags[]
```

| Degraded flag | Meaning |
|---------------|---------|
| `price_gaps` | Missing prices-history for one or more trades |
| `pagination_truncated` | Upstream trade history truncated |
| `score_retrospective` | Present-day score used with warning |
| `low_coverage` | Coverage below threshold |

## 6. API contract

| Method | Path | Flag | Notes |
|--------|------|------|-------|
| `POST` | `/markets/intelligence/backtests` | `intelligence.backtest` | Sync or 202+job for heavy windows |
| `GET` | `/markets/intelligence/backtests/{id}` | same | Poll result when async |

Rate-limit aggressively. Saved history: ACCOUNT. Response always includes assumptions and warnings—never a bare “+18%” without context.

## 7. C4 placement

- **Components:** BacktestAPI → WindowPlanner → TradePager → PriceAligner → Simulator → ResultStore.
- **Placement:** primarily Wallet Profile CTA; optional shareable result card (no private data).
- Canonical C4: `INTELLIGENCE_C4_MODEL.md`.

## 8. Frontend UX states

| State | UX |
|-------|-----|
| Form | Window + starting notional + copy amount |
| Running | Progress / timeout messaging |
| Result | Return, max DD, trade count, warnings |
| Degraded | Show flags prominently |
| CTA | Follow · Start paper copy (simulation) |

Copy: descriptive performance of a **follower simulation**—not “this wallet printed.”

## 9. Never V1

| Capability | Status | Authority |
|------------|--------|-----------|
| Lookahead / future resolution at entry | **reject** | §3 |
| Silent score survivorship | **reject** | §3 |
| Real orders from backtest | **reject** | ADR-009 |
| Unlimited history windows | **reject** | Cost controls |

## 10. Testing and fixtures

- Golden vectors: [testdata/backtest_vectors.yaml](testdata/backtest_vectors.yaml) — happy path, price gaps, truncation, anti-lookahead regression.
- Property: fill timestamp ≥ source trade timestamp for every copied trade.
- Metrics: `intelligence_backtest_runs_total{result=}`, duration histogram, `degraded_total{flag=}`.
- Cost: job timeout; max trades scanned; cache repeated (wallet, window, params) hashes briefly.

## 11. Acceptance criteria

1. `POST /markets/intelligence/backtests` returns return, max drawdown, trade count, and assumptions.
2. Anti-lookahead tests in fixtures pass (no future price/resolution).
3. Price gaps set `degradedFlags` including `price_gaps` rather than inventing prices.
4. Flag `intelligence.backtest` gates the API.
5. No path from backtest worker to order submit.
6. Result CTAs may start Follow/Paper; never auto-copy live.

## 12. Cross-references

- [03_WALLET_PROFILE.md](03_WALLET_PROFILE.md), [04_WALLET_PERFORMANCE_METRICS.md](04_WALLET_PERFORMANCE_METRICS.md)
- [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md), [09_PAPER_COPY.md](09_PAPER_COPY.md)
- [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](POLYMARKET_INTELLIGENCE_DATA_SOURCES.md) — pagination / history horizon
- [../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
