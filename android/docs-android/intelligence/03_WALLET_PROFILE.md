# WALLET PROFILE

**Status:** reviewed  
**Owner:** intelligence-lead  
**Last updated:** 2026-08-09  
**Product:** RetroPick Markets V1  
**Wave/Tier:** Smart Money Intelligence Launch V1

## Description

Launch V1 authority for **Wallet Profile**: public aggregates and presentation fields for a single address, **lazy hydration** via `WalletHydrator`, and **quantile-only** labels. Clients answer **WHO** with honest context—never insider badges, auto-copy, or mixed provenance without labels.

Profile fields rehome the V1 public surface from [WALLET_PROFILING_AND_SMART_MONEY.md](./WALLET_PROFILING_AND_SMART_MONEY.md). Performance math (P&L, shrunk win rate, HHI details) is owned by [04_WALLET_PERFORMANCE_METRICS.md](./04_WALLET_PERFORMANCE_METRICS.md); this doc owns shape, hydrate, labels, and API.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | BFF `WalletHydrator` + profile API; fe-v1 wallet page; whale-feed deep links; agents on Launch Feature 3. |
| **What** | Address-keyed public profile: Polymarket-reported identity + RetroPick-derived aggregates + estimated fields with provenance. Quantile labels only. **Not** insider labels, smart-money marketing badges, or auto-copy. |
| **When** | On first profile request (lazy hydrate) and refresh cadence; after search selection or whale “view wallet”. |
| **Where** | Spec: this doc. Compute: `apps/backend/internal/markets/intelligence/` (`WalletHydrator`). C4 / Data Sources / Launch siblings linked below. |
| **Why** | Growth loop **WHO**: show what a wallet looks like as a public trader before skill scoring. |
| **How** | Normalize addr → cache/projection miss → WalletHydrator pulls Gamma/Data → write wallet projection → return DTO with provenance tags. |

### Worked example

User opens `/wallets/{addr}` after search. Hydrator fills public name (if any), 30d trade/volume counts, active markets, and performance summary stubs. Labels may include `high_volume` from quantiles. UI never shows `insider`. Insufficient sample → performance fields null with `insufficient_sample` (see metrics doc).

## 1. Purpose

Stable public wallet page contract: fields, hydrate lifecycle, label policy, and `GET /markets/intelligence/wallets/{addr}`.

## 2. Growth-loop position

**WHO** — with [02_WALLET_SEARCH.md](./02_WALLET_SEARCH.md); feeds ARE THEY GOOD ([04](./04_WALLET_PERFORMANCE_METRICS.md) / [05](./05_SMART_MONEY_LEADERBOARD.md)).

## 3. Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Labels `insider`, `smart_money_insider` | **reject** | Product / legal tone |
| Auto-copy / AI→orders from profile | **reject** | ADR-009 |
| Present raw win rate as primary when shrinkage applies | **reject** | Metrics doc |
| Deanonymization | **reject** | Privacy |
| Invented demo addresses in normative examples | **reject** | Use placeholders like `{addr}` |

## 4. Profile fields (Launch)

Provenance column is mandatory in API/UI.

| field | type | provenance | notes |
|-------|------|------------|-------|
| address | string | polymarket / normalized | checksum display |
| displayName | string/null | polymarket-reported | public profile only |
| profileImage | url/null | polymarket-reported | |
| trade_count_30d | int | retro_derived | |
| volume_usd_30d | decimal | retro_derived / estimated | mark if estimated |
| resolved_count | int | retro_derived | |
| win_rate_shrunk | ratio/null | retro_derived | null if n < 15 |
| win_rate_ci90 | interval/null | retro_derived | with shrunk rate |
| concentration_hhi | ratio | retro_derived | see metrics doc |
| active_markets | int | retro_derived | |
| position_value_usd | decimal/null | estimated | when positions available |
| recent_trades | summary[] | polymarket / derived | bounded list |
| open_positions | summary[] | polymarket / derived | bounded |
| closed_positions_preview | summary[] | derived | bounded |
| category_exposure | map/null | estimated | omit if insufficient taxonomy |
| labels | enum[] | retro_derived | quantile-only |
| performance_summary | object | retro_derived | pointer into metrics fields |
| hydrated_at | timestamp | system | |
| freshness | enum | system | fresh / stale / partial |

