# Markets Web Read Terminal — Phase 1.2 System Design

**Status:** frozen for Phase 1.2 implementation  
**Base:** PR #7 merge SHA `3febd9eeb5ee203e348e33c2373ab37348cabba9`  
**Access date:** 2026-07-30  
**OpenAPI contract:** `schemas/openapi/markets-v1.yaml` v1.1.0

## 1. Scope and non-goals

### In scope

- Mobile-first, read-only Polymarket discovery terminal in `apps/web`
- Typed client in `packages/polymarket` generated from OpenAPI
- Event catalog, event detail, market detail, order book snapshot, price history, health, signals
- Freshness/provenance/degraded-state UX driven by BFF responses
- Capability-gated navigation (no fake trading, portfolio, or realtime)

### Non-goals

- Order placement, builder signing, deposits, withdrawals
- Browser-direct Gamma/CLOB/Data API calls
- Public WebSocket realtime (deferred to Phase 1.3)
- PRISM, Android, legacy epoch MarketEngine
- Global search without a projection-backed endpoint

## 2. Functional requirements

| ID | Requirement | Source |
|----|-------------|--------|
| FR-DISC | Paginated event discovery with provenance | OpenAPI `listMarketsEvents` |
| FR-EVT | Event detail with nested markets | `getMarketsEvent` |
| FR-MKT | Market detail with resolution rules | `getMarketsMarket` |
| FR-BOOK | Outcome-token order book snapshot | `getMarketsOrderBook` |
| FR-HIST | Sparse price history (no forward-fill) | `getMarketsHistory` |
| FR-HEALTH | Liquidity health components | `getMarketsMarketHealth` |
| FR-SIG | Deterministic signals when `intelligence=true` | `listMarketsSignals` |
| FR-CAP | UI gates from `getMarketsCapabilities` | CapabilitiesResponse |
| FR-ELIG | Future-trading eligibility display | `getMarketsEligibility` |

## 3. Non-functional requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MOB | Usable from 360px width | Mobile-first shell |
| NFR-DEC | Financial values as decimal strings end-to-end | No JS float math |
| NFR-HON | Capability honesty | No live labels without backend flag |
| NFR-BFF | Single read authority | Browser → Go BFF only |
| NFR-ETAG | Conditional GET support | Client preserves ETags |
| NFR-TO | Bounded request timeouts | 15s default, abortable |
| NFR-POLL | Visibility-aware polling | Pause when tab hidden |

## 4. Expected read traffic assumptions

- **Discovery:** low–moderate; catalog cached 60–120s; ETag reduces bandwidth
- **Detail pages:** moderate; medium stale (30–60s) for metadata
- **Order book:** short polling (5–10s) when tab visible and market open
- **Price history:** medium cache; refetch on interval change only
- **Capabilities/eligibility:** session-level; 60s stale
- **Signals:** bounded poll (30s) only when `intelligence` capability is true

Assumption: Phase 1.2 is read-only public traffic; no authenticated burst patterns.

## 5. Container-level architecture

```mermaid
flowchart TB
  subgraph browser["Browser (Next.js shell + React Router SPA)"]
    UI[Markets UI]
    QC[TanStack Query cache]
    CL[@retropick/polymarket client]
    UI --> QC --> CL
  end
  subgraph edge["Edge / nginx"]
    PROXY["/api/v1/* proxy"]
  end
  subgraph bff["Go BFF apps/backend"]
    H[markets.Handler]
    S[markets.Service]
    ACL[gamma/clob anti-corruption]
    PG[(Postgres projections)]
    H --> S --> ACL
    S --> PG
  end
  subgraph upstream["Polymarket (venue)"]
    G[Gamma API]
    C[CLOB API]
  end
  CL -->|HTTPS same-origin or NEXT_PUBLIC_API_URL| PROXY --> H
  ACL --> G
  ACL --> C
```

## 6. Public read data flow

