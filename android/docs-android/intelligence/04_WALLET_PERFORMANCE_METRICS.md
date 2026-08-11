# WALLET PERFORMANCE METRICS

**Status:** reviewed  
**Owner:** intelligence-lead  
**Last updated:** 2026-08-09  
**Product:** RetroPick Markets V1  
**Wave/Tier:** Smart Money Intelligence Launch V1

## Description

Launch V1 quantitative authority for wallet **P&L, ROI, win rate**, Beta-Binomial shrinkage, CI90, and **concentration HHI**. Answers **ARE THEY GOOD** with honest uncertainty—not raw luck percentages or insider claims.

Preserves useful math from [WALLET_PROFILING_AND_SMART_MONEY.md](./WALLET_PROFILING_AND_SMART_MONEY.md) (α₀=2, β₀=2, n_min_public=15) with explicit rationale. Fixtures: `testdata/wallet_performance_vectors.yaml`—no bulk worked-wallet Markdown rows.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | BFF `intelligence/performance` module; profile + leaderboard consumers; agents calibrating shrinkage. |
| **What** | Realized/unrealized/total P&L, ROI, resolved win counts, raw vs shrunk win rate + CI90, HHI. **Not** “win rate = skill”, predictive alpha, or auto-copy. |
| **When** | On WalletHydrator refresh and resolution ingest; public win rate only if `n ≥ 15`. |
| **Where** | Spec: this doc. Params: `intelligence_params_v1.yaml`. Fixtures: `testdata/wallet_performance_vectors.yaml`. Exposed via [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md) and [05_SMART_MONEY_LEADERBOARD.md](./05_SMART_MONEY_LEADERBOARD.md). |
| **Why** | Growth loop **ARE THEY GOOD** needs transparent metrics with shrinkage so small-n wallets are not oversold. |
| **How** | Aggregate resolved positions → P&L/ROI → Beta posterior → gate on n_min → compute HHI → attach to profile projection. |

### Worked example

Wallet with n=20 resolved, k=14 → α=16, β=8, `p̂_shrunk = 0.667`, CI90 from BetaInv—tests lock means in YAML. n=10 → `win_rate_shrunk: null`, badge `insufficient_sample`. A high win rate on 95¢ favorites must not alone imply skill (see §8).

## 1. Purpose

Exact, testable performance definitions for Launch wallet intelligence.

## 2. Growth-loop position

**ARE THEY GOOD** — between WHO ([03](./03_WALLET_PROFILE.md)) and ranked Smart Money ([05](./05_SMART_MONEY_LEADERBOARD.md)).

## 3. Never V1

| Capability | Status |
|------------|--------|
| Auto-copy from high win rate | **reject** (ADR-009) |
| Insider performance labels | **reject** |
| Primary display of raw k/n when shrinkage applies | **reject** |
| Bulk golden rows in this Markdown | **reject** → YAML fixtures |

## 4. Position universe

For wallet `w`, consider public positions/trades RetroPick can attribute:

- **Resolved** with non-zero stake → enter win/loss and realized P&L.
- **Open** → unrealized mark-to-market when price available; never count as wins.

Independence: prefer **resolved markets** (or event clusters) as the unit for `n`, not raw fills—document clustering rule in params if collapsing multi-outcome events.

## 5. P&L and ROI

Let stake and payout be in USD notional (or stable unit documented in Data Sources).

```text
realized_pnl   = Σ_resolved (payout_usd - cost_usd)
unrealized_pnl = Σ_open (mark_usd - cost_usd)     # null if marks unavailable
total_pnl      = realized_pnl + coalesce(unrealized_pnl, 0)

cost_basis_resolved = Σ_resolved cost_usd
roi_realized = realized_pnl / max(ε, cost_basis_resolved)

# Optional Launch display:
roi_total = total_pnl / max(ε, cost_basis_resolved + cost_basis_open)
```

Mark unrealized and ROI fields with provenance `estimated` when marks are incomplete. Never treat unrealized profit as realized skill for leaderboard inputs ([05](./05_SMART_MONEY_LEADERBOARD.md)).

## 6. Win rate — Beta-Binomial shrinkage

For resolved units: `k` = wins, `n` = resolved count with non-zero stake.

**Prior (Launch):** `α₀ = 2`, `β₀ = 2`

Rationale: weakly informative symmetric prior toward 0.5; stabilizes small samples without hard-coding a “skillful” mean; matches prior Wave-6 choice and remains cheap to compute. Do not replace with raw `k/n` as the primary public metric.

```text
α = α₀ + k
β = β₀ + (n - k)
p̂_shrunk = α / (α + β)
p_raw = k / n                         # diagnostic only
```

### 6.1 Sample gate

| field | rule |
|-------|------|
| `n_min_public` | 15 |
| below gate | `win_rate_shrunk: null`, `win_rate_ci90: null`, badge `insufficient_sample` |

### 6.2 CI90

```text
p_low  = BetaInv(0.05, α, β)
p_high = BetaInv(0.95, α, β)
```

Show interval only when `n ≥ n_min_public`.

### 6.3 Optional volume-weighted

`pnl_weighted_win_rate`: stake-weighted wins, still shrunk with same prior at market-cluster grain—not per fill.

## 7. Concentration HHI

On stake shares across active (or lookback) markets:

```text
s_i = stake_usd_i / Σ_j stake_usd_j
HHI = Σ_i s_i²                          # ∈ (0, 1] for finite markets
```

High HHI → label eligibility `concentrated` (quantile policy in profile doc). Empty portfolio → HHI null.

## 8. Win rate ≠ skill (normative)

- Buying high-probability outcomes inflates win rate without proving edge.
- Correlated markets inflate effective sample size if counted naively.
- Leaderboard must use shrunk rates, ROI, sample gates, and anti-gaming ([05](./05_SMART_MONEY_LEADERBOARD.md))—not raw win% alone.
- UX copy: descriptive metrics only; no “guaranteed” or gambling claims.

## 9. Fixtures

All numeric locks live in **`testdata/wallet_performance_vectors.yaml`** (posterior means, CI edges, HHI, ROI edge cases). Markdown must not grow bulk wallet_000x tables.

## 10. API / exposure

No standalone Launch path required: fields attach to `GET /markets/intelligence/wallets/{addr}` and feed SmartMoneyScore inputs. Flag: shared `intelligence.wallet_profile` (leaderboard has its own flag).

## 11. C4 placement

Component: `intelligence/performance`. See [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md).

## 12. Acceptance criteria

- [ ] P&L/ROI formulas implemented; unrealized not treated as realized skill.
- [ ] α₀=2, β₀=2, n_min_public=15, CI90 match params + tests.
- [ ] Below n_min → null + `insufficient_sample`.
- [ ] HHI computed per §7.
- [ ] `testdata/wallet_performance_vectors.yaml` green; no Markdown bulk vectors.
- [ ] Profile provenance tags distinguish estimated vs derived.
- [ ] No auto-copy or insider labeling from metrics.

## Cross-references

- [INTELLIGENCE_LAUNCH_V1.md](./INTELLIGENCE_LAUNCH_V1.md)
- [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md)
- [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](./POLYMARKET_INTELLIGENCE_DATA_SOURCES.md)
- [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md) · [05_SMART_MONEY_LEADERBOARD.md](./05_SMART_MONEY_LEADERBOARD.md)
- [WALLET_PROFILING_AND_SMART_MONEY.md](./WALLET_PROFILING_AND_SMART_MONEY.md) (historical)
- [ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
