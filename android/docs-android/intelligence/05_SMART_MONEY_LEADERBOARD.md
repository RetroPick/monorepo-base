# SMART MONEY LEADERBOARD

**Status:** reviewed  
**Owner:** intelligence-lead  
**Last updated:** 2026-08-09  
**Product:** RetroPick Markets V1  
**Wave/Tier:** Smart Money Intelligence Launch V1

## Description

Launch V1 authority for the **Smart Money Leaderboard**: promote **SmartMoneyScore** from prior V1.1-gated research to a **Launch PUBLIC** capability—only after **shadow rollout** validation. Rank wallets with shrinkage, sample gates, and anti-gaming—not a raw P&L clone, not WhaleScore, and not marketed as proven alpha before shadow passes.

Rehomes optional `smart_money_score` notes from [WALLET_PROFILING_AND_SMART_MONEY.md](./WALLET_PROFILING_AND_SMART_MONEY.md). Fixtures: `testdata/smart_money_vectors.yaml`.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | BFF `intelligence/smartmoney`; ops reviewing shadow dashboards; fe-v1 leaderboard UI (post-shadow); agents on Launch Feature 5. |
| **What** | Versioned SmartMoneyScore, category views, confidence/sample metadata, anti-gaming filters, `GET /markets/intelligence/leaderboard`. **Not** WhaleScore ranking, auto-copy, or pre-validation marketing. |
| **When** | Shadow/internal first; public UI only after shadow acceptance. Recompute on cadence / resolution batches. Eligibility `n ≥ 30`. |
| **Where** | Spec: this doc. Flag: `intelligence.leaderboard`. C4 / Data Sources / Launch docs linked below. Metrics inputs from [04](./04_WALLET_PERFORMANCE_METRICS.md). |
| **Why** | Growth loop **ARE THEY GOOD** at catalog scale—who has demonstrated useful *public* performance with conservative scoring. |
| **How** | Hydrate performance → filter wash/small-n → compute component z-scores → SmartMoneyScore → shadow compare → (later) public rank API. |

### Worked example

Shadow mode computes scores nightly; ops compare rank stability and wash exclusions. A wallet with n=12 never appears. After shadow gate, public leaderboard shows score, ROI, n, CI/confidence—descriptive only, no “copy top wallets” automation.

## 1. Purpose

Explainable trader-skill ranking for Launch, with mandatory shadow-before-marketing discipline.

## 2. Growth-loop position

**ARE THEY GOOD** (ranked) — after metrics ([04](./04_WALLET_PERFORMANCE_METRICS.md)); before follow / backtest / paper-copy (later features). Distinct from WHAT ([01](./01_WHALE_TRADE_FEED.md)).

## 3. Never V1 / forbidden marketing

| Capability | Status | Authority |
|------------|--------|-----------|
| Market “Smart Money” / leaderboard as product before shadow validation | **forbid** | Launch rollout policy |
| Use WhaleScore as skill rank | **reject** | Separate LargeTrade vs skill |
| Auto-copy top ranks | **reject** | ADR-009 |
| Insider / privileged-info framing | **reject** | Label policy |
| Count unrealized PnL as realized skill | **reject** | Metrics doc |
| AI/LLM in scoring | **reject** | Deterministic only |

## 4. SmartMoneyScore Launch v1

Unitless score in `[0, 100]` (display), versioned `smart_money_score_v1`:

```text
SmartMoneyScore(w) = 100 * clamp01( Σⱼ vⱼ · zⱼ_norm(w) )
```

Each `zⱼ_norm` maps a winsorized z-score (or rank-z within eligible cohort) into `[0,1]`. Missing component → weight redistributed among available **or** score marked `partial` (params choose one; tests lock it).

### 4.1 Components (Launch)

| component | weight vⱼ | input | notes |
|-----------|-----------|-------|-------|
| shrunk_win | 0.40 | `p̂_shrunk` from [04](./04_WALLET_PERFORMANCE_METRICS.md) | sample-adjusted; not raw k/n |
| roi_realized | 0.35 | `roi_realized` | realized only |
| pnl_stability | 0.25 | Sharpe-like: mean period pnl / stdev period pnl over lookback | low if unstable / one-lucky-shot |

**Weight sum:** 1.00 — `intelligence_params_v1.yaml#smart_money_score_v1.weights`.

Optional later (not required Launch): calibration-by-price-bucket, category specialization, recency decay, max drawdown—only if reliably computable from public data.

### 4.2 Sample gates