Do not mix Polymarket-reported and RetroPick-derived values without provenance tags.

## 5. Label policy

**Allowed (quantile-only):** `high_volume`, `consistent`, `concentrated`, `recently_active`.

**Forbidden:** `insider`, `smart_money_insider`, or any copy implying privileged information.

Quantile thresholds live in `intelligence_params_v1.yaml` (cohort = wallets with n ≥ `n_min_public` where applicable). Labels are descriptive tags, not skill ranks—leaderboard score is separate ([05](./05_SMART_MONEY_LEADERBOARD.md)).

## 6. Lazy hydrate — WalletHydrator

```text
GET profile
  → normalize address
  → read intel_wallets projection
  → if miss or stale beyond TTL:
       WalletHydrator.EnqueueOrRun(addr)
         → Gamma public profile (if any)
         → Data API trades/positions windows (bounded)
         → recompute aggregates via performance module
         → upsert projection + hydrated_at
  → return DTO (partial allowed with freshness=partial)
```

| rule | Launch |
|------|--------|
| Trigger | On-demand first; optional background refresh for watched/leaderboard wallets later |
| Bound | Cap upstream pages/cost per hydrate |
| Failure | Return last-good + `stale` / `partial`; never fabricate trades |
| Concurrency | Singleflight per address |

## 7. API

### `GET /markets/intelligence/wallets/{addr}`

- `{addr}` must pass normalize rules from [02_WALLET_SEARCH.md](./02_WALLET_SEARCH.md); else 400 `invalid_address`.
- 200 with profile DTO (§4); may be sparse on first hydrate.
- Flag off → feature_disabled.
- No order/execute side effects.

## 8. Storage / jobs

| artifact | role |
|----------|------|
| `intel_wallets` (name illustrative) | Profile projection + labels + hydrated_at |
| WalletHydrator worker | Lazy/bounded upstream fill |
| Links | `intel_trades` for recent activity |

## 9. Feature flag

`intelligence.wallet_profile` — shared with Wallet Search.

## 10. Frontend UX states

Loading → partial hydrate → complete; insufficient_sample on metrics; stale banner; disabled. No “follow this insider” or copy-trade buttons on Launch profile (follow/paper-copy are later features).

## 11. C4 placement

Component: `intelligence/wallets` (`WalletHydrator` + profile handler). See [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md).

## 12. Acceptance criteria

- [ ] Profile fields + provenance match §4; OpenAPI aligned.
- [ ] WalletHydrator lazy path: miss → bounded hydrate → upsert.
- [ ] Labels quantile-only; CI/tests forbid insider label enums.
- [ ] `GET /markets/intelligence/wallets/{addr}` with normalize validation.
- [ ] Flag `intelligence.wallet_profile`.
- [ ] Performance numbers defer to [04](./04_WALLET_PERFORMANCE_METRICS.md) formulas.
- [ ] No auto-copy, gambling, or invented addresses in normative text.

## Cross-references

- [INTELLIGENCE_LAUNCH_V1.md](./INTELLIGENCE_LAUNCH_V1.md)
- [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md)
- [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](./POLYMARKET_INTELLIGENCE_DATA_SOURCES.md)
- [02_WALLET_SEARCH.md](./02_WALLET_SEARCH.md) · [04_WALLET_PERFORMANCE_METRICS.md](./04_WALLET_PERFORMANCE_METRICS.md) · [05_SMART_MONEY_LEADERBOARD.md](./05_SMART_MONEY_LEADERBOARD.md)
- [WALLET_PROFILING_AND_SMART_MONEY.md](./WALLET_PROFILING_AND_SMART_MONEY.md) (historical)
- [ADR-008](../architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md) · [ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
