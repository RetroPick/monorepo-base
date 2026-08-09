# WALLET SEARCH

**Status:** reviewed  
**Owner:** intelligence-lead  
**Last updated:** 2026-08-09  
**Product:** RetroPick Markets V1  
**Wave/Tier:** Smart Money Intelligence Launch V1

## Description

Launch V1 authority for **Wallet Search**: resolve a public trader by **EVM address** or **public name/pseudonym** via Polymarket Gamma `GET /public-search`, with address normalization, BFF caching, and rate-limit awareness. Clients answer **WHO** after a whale card—without deanonymizing users or inventing addresses.

Sits beside [01_WHALE_TRADE_FEED.md](./01_WHALE_TRADE_FEED.md) (entry) and [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md) (detail). Production clients call RetroPick only; Gamma is BFF-proxied per ACL.

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | BFF wallet search adapter; fe-v1 search box / whale “view wallet”; agents implementing Launch Feature 2. |
| **What** | Exact address lookup + public name search via Gamma `/public-search`; normalize addresses; return ranked public matches. **Not** KYC, real-world identity inference, or client→Gamma direct calls. |
| **When** | On user query from whale feed, navigation, or search UI; cache TTL serves repeats under rate limits. |
| **Where** | Spec: this doc. C4: [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md) → `intelligence/wallets` + Gamma adapter. Upstream: [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](./POLYMARKET_INTELLIGENCE_DATA_SOURCES.md). |
| **Why** | Growth loop **WHO**: connect a trade to a searchable public profile without deanonymization. |
| **How** | Normalize/validate query → cache lookup → Gamma `/public-search` (or direct profile hydrate for exact address) → map to RetroPick search DTO → profile deep-link. |

### Worked example

User taps a whale-feed wallet or types a public username. BFF normalizes or searches Gamma, returns public display name + address stubs. Selecting a row opens [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md). Invalid hex → `invalid_address`; empty upstream → `not_found`.

## 1. Purpose

Low-cost discovery of public Polymarket profiles/addresses for the Smart Money growth loop.

## 2. Growth-loop position

**WHO** — after WHAT ([01_WHALE_TRADE_FEED.md](./01_WHALE_TRADE_FEED.md)); before ARE THEY GOOD ([04_WALLET_PERFORMANCE_METRICS.md](./04_WALLET_PERFORMANCE_METRICS.md)).

## 3. Never V1 (hard reject)

| Capability | Status | Authority |
|------------|--------|-----------|
| Deanonymize / infer real-world identity | **reject** | Privacy / product policy |
| Invent or fabricate wallet addresses | **reject** | No placeholder addresses in product/docs |
| Auto-copy from search results | **reject** | ADR-009 |
| Client direct Gamma/Data calls in prod | **reject** | ACL |
| Gambling / “guaranteed winner” copy | **reject** | Product tone |

## 4. Upstream

| Source | Use |
|--------|-----|
| Gamma `GET /public-search` | Name / pseudonym / public profile search (CAP-004) |
| Exact address | Normalize → optional Gamma profile fetch / hydrator seed; if no public profile, still allow address-keyed profile route |

Official semantics and rate limits: [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](./POLYMARKET_INTELLIGENCE_DATA_SOURCES.md) and [API_SDK_AND_ENDPOINT_REGISTRY.md](../polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md). Revalidate on upstream change—do not hard-code undocumented behavior.

## 5. Address normalize

Before lookup or persistence:

1. Trim whitespace; reject empty.
2. If query looks like address: require `0x` + 40 hex digits (case-insensitive).
3. Store/compare as **EIP-55 checksum** when valid; lowercase hex for equality fallback.
4. Non-address queries treated as **name search** (Unicode trimmed; length bounds per Gamma/OpenAPI).

Never invent checksums for invalid input—return `invalid_address`.

## 6. API contract

### `GET /markets/intelligence/wallets/search`

| param | type | notes |
|-------|------|-------|
| q | string | required; address or public name |
| limit | int | default 10, max 25 |
| cursor | string | optional if Gamma/BFF supports paging |

**Response shapes**

| case | HTTP / body |
|------|-------------|
| exact address hit | 200; single primary match + optional name aliases |
| name search | 200; `matches[]` (address, displayName, profileImage if public) |
| multiple matches | 200; ranked list; client disambiguates |
| invalid address | 400; `code: invalid_address` |
| not found | 200 empty `matches` or 404 `not_found` (pick one OpenAPI enum and stick to it) |
| rate limited upstream | 503 / 429 with `Retry-After` + stale cache if any |
| flag off | feature_disabled |

Do not return private emails, KYC, or non-public metadata.

## 7. Cache + rate-limit awareness

| concern | Launch rule |
|---------|-------------|
| Cache key | `normalize(q)` + limit |
| TTL | Short positive TTL for hits (e.g. 60–300s); negative cache shorter for misses |
| Coalesce | Singleflight identical in-flight `q` |
| 429 | Exponential backoff + circuit breaker; serve stale within grace |
| Budget | Bound QPS from BFF; never fan-out per UI keystroke without debounce guidance |
| Client | Debounce search UI; never hit Gamma from browser in prod |

Design **below** published Gamma limits (Data Sources)—not at the ceiling.

## 8. Feature flag

Share **`intelligence.wallet_profile`** with [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md). Search without profile hydrate is allowed when flag is on; deep-link still lands on profile route.

No separate one-flag-per-widget.

## 9. Domain / UX states

- Loading / results / empty / invalid / degraded (stale) / disabled.
- Results show public display name + abbreviated address only.
- CTA: open profile—not follow/copy.

## 10. C4 placement

Component: `intelligence/wallets` (search handler) → Gamma adapter. See [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md).

## 11. Security / privacy

Public data only. No logging of attempts to reverse-map wallets to legal identity. Redact nothing secret here—but do not enrich with off-platform PII.

## 12. Acceptance criteria

- [ ] `GET /markets/intelligence/wallets/search` OpenAPI-aligned with §6 cases.
- [ ] Address normalize + `invalid_address` behavior tested.
- [ ] Gamma `/public-search` used for name path; BFF-only upstream.
- [ ] Cache/singleflight/429 backoff present; client debounce documented for fe-v1.
- [ ] Shares `intelligence.wallet_profile` flag.
- [ ] No invented addresses in fixtures or UI mocks (synthetic test keys only in testdata if needed, clearly marked).
- [ ] No auto-copy or deanonymization copy.

## Cross-references

- [INTELLIGENCE_LAUNCH_V1.md](./INTELLIGENCE_LAUNCH_V1.md)
- [INTELLIGENCE_C4_MODEL.md](./INTELLIGENCE_C4_MODEL.md)
- [POLYMARKET_INTELLIGENCE_DATA_SOURCES.md](./POLYMARKET_INTELLIGENCE_DATA_SOURCES.md)
- [01_WHALE_TRADE_FEED.md](./01_WHALE_TRADE_FEED.md) · [03_WALLET_PROFILE.md](./03_WALLET_PROFILE.md)
- [WALLET_PROFILING_AND_SMART_MONEY.md](./WALLET_PROFILING_AND_SMART_MONEY.md) (historical aggregates)
- [ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
