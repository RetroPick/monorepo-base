# PAPER COPY

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** Smart Money Intelligence Launch V1

## Description

This document is the launch authority for **Paper Copy** in RetroPick Smart Money Intelligence Launch V1. It defines a **virtual, non-custodial, non-trading** simulator that answers the growth-loop question **WHAT IF I FOLLOW**—simulated fills derived from CLOB book / prices-history rules after a source wallet trade is observed—so users can explore follow outcomes without risking funds and without RetroPick presenting paper fills as venue or Polymarket executions.

Paper Copy **MUST NOT** submit Polymarket orders, claim the whale’s entry price automatically, or auto-promote to live copy (ADR-009). Slippage estimation **rehomes** the walk-the-book concept from [MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md](MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md) §7 for virtual fills. APIs under `/markets/intelligence/paper/*`. Flag: `intelligence.paper_copy`. **ACCOUNT gated**. Golden fixtures: [testdata/paper_copy_vectors.yaml](testdata/paper_copy_vectors.yaml).

Read this when implementing paper portfolios, follow-sourced virtual fills, or P&L dashboards. Prefer [10_QUICK_BACKTEST.md](10_QUICK_BACKTEST.md) for historical one-shot simulation and [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md) for follow source membership.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | Authenticated users; paper simulation worker; web paper dashboard; agents implementing `intelligence.paper_copy`. |
| **What** | Configured virtual capital + copy size + market filters + follow source; incremental simulated fills with latency + slippage; paper P&L. **Not** real orders, venue fills, or auto-live promotion. |
| **When** | After a matching source trade is observed and next valid price/book snapshot is available. Applies when shipping paper follow from profile/backtest CTA. |
| **Where** | Spec: this doc. APIs: `/markets/intelligence/paper/*`. Store: paper portfolio/ledger tables. Fixtures: `testdata/paper_copy_vectors.yaml`. Flag: `intelligence.paper_copy`. |
| **Why** | Convert “would copying have worked?” curiosity into retained simulation without custody or execution risk. |
| **How** | Observe trade → match rule → obtain next snapshot (no lookahead) → deterministic slippage model → virtual fill → mark equity. Never call order submit. |

### Scope boundaries

- **In scope:** starting virtual capital; fixed copy amount / max per trade; markets/category filter; follow-source wallets; paper orders/fills/positions/equity; slippage estimate; clear SIMULATION labeling.
- **Out of scope:** live auto execution; portfolio % mirroring; leverage; cross-wallet netting; claiming Polymarket fill IDs; one-tap live promote.
- **Depends on:** Follow store; whale/trade events; CLOB book and/or prices-history; optional market health depth for slippage.
- **Slippage rehome:** `slippage_bps(q)` walk from market-health analytics — advisory virtual fill only.

## 1. Purpose and growth-loop position

**Primary question:** *What happens if I follow this trader without risking money?*

Growth-loop stage: **WHAT IF I FOLLOW** — after Quick Backtest persuasion, before any future manual live copy. Launch V1 ends here for execution ambition.

## 2. Critical honesty rules

1. **THE FOLLOWER DOES NOT GET THE WHALE’S ENTRY PRICE AUTOMATICALLY.** Detection is after the fact.
2. Paper fill uses **next valid** mid/book snapshot at or after observation time (anti-lookahead).
3. UI and API labels: `simulation: true`, copy such as “Simulated fill — not a Polymarket order.”
4. No paper row may reuse or fabricate venue `orderId` / `tradeId` as if RetroPick filled on CLOB.
5. Workers must have **zero** code path into order submission (ADR-009).

## 3. Configuration (launch)

```text
paper_follow_rules
  user_id
  source_wallet          -- follow source
  starting_cash_usd
  copy_amount_usd        -- fixed notional per mirrored trade
  max_amount_per_trade_usd
  market_filter          -- optional allowlist / category
  max_probability        -- optional skip if mid > threshold
  enabled
```

Keep simple; reject complex portfolio mirroring in Launch V1.