1. React component issues TanStack Query fetch via `@retropick/polymarket`
2. Client calls `{baseUrl}/api/v1/markets/...` with `Accept: application/json`
3. Go handler validates params, reads projection or live upstream via anti-corruption layer
4. Response includes `freshness`, `provenance`, decimal-string prices/sizes
5. Client maps HTTP errors to typed error classes; UI renders state-specific components
6. ETag on event list enables 304; client returns cached body

**Invariant:** No React component imports Gamma/CLOB URLs or upstream SDKs.

## 7. Cache ownership

| Layer | Owner | Responsibility |
|-------|-------|----------------|
| Postgres projection | Go sync worker | Catalog durability, signal envelopes |
| Go in-process | `markets.Service` | Bounded upstream fetch, stale policy |
| HTTP | Go handler | `Cache-Control`, `ETag` on list reads |
| Client ETag map | `@retropick/polymarket` | Per-URL conditional GET (in-memory, per session) |
| TanStack Query | `apps/web` | Stale times, polling, deduplication, visibility pause |

Browser does **not** own upstream normalization or retry policy beyond explicit bounded client retries.

## 8. OpenAPI / type-generation boundary

- **Source of truth:** `schemas/openapi/markets-v1.yaml`
- **Generator:** `openapi-typescript` (pinned in `packages/polymarket`)
- **Output:** `packages/polymarket/src/generated/api.ts` (do not hand-edit)
- **Command:** `pnpm --filter @retropick/polymarket generate`
- **CI gate:** `scripts/check-markets-openapi-drift.sh`
- **Transport:** thin `MarketsClient` class; no React dependency

`packages/polymarket` is a **RetroPick normalized client**, not an upstream Polymarket SDK wrapper.

## 9. Browser / server rendering boundary

### Evidence: hybrid Next.js + React Router

- `apps/web/app/[[...slug]]/page.tsx` — Next.js catch-all, `ssr: false`
- `apps/web/src/App.tsx` — React Router `BrowserRouter` with product routes
- Markets routes: `apps/web/src/products/markets/marketsRoutes.tsx`

**Authoritative Markets route tree:** React Router under `src/products/markets/`, not Next.js App Router file routes.

### Rendering strategy

| Surface | Strategy | Rationale |
|---------|----------|-----------|
| Shell layout | Client | Bottom nav, capability gates need client context |
| Event catalog | Client + Query prefetch | SPA; no SSR data loader today |
| Event/market detail | Client | Polling, outcome selection, charts |
| Charts / order book | Client lazy | `lightweight-charts` is browser-only |

Phase 1.2 does not add Next.js RSC data loaders; all BFF reads go through the typed client in the browser (or future server actions in Phase 1.3+).

## 10. Error and degraded-state model

| State | Trigger | UX |
|-------|---------|-----|
| Fresh | `freshness.state === "fresh"` | Normal display + "updated X ago" |
| Delayed | age > soft threshold, still fresh | Amber indicator |
| Stale serviceable | `freshness.state === "stale"` | Banner + cached data |
| Degraded | `health.ok && health.degraded` | Partial data warning |
| Resyncing | `freshness.state === "resyncing"` | Spinner + retry |
| Unavailable | 503 / `unavailable` | Empty state + retry |
| Upstream | 502 `UpstreamUnavailable` | Explain venue unreachable |
| Validation | 400 | User-safe message |
| Not found | 404 | Dedicated empty |
| Ineligible | `eligible === false` | Trading CTA disabled with reason |

Request IDs from `error.requestId` shown in diagnostic footer (not stack traces).

## 11. Security and privacy boundaries

- No private keys, seeds, or builder credentials in browser
- `NEXT_PUBLIC_*` only for public API base URL and product mode
- External text escaped via React default; no `dangerouslySetInnerHTML` for upstream content
- Image hosts allowlisted in `next.config.mjs` (Polymarket CDN added for Phase 1.2)
- Links use `rel="noopener noreferrer"` for external targets
- Capability flags are **display gates**, not authorization — server enforces on writes (Phase 2+)

## 12. Observability

- Client logs errors with request ID to console (dev) / existing error boundary (prod)
- Go BFF: chi request ID middleware, markets metrics package
- No new paid APM in Phase 1.2
- Frontend: route-level error boundaries; query `meta` for last fetch time

