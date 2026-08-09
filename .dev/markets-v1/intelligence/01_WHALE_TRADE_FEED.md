# WHALE TRADE FEED

**Status:** reviewed  
**Owner:** intelligence-lead  
**Last updated:** 2026-08-09  
**Product:** RetroPick Markets V1  
**Wave/Tier:** Smart Money Intelligence Launch V1

## Description

Launch V1 authority for the **Whale Trade Feed**: wallet-attributed large public trades, simplified **WhaleScore Launch v1**, reason codes, dedup, feed ordering, storage, and `GET /markets/intelligence/whales`. Clients answer **WHAT happened?** with evidence-linked large-flow cards—never auto-copy, insider labels, or predictive-alpha claims.

This replaces the implementation authority of [WHALE_AND_LARGE_TRADE_DETECTION.md](./WHALE_AND_LARGE_TRADE_DETECTION.md) for Launch work (old file kept for history). Compute lives in `apps/backend/internal/markets/intelligence/`. Golden fixtures: `testdata/whale_feed_vectors.yaml` only—no bulk `golden_vector_0xx` tables in Markdown.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | BFF trade-ingest + whale scorers; fe-v1 whale feed; ops calibrating `intelligence_params_v1.yaml#whale_score_launch`; agents shipping Launch Feature 1. |
| **What** | Wallet-attributed large trades from Data API `/trades`, τ_market gate, WhaleScore Launch v1 (3 required components), reason codes, dedup fingerprint, cursor feed. **Not** WS-only wallet invention, auto-copy, or insider labels. |
| **When** | After a normalized public trade with wallet is persisted; poll/ingest cadence under rate limits. Feed lag target: honest Data-API lag (prefer correctness over fake sub-second). |
| **Where** | Spec: this doc. C4: [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md) → `intelligence/trades`. Upstream: [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](./POLYMARKET_INTELLIGENCE_DATA_SOURCES.md). Product: [INTELLIGENCE_LAUNCH_V1.md](./INTELLIGENCE_LAUNCH_V1.md). |
| **Why** | Growth-loop entry: surface large flow so users ask WHO next—without accusing wallets or automating trades (ADR-009). |
| **How** | Ingest Data API `/trades` → normalize → apply τ_market + WhaleScore → reason codes + fingerprint → write `intel_trades` / `intel_whale_events` → serve filtered feed behind `intelligence.whale_feed`. |

### Worked example

Trade with `notional_usd = 12500`, volume share and mid move available. τ_market resolves ≥ 5000 USD so it is a whale candidate. Components yield a Launch WhaleScore with `WHALE_NOTIONAL_THRESHOLD` / `WHALE_PRICE_IMPACT`. Feed card is descriptive only—no “copy this trade” CTA and no order path.

## 1. Purpose

Deterministic large-trade awareness for Launch V1: classify, explain, dedupe, and list wallet-attributed public trades.

## 2. Growth-loop position

**WHAT happened?** — first step of the Smart Money loop (→ WHO via [02_WALLET_SEARCH.md](./02_WALLET_SEARCH.md) / [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md)).

## 3. Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Autonomous / auto copy trading | **reject** | ADR-009 |
| Insider wallet labels | **reject** | Use descriptive reason codes only |
| Inventing wallet from Market WS alone | **reject** | Critical attribution rule below |
| AI-triggered orders | **reject** | No LLM→order path |
| Bulk golden_vector tables in this doc | **reject** | Use YAML fixtures |

## 4. Critical upstream attribution rule

**Wallet attribution for whale events MUST come from Polymarket Data API `/trades` (or an equivalent official wallet-bearing public-trade endpoint documented in Data Sources).**

| Source | Role |
|--------|------|
| Data API `/trades` | **Canonical** wallet-attributed public trade |
| Market WebSocket | Timing / book / price context only — **not** wallet identity |
| CLOB authenticated | Out of scope for public whale feed |

Join WS timing to Data-API trades only when both sides are evidence-flagged; Launch may ship Data-API polling alone. Prefer correctness over fake realtime. Expected lag must be documented in UX (`freshness` / `source`).

Production clients never call Data API directly (ACL / Data Sources).

## 5. WhaleScore Launch v1

Unitless composite in `[0, 100]`:

```text
WhaleScore(t) = 100 * clamp01( Σᵢ wᵢ · fᵢ(t) )
```

### 5.1 Required Launch components (weights sum 1.0)

| component | weight wᵢ | fᵢ(t) ∈ [0,1] |
|-----------|-----------|----------------|
| notional_z | 0.40 | `sigmoid( (notional_usd - μₙ) / σₙ )` |
| volume_share | 0.35 | `min(1, notional / max(ε, vol_24h_usd * 0.05))` |
| price_impact | 0.25 | `min(1, impact_bps / 50)` |

**Weight sum:** 1.00 — frozen under `intelligence_params_v1.yaml` key `whale_score_launch.weights`.

Relative to Wave-6 full WhaleScore: `wallet_prior` and `timing_novelty` are **not required** on the Launch path (optional enrichment only; if present, renormalize or keep separate evidence fields—do not silently inflate the required three). `book_thinness` is optional enrichment when depth snapshots exist; not required for Launch candidate classification.

