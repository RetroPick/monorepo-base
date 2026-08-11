# Polymarket Intelligence Data Sources

**Status:** active
**Owner:** intelligence-lead
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** Smart Money Intelligence Launch V1

---

## Description

This document is the **upstream data-source authority** for Smart Money Intelligence Launch V1. It maps all ten Launch features to Polymarket surfaces, records **official rate limits**, critical limitations (wallet attribution, lag honesty, holders ≤20), and an **assumption registry** with revalidation triggers.

Production path is always:

```text
Polymarket APIs → RetroPick adapters → projections/cache → Markets BFF → fe-v1
```

Frontend and Android **must not** call Data/Gamma/CLOB intelligence endpoints directly in production ([API_SDK_AND_ENDPOINT_REGISTRY.md](../polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md)).

Official bases:

| Service | Base URL |
|---------|----------|
| Gamma API | `https://gamma-api.polymarket.com` |
| Data API | `https://data-api.polymarket.com` |
| CLOB | `https://clob.polymarket.com` |

Do not invent contract addresses here. Trading contract identity remains in the verified registry docs only.

---

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | Adapter/ingest authors (`TradeIngestor`, `WalletHydrator`, `HoldersRefresher`); BFF rate-budget owners; QA writing fixture contracts; agents choosing poll cadence. |
| **What** | Capability matrix for SM-I-001…010; official rate limits; attribution/lag/holders limitations; assumption registry; cache/backoff expectations. |
| **When** | Before writing pollers; on 429 incidents; when upstream docs change; when a feature claims “realtime wallets.” |
| **Where** | This file for intel-specific mapping. Host/auth registry: polymarket API registry. Projections: [INTELLIGENCE_DATA_MODEL.md](INTELLIGENCE_DATA_MODEL.md). |
| **Why** | Wrong authority (WS-invented wallets) or maxing rate limits breaks Launch trust and cost. Honest lag beats fake realtime. |
| **How** | Design **comfortably below** official caps; share one poller budget; classify every field as upstream vs derived; revalidate assumptions on trigger. |

### Worked example

**Happy path.** Whale feed uses Data `GET /trades` only for wallet identity. Poller stays under 200 req/10s trades budget with headroom. UI shows `dataFreshness` / lag banner when poll interval + upstream delay exceeds threshold.

**Failure / Never.** Correlating Market WS last-trade to a guessed wallet. fe calling Data API. Claiming sub-second whale alerts without evidence. Ignoring holders cap and padding fake ranks.

---

## 1. Official rate limits (IP / Cloudflare)

