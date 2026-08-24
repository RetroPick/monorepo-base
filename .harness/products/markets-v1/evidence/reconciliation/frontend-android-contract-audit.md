# R0-FA-002 frontend–Android contract audit

**Audit date:** 2026-08-24
**Authority:** current integration HEAD `cba8e2a4af03a971eaed3553942d42235e14b77f` (main baseline `81f82e246198f1b813492893d7e8f2486c83630e`)
**Feature evidence only:** `65c934cebd686fee0229f062649998443bce5528`
**Merge base:** `a8edf7dd3e7195aea6f1c826fcf2199ead525162`
**Current phase:** `PHASE-2`; this audit does not advance it.

## Scope and decision rule

The feature branch is evidence, not an implementation source. The current canonical contract is OpenAPI `schemas/openapi/markets-v1.yaml` 1.4.0 plus AsyncAPI `schemas/asyncapi/markets-realtime-v1.yaml` 1.0.0. Current main wins whenever a feature DTO, endpoint, error policy, identifier, or realtime protocol differs.

ADR-002 assigns every production Gamma/CLOB/Polymarket Data/upstream-WebSocket call to the Go BFF; ADR-004 requires both clients to use the canonical BFF contract; ADR-005 requires BFF fan-in and REST snapshot recovery rather than direct upstream streams or invented prices. `apps/android` remains the unchanged gitlink; root `android/` is an unapproved duplicate prototype and all of its source is quarantined.

Decisions used below:

- **USE_EXISTING_BFF** — desired behavior is already represented by a canonical operation and can be adopted only through its generated/shared BFF client.
- **REWRITE_CLIENT** — feature has a recognizable need but invokes an upstream or obsolete wire contract; rebuild from current types and behavior.
- **PROVEN_CONTRACT_GAP** — a documented, real requirement is absent; create a contract-first task before any client work.
- **REJECT** — violates an accepted invariant and has no adoption path.
- **QUARANTINE** — fixture/simulation/unapproved root-Android prototype, not evidence of a production contract requirement.

## Canonical semantic baseline

- IDs: public event/market/outcome references are stable RetroPick IDs (`polymarket:event:{upstreamId}`, `polymarket:market:{upstreamId}`, `polymarket:token:{upstreamId}`); never use a bare Gamma id/slug as the canonical client key. See `MarketSummary` and `Outcome` in OpenAPI.
- Numeric data: price, size, book depth, and history price are `DecimalString`; balances, fees, PnL, and notional are `MoneyAmount` integer base units plus currency/decimals. Nullable price/mark fields remain `null` when unavailable; clients must not substitute `0`, a midpoint, or generated chart data.
- Freshness/errors: catalog endpoints are read-cacheable and label `freshness`/`provenance`; event listing has ETag support. Book/history/health may return `data_unavailable` while resynchronizing. Private projections are no-store. The BFF maps failures to `ApiError`, never raw upstream bodies.
- Authorization: eligibility/capabilities are public read metadata. Wallet discovery requires an authenticated session. Balances, private order/fill/position/portfolio reads, and preview/submit/cancel enforce authenticated eligible sessions; `portfolio_read` and `order_submit` are capability gates. `order_submit` is false in the PHASE-2 example.
- Realtime: the only client socket is BFF `/api/v1/markets/realtime` with allowed Origin. Client command is `{command, marketId, tokenId}`. The public envelope is schema version `1`, source `retropick`, `sequence: null`, plus `streamEpoch`/`deliveryCounter`; a gap/resync pauses updates until an `orderbook.snapshot` arrives, then REST remains the fallback.

## Feature-assumption mapping