## 4. Simulated fill model

Conceptual flow:

```text
source trade observed
       ↓
paper-follow rule matches
       ↓
obtain next valid price/book snapshot (t ≥ observe_ts)
       ↓
apply deterministic slippage model
       ↓
virtual fill + ledger entry
```

**Slippage (rehomed):** For virtual market buy of notional `q`, walk asks when book available:

```text
slippage_bps(q) = 10000 * (vwap_exec(q) - mid) / mid
```

If book missing: fall back to prices-history mid ± configured spread assumption; set `degraded: book_unavailable`. Display bands may mirror health doc `{100, 500, 2000}` for UI education; actual fill uses rule `copy_amount_usd`.

Observation latency is recorded on the fill (`observe_ts`, `fill_ts`, `latency_ms`).

## 5. Domain model (minimum)

```text
paper_portfolios
paper_follow_rules
paper_cash_ledger
paper_orders          -- virtual only
paper_fills           -- virtual only; simulation=true
paper_positions
paper_equity_snapshots
```

Inspect existing Markets schemas before adding tables; prefer intelligence-scoped names.

## 6. API contract

ACCOUNT + `intelligence.paper_copy`. Base: `/markets/intelligence/paper`

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/paper/portfolios` | Create portfolio + starting cash |
| `GET` | `/paper/portfolios/{id}` | Equity, positions, flags |
| `POST` | `/paper/rules` | Attach follow source + size filters |
| `PATCH` | `/paper/rules/{id}` | Enable/disable / edit caps |
| `GET` | `/paper/portfolios/{id}/fills` | Simulated fills (labeled) |
| `GET` | `/paper/portfolios/{id}/equity` | Time series |

All write paths auth-bound to caller. No `POST` that hits Polymarket CLOB.

## 7. C4 placement

- **Components:** TradeObserver → PaperMatcher → SnapshotGate → SlippageModel → Ledger.
- **External reads:** CLOB book / prices-history (read-only).
- **Forbidden edge:** any arrow to OrderSubmit.

## 8. Frontend UX states

| State | UX |
|-------|-----|
| CTA | “Paper follow” from profile/backtest — prominent **THIS IS A SIMULATION** |
| Live paper | Equity, open simulated positions, recent virtual fills |
| Degraded | Banner when book gaps / stale prices |
| Empty | Encourage follow + enable rule |

Never show paper P&L as withdrawable balance.

## 9. Never V1

| Capability | Status | Authority |
|------------|--------|-----------|
| Real / venue-presented fills | **reject** | This doc |
| Auto live copy from paper | **reject** | ADR-009 |
| Lookahead to whale entry | **reject** | Honesty §2 |
| LLM→paper→order bridge | **reject** | ADR-009 |

## 10. Testing and fixtures

- Golden vectors: [testdata/paper_copy_vectors.yaml](testdata/paper_copy_vectors.yaml) — latency, slippage, degraded book, filter skips.
- CI: grep/guard that paper packages do not import order-submit clients.
- Metrics: `paper_copy_events_total`, `paper_copy_skipped_total{reason=}`, simulated equity gauges (user-scoped cardinality careful).

## 11. Acceptance criteria

1. Enabling paper follow never creates a Polymarket order.
2. Virtual fill price ≠ source trade price unless snapshot coincidentally matches; latency fields present.
3. Responses mark `simulation: true`; UI shows simulation banner.
4. Slippage uses book walk or documented fallback with degraded flag.
5. Flag `intelligence.paper_copy` + ACCOUNT gate the APIs.
6. Fixture vectors in `testdata/paper_copy_vectors.yaml` stay green.

## 12. Cross-references

- [MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md](MARKET_HEALTH_LIQUIDITY_AND_ORDERBOOK_ANALYTICS.md) — slippage walk rehome
- [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md), [08_BASIC_WHALE_ALERTS.md](08_BASIC_WHALE_ALERTS.md), [10_QUICK_BACKTEST.md](10_QUICK_BACKTEST.md)
- [../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