## 13. Deployment topology

| Environment | Web | API |
|-------------|-----|-----|
| Local | `pnpm dev:web` :3000 | Go API :8080; `NEXT_PUBLIC_API_URL=http://localhost:8080` |
| Production | Vercel (standalone Next) | VPS/Fly + nginx `/api/v1` proxy |
| Same-origin | Optional via nginx reverse proxy | Browser uses relative `/api/v1` when `NEXT_PUBLIC_API_URL` empty |

**Can Markets use same-origin `/api/v1` in production?** Yes, when nginx proxies API and web share origin; otherwise absolute `NEXT_PUBLIC_API_URL`.

**Local dev API reach:** `NEXT_PUBLIC_API_URL` or `VITE_API_URL` via `apps/web/src/lib/runtimeEnv.ts`.

## 14. Failure-mode table

| Failure | Detection | User impact | Mitigation |
|---------|-----------|-------------|------------|
| Gamma down | 502 upstream | Catalog unavailable | Stale projection if within policy |
| CLOB book down | 503 data unavailable | Order book empty state | Stop polling; show reason |
| Postgres lag | readiness degraded | Stale banner | Worker catch-up |
| Invalid upstream JSON | 502/503 | Error state | ACL rejects; no raw forward |
| Network timeout | client abort | Retry button | Bounded timeout + backoff |
| Malformed client params | 400 | Inline validation | OpenAPI param limits |
| Tab background | Page Visibility API | Polling paused | Resume on focus |

## 15. Phase 1.3 and Phase 2 extension seams

| Seam | Phase 1.2 | Future |
|------|-----------|--------|
| Realtime | Polling only; `capabilities.features.realtime=false` | WebSocket hub + durable envelopes |
| Trading | Disabled CTA | CLOB V2 builder path (see builder doc) |
| Search | Deferred | OpenAPI `searchMarkets` + projection |
| SSR prefetch | Client-only | Next.js server loaders optional |
| Android | Shared `@retropick/polymarket` | Kotlin wrapper over same OpenAPI |

## 16. Decisions and rejected alternatives

| Decision | Rationale | Rejected |
|----------|-----------|----------|
| React Router for Markets | Already wired in `App.tsx`; minimal churn | Migrating to Next App Router file routes |
| openapi-typescript | Lightweight, deterministic, no runtime codegen framework | Hand-maintained DTOs; orval full client |
| TanStack Query | Already in dependencies; visibility + polling | SWR, raw useEffect |
| Client-side reads | `ssr: false` on catch-all; no RSC loader infra yet | Browser-direct Polymarket |
| Keep `packages/polymarket` name | ADR not required; package is RetroPick client | Rename to `@retropick/markets-client` |
| Polling not "realtime" | `capabilities.realtime=false` | WebSocket placeholder |

## Design questions (repository evidence)

| Question | Answer |
|----------|--------|
| Router? | **Hybrid:** Next.js 14 catch-all (`app/[[...slug]]`) hosts a **React Router** SPA (`src/App.tsx`). Not Next App Router for Markets pages. |
| Authoritative Markets routes? | `apps/web/src/products/markets/marketsRoutes.tsx` |
| Same-origin `/api/v1` in prod? | **Yes** when nginx proxies; else `NEXT_PUBLIC_API_URL` |
| Local Go backend? | `NEXT_PUBLIC_API_URL=http://localhost:8080` (see `runtimeEnv.ts`, `next.config.mjs` Vercel guard) |
| Typed API code location? | `packages/polymarket` (generated types + `MarketsClient`) |
| `packages/polymarket` nature? | **RetroPick normalized BFF client**, not upstream SDK |
| API client generator? | **Added:** `openapi-typescript` in Phase 1.2 |
| Server-renderable components? | Shell metadata via Next layout; Markets pages are client-rendered |
| Browser polling required? | Order book, signals (when enabled), capabilities refresh |
| Cache responsibilities? | See §7; Query stale times in `marketsQueryOptions.ts` |
| Request ID on failure? | `MarketsApiError.requestId` → `DataStateFooter` component |
