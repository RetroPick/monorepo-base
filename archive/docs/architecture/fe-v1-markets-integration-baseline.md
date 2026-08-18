# fe-v1 Markets V1 integration baseline

Captured during Phase FEV1 migration (PR #8 correction). Documents the state before and after consolidating Markets V1 into the canonical `apps/fe-v1` application with legacy UI preserved.

## Active source tree (after migration)

| Path | Role |
| --- | --- |
| `apps/fe-v1/` | Canonical Markets V1 Next.js application (`@retropick/markets-v1`) |
| `apps/fe-v1/app/` | Next.js App Router shell (`[[...slug]]`, `ssr: false`) |
| `apps/fe-v1/src/` | Legacy fe-v1 React Router UI + Phase 1.2 feature layer |
| `apps/fe-v1/src/features/markets/` | Polymarket BFF read integration (client, queries, adapters, components) |
| `packages/polymarket/` | Shared OpenAPI types and `MarketsClient` |
| `apps/web/` | **Removed** — zero tracked files after migration |

## Legacy source tree (before promotion)

Legacy visual source lived at `apps/web/sources/fe-v1/src/` (nested snapshot). It was promoted to `apps/fe-v1/src/` and the nested snapshot removed from Git tracking.

Key legacy surfaces preserved:

- `Header`, `Footer`, desktop and mobile navigation
- `MarketsAll` three-column discover layout (mock verticals retained for non-Polymarket tabs)
- `MarketCard` variants and `MarketDetail` grid
- Wallet shell (honest disconnected state; no auto-connect for Polymarket routes)

## Phase 1.2 reusable artifacts

| Artifact | Location |
| --- | --- |
| OpenAPI-generated types | `packages/polymarket/src/generated/` |
| `MarketsClient` | `packages/polymarket/src/client.ts` |
| Query keys / options / hooks | `apps/fe-v1/src/features/markets/queries/`, `hooks/` |
| Decimal / freshness / errors | `apps/fe-v1/src/features/markets/lib/` |
| `FreshnessBadge`, `DataState`, `PriceChart`, `OrderBookPanel` | `apps/fe-v1/src/features/markets/components/` |
| View-model adapters | `apps/fe-v1/src/features/markets/adapters/eventToMarket.ts` |
| OpenAPI drift CI | `scripts/check-markets-openapi-drift.sh` |
| Network boundary tests | `apps/fe-v1/src/features/markets/contract/` |
| Builder V2 architecture doc | `docs/architecture/polymarket-builder-v2-integration.md` |

Removed from rendered app: generic `MarketsShell` and `src/products/markets/*` route tree from PR #8.

## Route ownership

| Route | Component | Data source |
| --- | --- | --- |
| `/app/markets/all` | `MarketsAll` → `PolymarketDiscoverPanel` (default vertical) | BFF `listEvents` |
| `/app/events/:eventId` | `EventDetailPolymarket` | BFF `getEvent` |
| `/app/market/:id` | `MarketDetailRouter` → `MarketDetailPolymarket` or legacy `MarketDetail` | BFF / legacy |
| `/app/signals` | `SignalsPolymarket` | BFF signals (capability-gated) |

Route components live under `apps/fe-v1/src/views/` (renamed from `pages/` to avoid Next.js Pages Router collision).

| `/markets/*` | Redirects to `/app/*` equivalents | — |

## Data-flow boundary

```
Legacy fe-v1 UI (Header, MarketCard, detail pages)
  → feature hooks (TanStack Query)
  → view-model adapters (eventToMarket)
  → @retropick/polymarket MarketsClient
  → RetroPick Go BFF /api/v1/markets/*
  → PostgreSQL projections
  → Polymarket Gamma/CLOB (server-side only)
```

The browser must never call `gamma-api.polymarket.com`, `clob.polymarket.com`, or related upstream hosts directly. Enforced by `networkBoundary.test.ts`.

## Cache and freshness

- TanStack Query stale times and polling configured in `marketsQueryOptions.ts`
- ETag support in `MarketsClient` for conditional GET
- `FreshnessBadge` surfaces BFF provenance (`observedAt`, degraded/stale states)
- Visibility-aware refetch via Query defaults in `AppProviders`

## Execution paths disabled (Phase 1.2)

| Capability | Status |
| --- | --- |
| Trading / bet submission | Disabled — `MarketCard` `discover` variant skips `BetModal` |
| Deposits / withdrawals | Not wired in Polymarket routes |
| Builder execution / relayer | Not invoked |
| Realtime WebSocket | Capability-gated; polling fallback when off |
| Wallet auto-connect | Not triggered on read-only Polymarket surfaces |

## PRISM preservation

PRISM product routes under `src/products/prism/` remain in tree but are not the default deploy surface. `NEXT_PUBLIC_PRODUCT=markets` is the canonical dev/deploy mode for this app.

## Deployment root change

| Before | After |
| --- | --- |
| `apps/web` (package name `web`) | `apps/fe-v1` (package `@retropick/markets-v1`) |
| Docker `apps/web/Dockerfile` | `apps/fe-v1/Dockerfile` |
| Vercel root directory `apps/web` | `apps/fe-v1` |

`pnpm dev:web` remains as an alias to `pnpm dev:fe-v1` for transitional scripts.

## Package identity

- **Filesystem:** `apps/fe-v1`
- **pnpm package:** `@retropick/markets-v1`
- **Legacy alias:** `dev:web` → `dev:fe-v1` (documented transitional debt)

## Tracked-file audit (`apps/web` pre-move)

`git ls-files apps/web` reported **577** tracked paths (not 72,868 — the larger count included untracked `sources/fe-v1/node_modules` on disk). Breakdown:

| Category | Count (approx.) | Action |
| --- | --- | --- |
| `sources/` nested snapshot | 330 | Removed after promotion |
| `src/` application source | 188 | Replaced with legacy promotion + features |
| `node_modules` (tracked) | ~72k deletions staged | Removed from index; `.gitignore` hardened |

## System-design checklist (roadmap.sh)

| Concern | Approach |
| --- | --- |
| Frontend/BFF boundary | All reads via `/api/v1/markets/*`; no upstream Polymarket in browser |
| Source of truth | BFF projections + provenance metadata; UI adapters map to legacy view models |
| Caching / freshness | TanStack Query + ETag; explicit stale/degraded UI |
| Error propagation | `MarketsApiError` → `DataStateBanner` with request ID + retry |
| Degraded behavior | Capability endpoint gates catalog/signals/realtime |
| API compatibility | OpenAPI drift CI against `schemas/openapi/markets-v1.yaml` |
| Security boundary | Read-only phase; trading CTAs disabled |
| Deployment | Single Next standalone image from `apps/fe-v1` |
| Observability | Request IDs in error surfaces; backend metrics unchanged |
| Scalability | Infinite query pagination for event discovery |
