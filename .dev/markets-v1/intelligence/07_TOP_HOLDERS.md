# TOP HOLDERS

**Status:** reviewed
**Owner:** intelligence-lead
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** Smart Money Intelligence Launch V1

## Description

This document is the launch authority for **Top Holders** in RetroPick Smart Money Intelligence Launch V1. It defines a public, market-scoped holder leaderboard (YES/NO sides) sourced from Polymarket Data API holder endpoints with a hard **≤20 holders per token** upstream limit—so clients can answer “who currently holds the largest positions on each side?” with freshness timestamps and optional Smart Money / Follow highlights when those signals are present.

It sits on Market Detail and intelligence drill-down, reinforcing the loop from whale/market context → wallet profile → follow. API: `GET /markets/intelligence/markets/{id}/holders`. Feature flag: `intelligence.holders`. **PUBLIC** (no auth). Synergy with Smart Money and Follow is presentational only—never predictive of outcome truth, never auto-copy.

Read this when implementing holders on market detail, caching holder snapshots, or joining holder rows to wallet scores. Prefer [05_SMART_MONEY_LEADERBOARD.md](05_SMART_MONEY_LEADERBOARD.md) for score math and [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md) for private follow membership—not for holder aggregation.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | Guest and authenticated traders; BFF holders projection; market-detail UI; agents implementing `intelligence.holders`. |
| **What** | Top holders per outcome token (YES/NO), position size/value, freshness timestamp, optional `smartMoneyScore` / `followedByMe` enrichment. **Not** outcome prediction, insider labels, or execution. |
| **When** | On market detail view and refresh cadence (seconds–minutes). Applies when shipping holders panel and concentration summaries that can be derived accurately. |
| **Where** | Spec: this doc. API: `GET /markets/intelligence/markets/{id}/holders`. Upstream: Polymarket Data API `/holders` (limit ≤20/token). Flag: `intelligence.holders`. |
| **Why** | High-shareability market context that funnels users into wallet profiles and follow—without claiming holders “know” the outcome. |
| **How** | Fetch/cache holders per token; attach optional score/follow flags; return `asOf` freshness; degrade gracefully when upstream empty/stale. |

### Scope boundaries

- **In scope:** YES/NO top holders; size/value fields available from upstream; `asOf` / stale flags; optional score + followed highlight; derived concentration only when mathematically sound (top-5 / top-10 of **returned** set, labeled as sample-limited).
- **Out of scope:** Full holder census beyond API limit; claiming complete open interest; predictive “smart money will win”; private follow leaks to other users.
- **Depends on:** Polymarket Data API holders; market id → token id mapping; optional Wallet Profile / Smart Money score join; optional Follow (ACCOUNT) for `followedByMe` only for the caller.
- **Upstream constraint:** Data API holders **limit ≤ 20 per token** — do not invent deeper ranks.

## 1. Purpose and growth-loop position

**Primary question:** *Who currently holds the largest positions on each side?*

Growth-loop: market context → open wallet profile → evaluate skill → follow / backtest / paper. Holders are a discovery surface, not a signal that RetroPick endorses an outcome.

## 2. Upstream and freshness

| Item | Launch rule |
|------|-------------|
| Source | Polymarket Data API holders for each outcome token |
| Limit | ≤20 per token (hard); request at most 20 |
| Cadence | Target refresh seconds–minutes for active markets; longer for long-tail |
| Freshness | Response **must** include `asOf` (snapshot time) and `stale` when age > policy threshold |
| Cache | Bounded TTL cache keyed by market/token; respect upstream rate limits |

If holders are unavailable: return empty sides + `degraded: holders_unavailable` — never fabricate ranks.

## 3. Response shape (normative sketch)

```json
{
  "marketId": "...",
  "asOf": "2026-08-09T05:00:00Z",
  "stale": false,
  "yes": {
    "holders": [
      {
        "walletAddress": "0x...",
        "positionSize": "...",
        "positionValueUsd": "...",
        "smartMoneyScore": 84,
        "followedByMe": true
      }
    ],
    "concentration": {
      "top5ShareOfReturned": 0.72,
      "sampleLimited": true,
      "returnedCount": 20
    }
  },
  "no": { "holders": [], "concentration": null }
}
```

- `smartMoneyScore`: omit or null when score unavailable / flag `intelligence.smart_money` off / insufficient sample.
- `followedByMe`: **only** when caller is authenticated; always `false`/omit for guests; never expose other users’ follows.
- Concentration metrics **must** set `sampleLimited: true` whenever upstream truncated at 20.

## 4. Smart Money synergy (presentational)

UI may show Skill / score beside position and optional “Followed” chip for the caller. Optional summary:

```text
High-score observed exposure (among returned holders with scores):
YES 63% · NO 37%
```

Methodology: weight by `positionValueUsd` among holders that have a non-null score in the **returned** set. Label clearly as observed exposure among scored sample—not a forecast. Do not imply holder concentration predicts outcome truth.

## 5. API contract

| Method | Path | Auth | Flag |
|--------|------|------|------|
| `GET` | `/markets/intelligence/markets/{id}/holders` | **PUBLIC** | `intelligence.holders` |

Query params (optional): none required for launch; avoid unbounded `limit` above 20.

## 6. C4 placement

- **Container:** Markets BFF intelligence holders adapter + cache.
- **External:** Polymarket Data API.
- **Clients:** fe-v1 Market Detail holders panel.
- Enrichment reads: wallet score projection (optional), FollowStore (caller-only).

## 7. Frontend UX states

| State | UX |
|-------|-----|
| Loading | Skeleton sides |
| Ready | YES / NO lists with size + optional score |
| Stale | Banner with `asOf` |
| Empty / degraded | Explicit empty copy; no fake whales |
| Row tap | Navigate to Wallet Profile |

No gambling copy (“lock in with the whales”). No one-tap trade from a holder row (ADR-009).

## 8. Never V1

| Capability | Status | Authority |
|------------|--------|-----------|
| Fabricating holders beyond API | **reject** | Upstream honesty |
| Public follow graph via holders | **reject** | [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md) |
| Outcome prediction from concentration | **reject** | Product thesis |
| Auto-copy holder wallets | **reject** | ADR-009 |

## 9. Testing, observability, cost

- Contract tests: ≤20 enforcement; `asOf` present; guest has no `followedByMe` true for others.
- Integration: fixture market with stubbed Data API holders.
- Metrics: `intelligence_holders_fetch_total{result=ok|empty|error}`, cache hit ratio, staleness gauge.
- Cost: cache-first; share rate-limit budget with other Data API consumers.

## 10. Acceptance criteria

1. Public GET returns YES/NO holder lists with freshness metadata.
2. Never returns more than 20 holders per side/token from upstream policy.
3. When scores exist, rows may highlight high-score wallets; methodology documented.
4. Authenticated caller may see `followedByMe` for their follows only.
5. Flag `intelligence.holders` gates the endpoint.

## 11. Cross-references

- [01_WHALE_TRADE_FEED.md](01_WHALE_TRADE_FEED.md), [03_WALLET_PROFILE.md](03_WALLET_PROFILE.md), [05_SMART_MONEY_LEADERBOARD.md](05_SMART_MONEY_LEADERBOARD.md)
- [06_FOLLOW_WALLET.md](06_FOLLOW_WALLET.md)
- [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](POLYMARKET_INTELLIGENCE_DATA_SOURCES.md) (when present)
- [../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