| gate | value |
|------|-------|
| `n_min_leaderboard` | **30** independent resolved markets/clusters |
| below gate | excluded from leaderboard; profile may still show `insufficient_sample` |
| shrinkage | always use shrunk win rate in score inputs |

## 5. Anti-gaming

| abuse | mitigation |
|-------|------------|
| Tiny sample | `n_min_leaderboard=30` |
| One lucky longshot | pnl_stability component + winsorize ROI |
| Correlated / same-event spam | cluster resolutions per event before counting `n` |
| Wash / circular flow patterns | exclude wallets matching wash heuristics (§5.1) |
| Huge bankroll dominance | prefer ROI + shrunk rate over raw $ PnL rank |
| Stale inactive whales | recency filter: require activity within lookback `T_active` |
| Unrealized inflation | realized-only skill inputs |

### 5.1 Wash pattern exclusion (Launch heuristics)

Exclude from leaderboard cohort when evidence suggests non-informative churn, e.g.:

- High round-trip frequency with near-offsetting buys/sells in the same market within a short window (params: count/threshold).
- Self-trading / mirrored counterparties when detectable from public trade graph at low cost; if not reliably detectable, do **not** invent graph claims—skip that heuristic.
- Extreme trade count with near-zero net risk and near-zero |realized_pnl| relative to volume.

Flag exclusions in shadow reports (`excluded_reason`) for ops review. Heuristics are conservative; false exclusion preferred over promoting wash ranks.

## 6. Categories

When taxonomy exists: Overall, Politics, Crypto, Macro/Economy, Sports, Technology, Geopolitics.

- Category boards require `n_category ≥ n_min_leaderboard` (or documented lower bound in params—default keep 30).
- **Do not invent** category expertise when exposure data is insufficient—omit category row.

Polymarket public leaderboard may seed candidates; RetroPick ranking still uses SmartMoneyScore.

## 7. API

### `GET /markets/intelligence/leaderboard`

| param | type | default |
|-------|------|---------|
| category | enum | overall |
| cursor | string | — |
| limit | int | 50 (max 100) |
| window | enum | e.g. 30d / 90d / all (params) |

**Row fields:** rank, address, displayName (public), smartMoneyScore, scoreVersion, roiRealized, winRateShrunk, nResolved, confidence/ci summary, category, excluded=false.

Shadow mode: same compute, API restricted to staff/internal or returns `shadow_only`—**not** marketed in public nav.

Flag off → feature_disabled.

## 8. Feature flag + rollout

**Flag:** `intelligence.leaderboard`

```text
Internal compute
→ Shadow validation (stability, wash, calibration sanity)
→ Staff/dev UI
→ Small beta
→ Public read
```

**Forbidden:** marketing SmartMoney / leaderboard in launch copy, homepage, or growth campaigns before shadow acceptance is recorded (decision log / Launch checklist).

## 9. Fixtures

**`testdata/smart_money_vectors.yaml`** — component math, gates, wash exclusion cases, ranking ties. No Markdown bulk vectors.

## 10. C4 placement

Component: `intelligence/smartmoney` (+ performance inputs). See [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md).

## 11. Observability

Track score version, cohort size, exclusion counts, rank churn, compute lag. Shadow dashboards before public enable.

## 12. Acceptance criteria

- [ ] SmartMoneyScore v1 weights sum 1.0; distinct from WhaleScore.
- [ ] `n_min_leaderboard=30` enforced; shrinkage on win inputs.
- [ ] Wash/anti-gaming exclusions implemented + fixture-covered.
- [ ] Unrealized PnL not used as realized skill.
- [ ] `GET /markets/intelligence/leaderboard` OpenAPI-aligned; gated by `intelligence.leaderboard`.
- [ ] Shadow rollout path documented; public marketing blocked until shadow sign-off.
- [ ] `testdata/smart_money_vectors.yaml` green.
- [ ] No auto-copy CTAs; no insider framing; no gambling copy.

## Cross-references

- [INTELLIGENCE_LAUNCH_V1.md](./INTELLIGENCE_LAUNCH_V1.md)
- [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md)
- [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](./POLYMARKET_INTELLIGENCE_DATA_SOURCES.md)
- [01_WHALE_TRADE_FEED.md](./01_WHALE_TRADE_FEED.md) · [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md) · [04_WALLET_PERFORMANCE_METRICS.md](./04_WALLET_PERFORMANCE_METRICS.md)
- [WALLET_PROFILING_AND_SMART_MONEY.md](./WALLET_PROFILING_AND_SMART_MONEY.md) (historical)
- [ADR-008](../architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md) · [ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