| # | Feature source / function | Feature upstream URL or action | Feature intent | Canonical equivalent and handler/client | Auth / capability / freshness / error semantics | Decision / owner |
|---:|---|---|---|---|---|---|
| 1 | `packages/polymarket/src/client.ts:getClobMidpoint` (feature lines 169–185) | Direct `GET https://clob.polymarket.com/midpoint?token_id=…`; `parseFloat`, cents rounding, null on error | Display a current midpoint | `getMarketsOrderBook`: `GET /api/v1/markets/markets/{marketId}/orderbook?tokenId=…`; `MarketsClient.getOrderBook`; Go `Handler.GetOrderBook` → `Service.GetOrderBook` | Public read; `OrderBookSnapshot.midpoint` is nullable `DecimalString`, with book `freshness`/`provenance`; 400/404/503 use canonical errors. No direct fallback or float conversion. | **REWRITE_CLIENT** / rp-web + rp-android |
| 2 | `packages/polymarket/src/client.ts:getClobPriceHistory` (187–202) | Direct `GET https://clob.polymarket.com/prices-history?market=…&interval=…&fidelity=…`; maps `t` and float `p` | Chart history | `getMarketsHistory`: `GET /api/v1/markets/markets/{marketId}/history?tokenId=…`; `MarketsClient.getPriceHistory`; `Handler.GetHistory` | Public read; sparse `PriceHistoryResponse.points` carries ISO timestamp, `DecimalString`, `derived`, source, freshness/provenance; no forward-fill or synthetic zero prices; 400/503 are explicit. | **REWRITE_CLIENT** / rp-web + rp-android |
| 3 | `packages/polymarket/src/client.ts:getClobOrderBook` (204–214) | Direct `GET https://clob.polymarket.com/book?token_id=…`; returns raw CLOB JSON | Book depth | Same canonical `getMarketsOrderBook` operation / shared client / `Handler.GetOrderBook` | Public normalized snapshot has canonical market ID, condition ID, token ID, hash, tick/min size, nullable best values, and freshness; direct raw body violates ACL. | **REWRITE_CLIENT** / rp-web + rp-android |
| 4 | `apps/web/src/products/markets/lib/polymarketService.ts:fetchLivePolymarketMarkets` (feature lines 304–465) | Tries obsolete `NEXT_PUBLIC_API_URL/api/v1/markets`, then `corsproxy.io` → Gamma `/markets?active=…`; invents categories, participant count, volume strings and chart points | Discover active markets | `listMarketsEvents` (`GET /api/v1/markets/events`) followed by `getMarketsEvent`/`getMarketsMarket`; current web `getMarketsClient` and `marketsQueryOptions` | Public BFF catalog only; canonical IDs and `MarketSummary` fields, capabilities, provenance/freshness apply; list supports cursor/limit, ETag, 400/502. Product-specific category filtering is not a contract field and must not re-normalize Gamma browser-side. | **REWRITE_CLIENT** / rp-web |
| 5 | `apps/web/src/products/markets/lib/polymarketService.ts:fetchClobPriceHistory` (feature lines 469–486) | Direct CLOB price-history fetch and float/cents conversion | Detail chart | Same `getMarketsHistory` operation and `MarketsClient.getPriceHistory` | Same sparse, DecimalString, provenance and data-unavailable behavior as row 2. | **REWRITE_CLIENT** / rp-web |
| 6 | `apps/web/src/products/markets/lib/polymarketService.ts:fetchClobMidpoint` (feature lines 490–507) | Direct CLOB midpoint fetch; returns number/null | Current price display | Same `getMarketsOrderBook` operation and nullable `OrderBookSnapshot.midpoint` | Same no-fabrication and freshness semantics as row 1. | **REWRITE_CLIENT** / rp-web |
| 7 | `android/lib/polymarket-service.ts:fetchLivePolymarketMarkets` (feature lines 297–500) | Obsolete BFF `/api/v1/markets`, then CORS proxy/Gamma direct call; local mapping and float money presentation | Android prototype catalog | Current catalog operations in row 4; future Android must generate from the same OpenAPI | Root `android/` is not the Android release surface. If a PHASE-5 client is approved, it uses canonical IDs/types and BFF error/freshness semantics only. | **QUARANTINE** / rp-android |
| 8 | `android/lib/realtime-client.ts:RealtimeClient.connect` (82–145) | Direct `wss://ws-subscriptions-clob.polymarket.com/ws/market`, upstream-specific `{assets_ids,type}` subscribe and unsubscribe command | Live book/trade updates | AsyncAPI `realtime` channel and current `MarketsRealtimeClient` in `packages/polymarket/src/realtime.ts`; Go realtime `Handler.ServeWS` | Public BFF socket only, strict Origin allowlist; canonical `{command:"subscribe"|"unsubscribe",marketId,tokenId}` command and envelope validation. Direct upstream WS is an ADR-002/005 violation. | **REWRITE_CLIENT** / rp-android |
| 9 | `android/lib/realtime-client.ts:startSimulationStream` and `handleMessage` (151–264) | Random latency, wallets, trades, whale signals, prices and forced `SYNCHRONIZED` state | Keep a preview visually active after failure | No production equivalent. Real signal list is `GET /markets/intelligence/signals`; whale feed is `GET /markets/intelligence/whales` only when `features.intelligence_whale_feed` is enabled; realtime events are BFF envelopes | A socket failure is `polling_fallback`/delayed, not live. Signals require evidence and can be retracted; no fabricated wallet, trade, price, or signal may become product state. | **QUARANTINE** / rp-android |
| 10 | `android/lib/markets-terminal-client.ts:fetchCapabilities` and `fetchEligibility` (75–123) | BFF URLs are structurally `/api/v1/markets/capabilities` and `/eligibility`, but fall back to hardcoded permissive/intelligence values and random request IDs | Prototype gate display | `getMarketsCapabilities` and `getMarketsEligibility`; current `MarketsClient` methods / `Handler.Capabilities` / `Handler.Eligibility` | Public reads, but unknown eligibility fails closed and capability values are server authority. The prototype must not default capability/eligibility values on network error. | **QUARANTINE** / rp-android |
| 11 | Feature wallet/session, order/portfolio/watchlist UI assumptions identified in reconciliation matrix (`apps/web/**`, root `android/**`) | Browser persistence, simulated submission/cancel and local portfolio/watchlist state | Session, wallet, lifecycle and saved-market UX | Current canonical operations: `/markets/auth/{nonce,siwe,session,logout}`, `/markets/me/wallets`, `/markets/me/balances`, account-wallet preview/relay/link; PHASE-3 order preview/submit/cancel and `/me/orders`/`fills`; PHASE-4 positions/activity/portfolio summary | Session cookie, no client-held upstream secrets; signer and account wallet are distinct. Orders require preview/sign/eligible/capability and unknown submit is reconciled by polling, never auto-resubmitted. Portfolio reads require `portfolio_read`; current web fixtures are explicitly conditional. | **REWRITE_CLIENT** for canonical lifecycle routes; **QUARANTINE** feature-local persistence/simulation / rp-web + rp-android |
| 12 | Feature-side custom schemas/DTO assumptions and root Android copied schema (`android/docs-android/schemas/markets-v1.yaml` in R0 matrix) | Parallel models, bare IDs, numeric money and hand-maintained protocol copies | Shared Web/Android data layer | Sole HTTP contract is `schemas/openapi/markets-v1.yaml`; sole realtime contract is `schemas/asyncapi/markets-realtime-v1.yaml`; TS generated output is `packages/polymarket/src/generated/api.ts` | Generated/shared types preserve canonical IDs, nullable numeric fields, DecimalString and MoneyAmount semantics; no Android/Web-only extension is permitted. | **REJECT** copied contract; **REWRITE_CLIENT** generated consumers / rp-api-contract + rp-android + rp-web |

