# 04 Frontend Architecture

> **App docs:** [`apps/web/README.md`](../../../apps/web/README.md).

## Runtime Model
- Host shell: Next app under `apps/web/app`.
- App body: client-rendered React app via React Router (`src/App.tsx`).
- This is a hybrid runtime: Next provides deployment shell, while route behavior is owned by React Router.

## Route Structure
Defined in `src/App.tsx`:
- Default redirect to `/app/markets/all`.
- Core routes include markets listing, market detail, portfolio, activity, legal pages, and fallbacks.
- Legacy/deprecated path variants are redirected to canonical routes.

## Provider Composition
`src/app/AppProviders.tsx` wraps app with:
- theme provider,
- web3 modal/provider stack,
- tooltip/toast systems,
- language + onboarding + market/all-markets/asset contexts.

This stack centralizes global state and UX primitives before route rendering (`<Outlet />`).

## Data Layer
Main API client: `src/lib/api/retropickApi.ts`.
- Normalized base URL from runtime env helpers.
- Shared fetch wrappers with timeout, retries, and structured `ApiError`.
- Typed request/response models for markets, epochs, portfolio, funding, tx-prepare, and watchlist.

Data orchestration pattern:
- React Query caches API responses.
- Domain hooks/components consume typed client methods.
- Error handling distinguishes HTTP/network/timeout cases.

## Realtime Integration
`src/hooks/useIndexerWebSocket.ts`:
- Connects to backend `/ws` endpoint.
- Supports `lastSeq` persistence/replay recovery.
- Patches market caches optimistically for known event payloads.
- Schedules targeted query invalidation (debounced) plus immediate probability-history invalidation.

## Wallet and Contract Integration
- AppKit/Web3 bootstrap via `Web3ModalProvider`.
- Contract metadata consumed from backend registry endpoints and FE config.
- Trade execution uses wallet-signed txs, with backend prepare/submit endpoints for orchestration.

## Discover/Market/Portfolio Technical Split
- Discover pages transform API market rows into card models and category strips.
- Market detail composes epoch/outcome/probability/chart sources into one view model.
- Portfolio aggregates positions/claims/events/watchlist with enrichment and summary calculations.

## Architectural Intent (Inferred)
- Preserve UX responsiveness using indexed backend data + realtime invalidation.
- Keep wallet interactions explicit and robust across injector/appkit environments.
- Maintain backward-compatible routes and API surface during iterative migration.