Source: Polymarket docs [Rate Limits](https://docs.polymarket.com/api-reference/rate-limits) (revalidate on change). Limits are per IP over sliding ~10s windows; excess is typically throttled.

### 1.1 Data API — `https://data-api.polymarket.com`

| Scope | Limit |
|-------|-------|
| **General** | **1000 req / 10s** |
| `GET /trades` | **200 req / 10s** |
| `GET /positions` | **150 req / 10s** |
| `GET /closed-positions` | **150 req / 10s** |
| Health `GET /ok` | 100 req / 10s (ops) |

### 1.2 Gamma API — `https://gamma-api.polymarket.com` (intel-relevant)

| Scope | Limit |
|-------|-------|
| General | 4000 req / 10s |
| `GET /public-search` | **350 req / 10s** |
| `GET /events` | 500 req / 10s |
| `GET /markets` | 300 req / 10s |

### 1.3 CLOB public (intel enrichment)

| Scope | Limit (approx / 10s) | Intel use |
|-------|----------------------|------------|
| `GET /prices-history` | 1000 | Backtest marks, charts |
| `GET /book`, `/midpoint`, `/price` | 1500 class | Optional whale enrichment — not Launch-blocking |
| Authenticated trading buckets | Separate per-signer | **Out of Launch intelligence path** |

**Design rule:** Never plan to saturate a bucket. Shared intelligence workers should target ≤50% of the tightest relevant bucket under normal load.

---

## 2. Capability matrix — ten Launch features

| Feature | Req | Primary upstream | Supporting upstream | Notes |
|---------|-----|------------------|---------------------|-------|
| Whale Trade Feed | SM-I-001 | Data `GET /trades` | Gamma market metadata; optional CLOB book | Wallet attribution **only** via Data trades |
| Wallet Search | SM-I-002 | Gamma `GET /public-search` | Exact address normalize locally | No real-world identity inference |
| Wallet Profile | SM-I-003 | Data positions/closed/trades/activity + Gamma profile fields | Catalog mapping | Label upstream vs RetroPick-derived |
| P&L / ROI / Win Rate | SM-I-004 | Data closed-positions + trades | CLOB marks for unrealized | Versioned RetroPick formulas |
| Smart Money Leaderboard | SM-I-005 | Derived from SM-I-004 working set | Optional Data leaderboard if verified | Prefer RetroPick score over opaque upstream |
| Follow Wallet | SM-I-006 | RetroPick user store | — | No upstream write |
| Top Holders | SM-I-007 | Data holders (market) | Gamma titles | Cap honesty ≤20 |
| Basic Whale Alerts | SM-I-008 | Derived whale events | Notification channel | No upstream push API required |
| Paper Copy | SM-I-009 | Derived whale events + CLOB marks | — | Simulation only |
| Quick Backtest | SM-I-010 | Historical trades + CLOB `prices-history` | — | Bounded window |

---

## 3. Endpoint roles (intelligence ACL)

| Upstream | Auth | BFF | Client (prod) |
|----------|------|-----|---------------|
| Data `/trades` | none (public) | MUST | **FORBIDDEN** |
| Data `/positions` | none | MUST | **FORBIDDEN** |
| Data `/closed-positions` | none | MUST | **FORBIDDEN** |
| Data holders / activity / value (as documented) | none | MUST when used | **FORBIDDEN** |
| Gamma `/public-search` | none | MUST | **FORBIDDEN** |
| Gamma events/markets | none | MUST (shared catalog) | **FORBIDDEN** |
| CLOB public book/history | none | MUST when used | **FORBIDDEN** |
| CLOB L2 trading | L2 | Trading path only | Sign only (I7+) |
| Market WS | channel-dependent | SHOULD fan-in server-side if used | **FORBIDDEN** direct |

---

## 4. Critical limitations

### 4.1 Wallet attribution via Data `/trades` only

- Canonical wallet-attributed public trades come from **Data API `/trades`**.
- Market WebSocket (and similar market streams) may provide timing/price/book context.
- **Do not invent wallets** from WS-only trade prints that lack identity.
- If a join of WS timing + Data attribution is used later, document correlation confidence; Launch default may be **Data polling alone**.

### 4.2 No WS-invented wallets

Forbidden pattern:

```text
WS last_trade_price event → fabricate wallet → publish whale card
```

Required pattern:

```text
Data /trades (wallet present) → normalize → classify → publish
```

### 4.3 Lag honesty

| Expectation | Launch stance |
|-------------|----------------|
| Sub-second whale alerts | **Not promised** |
| Poll + classify lag | Publish `sourceLagSeconds` / freshness; UI stale states |
| User-visible copy | “Delayed public data” / “may be outdated” — never “instant insider tape” |

Prefer correctness over fake realtime.

### 4.4 Holders ≤ 20

Top Holders Launch surfaces must assume upstream/practical **top-N ≤ 20** (or whatever official endpoint returns, capped at 20 in product). Do not pad, invent, or extrapolate ranks beyond returned rows. UI copy must not imply complete holder census.

### 4.5 Other Launch-relevant limits

| Topic | Stance |
|-------|--------|
| History windows | Bound backtest/paper lookbacks; do not mirror all Polymarket history |
| Pagination | Follow official cursor/keyset; do not assume undocumented `offset` |
| Profile address semantics | Treat public profile address as Polymarket account/proxy address per docs — revalidate |
| Fees | Only include in P&L when observable; else label estimated/excluded |

---

## 5. Assumption registry

Record assumptions that architecture depends on. Revalidate when triggers fire.

| ID | Assumption | Source | Verified | Revalidation trigger |
|----|------------|--------|----------|----------------------|
| ASS-INT-001 | Data `/trades` includes wallet identity suitable for public attribution | Polymarket Data API docs | 2026-08-09 | Endpoint schema change / missing wallet field incidents |
| ASS-INT-002 | Data general limit 1000/10s; `/trades` 200/10s; positions/closed 150/10s | Official rate-limits page | 2026-08-09 | Docs changelog |
| ASS-INT-003 | Gamma `/public-search` 350/10s supports username/pseudonym search | Official rate-limits + Gamma docs | 2026-08-09 | Search behavior change |
| ASS-INT-004 | Market WS does **not** authorize wallet attribution alone | Architecture decision + docs | 2026-08-09 | WS payload gains verified wallet field |
| ASS-INT-005 | Holders endpoint returns ≤20 useful rows for Launch UX | Product cap + upstream observation | 2026-08-09 | Upstream raises/lowers N |
| ASS-INT-006 | Cloudflare throttles rather than hard-fails when over limit | Official rate-limits note | 2026-08-09 | Observed 429/503 pattern change |
| ASS-INT-007 | CLOB `/prices-history` sufficient for Launch backtest marks | CLOB docs | 2026-08-09 | Granularity insufficient for job SLA |
| ASS-INT-008 | Public Data reads require no API key | Official docs | 2026-08-09 | Auth requirement introduced |
| ASS-INT-009 | Leaderboard may be RetroPick-derived without upstream leaderboard parity | Product | 2026-08-09 | Decision to adopt upstream leaderboard |
| ASS-INT-010 | Paper Copy never needs CLOB L2 credentials | ADR-009 / Launch scope | 2026-08-09 | Any proposal to “auto live copy” |

---

## 6. Shared ingest budget (guidance)

Do **not** create one upstream poller per feature.

| Stream | Suggested ownership | Consumers |
|--------|---------------------|-----------|
| Trades pages | TradeIngestor | Whale, profile recent trades, paper, alerts |
| Positions / closed | WalletHydrator (on-demand + hot set) | Profile, performance |
| Holders | HoldersRefresher (per active market) | Top holders UI |
| Public search | WalletHydrator (request-path + short cache) | Search |
| Prices history | BacktestEngine (job-scoped) | Backtest |

On 429 / throttle: exponential backoff, serve stale projections, set freshness flags — do not invent rows.

---

## 7. Field provenance classes

Every API field shown to users must be classifiable:

| Class | Meaning |
|-------|---------|
| `upstream` | Pass-through Polymarket-reported |
| `derived` | RetroPick formula over upstream |
| `estimated` | Incomplete inputs; show caveats |
| `user` | Follow/alert/paper preferences |
| `simulation` | Paper/backtest virtual |

---

## 8. Cross-references

- [INTELLIGENCE_LAUNCH_V1.md](INTELLIGENCE_LAUNCH_V1.md)
- [INTELLIGENCE_C4_MODEL.md](INTELLIGENCE_C4_MODEL.md)
- [INTELLIGENCE_DATA_MODEL.md](INTELLIGENCE_DATA_MODEL.md)
- [API_SDK_AND_ENDPOINT_REGISTRY.md](../polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md)
- [ADR-002 Anti-Corruption Layer](../architecture/adr/ADR-002-POLYMARKET-ANTI-CORRUPTION-LAYER.md)
- Official: https://docs.polymarket.com/api-reference/rate-limits