### 5.2 Dynamic notional threshold (preserved)

```text
τ_market = max(τ_global, τ_liquidity, τ_volume)
τ_global = 5000 USD
τ_liquidity = 0.10 * depth_at_2pct_usd   # if depth missing, omit this term
τ_volume = 0.02 * vol_24h_usd            # if vol missing, omit this term
```

**Whale candidate** if `notional_usd ≥ τ_market` **OR** `WhaleScore ≥ 70`.

### 5.3 Price impact

```text
impact_bps = 10000 * |m' - m| / m
```

Pre/post mid within 30s when available; else VWAP-drift fallback with `impact_method: vwap_fallback`. Missing impact → `f_price_impact = 0` and evidence flag `impact_unavailable` (score may still qualify via notional/volume).

WhaleScore is **not** predictive alpha; UX copy must stay descriptive (size / volume share / price move).

## 6. Reason codes (Launch)

| code | description | user_copy (descriptive) |
|------|-------------|-------------------------|
| WHALE_NOTIONAL_THRESHOLD | notional ≥ τ_market | Large trade by dollar size |
| WHALE_VOLUME_SHARE | ≥ 5% of 24h market volume | Unusually large share of recent volume |
| WHALE_PRICE_IMPACT | impact ≥ 25 bps | Moved price more than typical |
| WHALE_WATCHED_WALLET | wallet on user/org watchlist | Activity from watched wallet |
| WHALE_CLUSTER_BURST | ≥3 whale trades same market in 10m | Cluster of large trades |
| WHALE_CONCENTRATION | wallet >15% OI change (when OI available) | Large position shift |

Do not add insider / “smart money trade” reason codes here.

## 7. Dedup fingerprint

```text
fingerprint = sha256(market_id || wallet || side || round(notional,2) || floor(trade_ts/60))
```

Duplicate fingerprint within **15 minutes** is suppressed (reuse alert-dedup semantics; see future `08_BASIC_WHALE_ALERTS.md`).

## 8. Feed ordering + API

**Sort:** `trade_ts DESC`, then `whaleScore DESC`, then `notional_usd DESC`. Cursor pagination on `(trade_ts, fingerprint)`.

### `GET /markets/intelligence/whales`

| param | type | default |
|-------|------|---------|
| minScore | float | 70 |
| minNotional | usd | 5000 |
| marketId | string | all |
| wallet | address (normalized) | all |
| reasonCode | enum | all |
| cursor | string | — |
| limit | int | 50 (max 100) |

Response fields (minimum): fingerprint, wallet, marketId, marketTitle, outcome, side, price, size, notionalUsd, tradeTs, whaleScore, reasonCodes[], displayName (if public), freshness, provenance/source.

Flag off → 404 or empty with `feature_disabled` per platform convention.

## 9. Storage

| table | role |
|-------|------|
| `intel_trades` | Normalized wallet-attributed public trades from Data API `/trades` |
| `intel_whale_events` | Whale candidates: score, reason codes, fingerprint, evidence refs |

No secrets; public-market data only. Retention/cost caps in Launch / Data Sources docs.

## 10. Feature flag

`intelligence.whale_feed` — Internal → staff → beta → public read.

## 11. Fixtures

Formula changes gated by **`testdata/whale_feed_vectors.yaml`**. Do not embed bulk golden-vector or calibration tables in this Markdown.

## 12. C4 placement

Container: Markets BFF. Component: `intelligence/trades` (+ Data API adapter). See [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md).

## 13. Acceptance criteria

- [ ] Wallet on whale events only from Data API `/trades` (or documented wallet-bearing equivalent); WS alone never supplies wallet.
- [ ] τ_market + Launch weights (0.40 / 0.35 / 0.25) match `intelligence_params_v1.yaml`.
- [ ] `wallet_prior` / `timing_novelty` not required for Launch candidate path.
- [ ] Dedup fingerprint + 15m suppression verified.
- [ ] `GET /markets/intelligence/whales` filters/sort/cursor match §8; OpenAPI aligned.
- [ ] Persists to `intel_trades` / `intel_whale_events`.
- [ ] Gated by `intelligence.whale_feed`.
- [ ] `testdata/whale_feed_vectors.yaml` tests green; no Markdown golden_vector bulk tables.
- [ ] No auto-copy CTA, no insider labels, no gambling-style copy.

## Cross-references

- [INTELLIGENCE_LAUNCH_V1.md](./INTELLIGENCE_LAUNCH_V1.md)
- [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md)
- [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](./POLYMARKET_INTELLIGENCE_DATA_SOURCES.md)
- [02_WALLET_SEARCH.md](./02_WALLET_SEARCH.md) · [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md)
- [WHALE_AND_LARGE_TRADE_DETECTION.md](./WHALE_AND_LARGE_TRADE_DETECTION.md) (historical)
- [ADR-008](../architecture/adr/ADR-008-SHARED-SIGNAL-ENGINE.md) · [ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