## Contract-surface audit

| Surface requested by audit | Current contract result | Feature conclusion |
|---|---|---|
| Catalog / canonical identifiers | Events, event detail and market detail exist; normalized IDs and upstream IDs are distinct. | Gamma list and bare ID/slug clients must be rewritten behind BFF. |
| History / chart / midpoint | History and authoritative book snapshot already exist; midpoint is nullable within book rather than a standalone endpoint. | No endpoint gap; direct midpoint/history client code is rejected/rewrite. |
| Order book / depth / market health | Public orderbook and health operations already expose decimal levels, depth, book hash and freshness. | No endpoint gap; direct raw CLOB book is rejected/rewrite. |
| Realtime | BFF WS endpoint plus AsyncAPI commands/envelope and package client exist. | No endpoint gap; direct upstream WS and simulated realtime are rejected/quarantined. |
| Wallets / session / funding | Auth session, wallet discovery/linking, balance read, account-wallet preview/relay are canonical. | Feature local persistent session/funding simulation cannot replace BFF session/cookie and wallet semantics. |
| Eligibility / capabilities | Canonical public reads exist; router applies `RequireAuthenticated` then `RequireEligible` to private/transactional routes. | Any client defaulting to eligible/capable on error is rejected. |
| Preview / submit / cancel / open orders / fills | Contract includes PHASE-3 protected preview-sign-submit and cancel-preview-cancel, plus private projections. | A feature direct submit/cancel must be rewritten; PHASE-2 does not authorize exposing this flow. |
| Positions / portfolio | Contract includes PHASE-4 protected, capability-gated projections and truthful nullable values. | Feature-local portfolio values do not prove an endpoint gap and are not venue truth. |
| Watchlist | No canonical personal watchlist operation exists. Feature evidence is local/prototype state, not an approved requirement. | **Not a proven contract gap.** If a product owner ratifies private cross-client watchlists, open a contract-first task: define auth/ownership, canonical market IDs, CRUD/list semantics, no-store/cache behavior, sync/conflict and deletion behavior, OpenAPI schemas, BFF storage/migration, generated TS/Kotlin clients, then clients. |
| Intelligence / whales / copy | Signals and capability-gated descriptive whale feed exist. No contract permits auto-copy or signal-to-order. | Simulated whale/smart-money feeds are fixtures; direct `trades` calls and any copy/order action are rejected. |

## Proven gaps and rejected bypasses

**Proven contract gaps: 0.** The only absent potential surface found was a personal watchlist, but the feature supplies only prototype-local behavior and no ratified cross-client product requirement; it therefore does not meet the evidence threshold for a gap.

**Rejected/rewrite bypasses: 8 production-relevant assumptions.** Direct CLOB midpoint/history/book (three in shared client, two web duplicates), Gamma through CORS proxy (web and root Android), direct upstream CLOB WebSocket, and feature local/parallel DTO behavior all bypass the authoritative BFF. Root Android simulations and copied artifacts are quarantined rather than treated as requirements.

## Verification record

These checks validate current contract artifacts; this evidence file does not modify OpenAPI, AsyncAPI, generated code, BFF, Web, Android, manifests, or lockfiles.

| Command | Exit | Result |
|---|---:|---|
| `bash scripts/check-markets-realtime-asyncapi-drift.sh` | 0 | PASS — validates AsyncAPI 3.x, `RealtimeEnvelope`, null `sequence`, and transport metadata. |
| `go -C apps/backend test ./internal/markets/...` | 0 | PASS — all Markets packages passed, including OpenAPI conformance, orders, portfolio, realtime, reconciliation, wallet and intelligence tests. |
| `bash scripts/check-markets-openapi-drift.sh` | 1 | BLOCKED, not a contract failure: workspace has no `node_modules`; `openapi-typescript: not found`. The script did not modify generated code. |
| `pnpm --filter @retropick/polymarket test` | 1 | BLOCKED, not a test assertion failure: `vitest` package cannot be resolved because workspace dependencies are absent. |
| `pnpm --filter @retropick/polymarket typecheck` | 2 | BLOCKED, not a type regression: missing workspace tsconfig, `vitest`, Node types, and `node_modules`. |
| `git diff --check` | 0 | PASS — no whitespace errors. |
| `git status --short`, `git diff --name-only`, `git diff --stat` | 0 | PASS — only this evidence file is untracked; no schema/generated/BFF/Web/Android/manifest/lockfile change. |

The three JavaScript checks cannot be made green without installing the repository dependency graph, which this evidence-only task must not change. Re-run them in a provisioned workspace before treating codegen/type-test evidence as complete.

## Handoff

- Contract owner: **rp-api-contract**; this is evidence-only reconciliation.
- Client owners: **rp-web** and **rp-android** must consume BFF/generated contracts rather than port feature network code.
- Backend owner: **rp-backend-markets** is required only if a separately approved contract-first requirement is established; no backend task is created by this audit.
- No product implementation, schema change, or phase advance is authorized by this document.
