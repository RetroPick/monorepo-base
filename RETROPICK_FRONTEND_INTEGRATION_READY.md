# RetroPick Markets V1 — Frontend Integration Ready System Manual

**Purpose:** Production-grade integration handbook for Web + Android frontend work against the RetroPick Markets V1 backend and Polymarket-native architecture.

**Audience:** RetroPick frontend engineers, Android/Capacitor engineers, backend/API engineers supporting frontend integration, reviewers, QA engineers, and autonomous coding agents.

**Document status:** Integration handoff / engineering execution guide.

**Research and repository baseline:** 2026-08-13.

**Canonical monorepo:** `RetroPick/monorepo-base`.

**Canonical monorepo main SHA at this handoff:** `f10ba0175e4f7f622d1d34c16879d37e0c39870a`.

**Canonical Android gitlink pinned by that monorepo SHA:** `cad0760d7131456774e359565f1715920dff5391`.

**Separate Android repository:** `RetroPick/RetroPick-Android`.

**Important:** This manual deliberately distinguishes **current executable repository truth** from older target/proposal documents. When this manual and old docs disagree, verify current Git, schema, tests, and runtime before coding.

---

# 0. Executive integration decision

RetroPick Markets V1 is a **Polymarket-native product**, not a new exchange and not a fork of one third-party Polymarket terminal.

The frontend integration architecture is:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         POLYMARKET                                  │
│ Gamma │ CLOB REST │ CLOB realtime │ Data API │ Builder │ Polygon   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ upstream only
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│             RETROPICK POLYMARKET ANTI-CORRUPTION LAYER             │
│               apps/backend/internal/markets/**                     │
│                                                                     │
│ normalize │ validate │ reconcile │ freshness │ policy │ provenance │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   GO MARKETS BFF + POSTGRESQL                      │
│                                                                     │
│ catalog │ market data │ health │ realtime │ eligibility │ orders   │
│ positions │ activity │ portfolio │ reconciliation │ capabilities   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
            canonical OpenAPI / AsyncAPI contract
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
┌──────────────────────────┐       ┌──────────────────────────────┐
│ WEB                      │       │ ANDROID                     │
│ apps/web                 │       │ RetroPick-Android           │
│ Next.js + React          │       │ Next.js + React + Capacitor │
│ @retropick/polymarket    │       │ native Android wrapper      │
└──────────────────────────┘       └──────────────────────────────┘
```

The frontend must therefore follow five rules:

1. **BFF-first:** Web and Android consume RetroPick BFF contracts, not raw Polymarket APIs in production.
2. **Contract-first:** `schemas/openapi/markets-v1.yaml` and realtime AsyncAPI define client-visible semantics.
3. **Fail-closed:** eligibility, trading, portfolio, realtime, and other capabilities remain unavailable unless the backend explicitly proves availability.
4. **No client custody:** frontend never receives RetroPick Builder secrets or server credentials, and RetroPick never stores a normal user's private key on the server.
5. **Merge-safe feature islands:** parallel frontend work must be additive and must not modify files owned by active trading/portfolio/Android transport branches unless explicitly assigned.

This document is designed so another engineer can build the read-terminal and presentation integrations without destroying work already produced by the release-agent fleet.

---

# 1. Source-of-truth hierarchy

Use this precedence order every time two files or documents disagree.

## Tier 0 — Executable current state

Highest authority:

- current checked-out Git commit;
- current branch/worktree diff;
- test output;
- CI output;
- running BFF behavior;
- database migrations and constraints;
- production/staging configuration actually loaded at runtime.

Never override executable truth because an older README says something different.

## Tier 1 — Canonical client contracts

- `schemas/openapi/markets-v1.yaml`
- realtime AsyncAPI schema used by `scripts/check-markets-realtime-asyncapi-drift.sh`
- generated API client types under `packages/polymarket/src/generated/`

When adding or changing a frontend-visible field, contract changes happen before consumers.

## Tier 2 — Current Markets specifications

Read from:

```text
.dev/markets-v1/**
.harness/products/markets-v1/**
```

Useful categories include:

```text
.dev/markets-v1/01_EXECUTIVE_PRODUCT_SPEC.md
.dev/markets-v1/02_SCOPE_AND_CAPABILITY_MATRIX.md
.dev/markets-v1/04_REQUIREMENTS_AND_TRACEABILITY.md
.dev/markets-v1/05_NON_FUNCTIONAL_REQUIREMENTS.md
.dev/markets-v1/architecture/**
.dev/markets-v1/backend/**
.dev/markets-v1/android/**
```

However, proposed architecture documents can lag executable implementation. Verify before applying them literally.

## Tier 3 — Current frontend implementation

Web:

```text
apps/web/src/products/markets/**
packages/polymarket/**
```

Android:

```text
RetroPick/RetroPick-Android
```

## Tier 4 — Polymarket reference corpus

```text
references/polymarket/**
```

This is a **pattern library**, not application authority.

## Tier 5 — Engineering skills and review guidance

```text
.agents/skills/**
```

Skills guide implementation quality. They do not override product contracts or repository conventions.

## Tier 6 — ECC

Current `ECC/**` on main is not a complete usable engineering corpus. See the dedicated ECC section later in this document.

## Historical-only sources

Any old architecture centered around:

```text
MarketEngine
Base Sepolia
fe-v1
legacy epoch pools
custom RetroPick Markets outcome issuance
```

is historical for Markets V1. Do not revive it in current Markets frontend work.

---

# 2. Current repository truth versus proposed architecture

This distinction matters particularly for Android.

## 2.1 Current Web truth

Current Web is:

```text
apps/web
Next.js 14
React 18
TanStack Query
wagmi / viem
Reown AppKit
Tailwind
Vitest
Playwright
```

The Markets product tree is:

```text
apps/web/src/products/markets/
├── __tests__/
├── api/
├── components/
├── e2e/
├── fixtures/
├── funding/
├── hooks/
├── intelligence/
├── lib/
├── pages/
├── queries/
├── routes/
├── trading/
└── ...
```

## 2.2 Current Android truth

The monorepo currently pins Android as a Git-linked separate repository.

Approved integration baseline:

```text
RetroPick/RetroPick-Android
SHA cad0760d7131456774e359565f1715920dff5391
```

That repository is currently:

```text
Next.js 16
React 19
Capacitor 8
native Android wrapper under android/
```

It is **not** currently a Kotlin/Jetpack Compose application.

## 2.3 Stale/proposed Android docs

Several `.dev/markets-v1/android/**` and architecture documents describe a future Kotlin/Compose application or `apps/android-markets` target.

Treat those documents as architectural intent, not current implementation instructions.

**Integration rule:**

> Do not rewrite the current Android framework during frontend integration. A Compose migration requires its own ADR, scope, test migration plan, release plan, and explicit authorization.

## 2.4 Current Android remote drift warning

Do not assume `RetroPick-Android/main` equals the monorepo-approved gitlink.

At this handoff the monorepo pins `cad0760d...`, while the independent Android repository has additional/diverged commits.

Always compare before changing the gitlink:

```bash
git -C /opt/retropick-android fetch origin --prune

git -C /opt/retropick-android rev-parse origin/main

git -C /opt/retropick rev-parse HEAD

git -C /opt/retropick ls-tree HEAD apps/android
```

Never advance `apps/android` merely because Android `main` is newer.

---

# 3. Integration objective

The frontend integration program should first deliver a production-quality **read terminal** shared semantically across Web and Android.

## 3.1 Core read-terminal journey

```text
Discover
  ↓
Event
  ↓
Market
  ↓
Outcome selection
  ↓
Historical price/probability chart
  ↓
Orderbook
  ↓
Bid / ask / spread / depth
  ↓
Freshness and market health
  ↓
Capabilities + eligibility
  ↓
Optional wallet/trading presentation only when backend capability allows
```

## 3.2 Why read-terminal first

It creates a stable frontend layer without colliding with active work on:

- real order execution;
- authenticated lifecycle APIs;
- portfolio/PnL semantics;
- Android BFF transport cleanup;
- production realtime transport;
- reconciliation.

## 3.3 Core frontend success condition

A user can:

- browse real normalized Polymarket markets through RetroPick;
- open a canonical event/market deep link;
- understand current implied market pricing;
- inspect historical changes;
- inspect current orderbook;
- understand data freshness and degraded states;
- see when functionality is unavailable;
- use the same semantic model on Web and Android;
- never be shown fabricated data when an upstream/backend dependency is unavailable.

---

# 4. Hard architectural boundaries

## 4.1 Allowed dependency direction

```text
React component
   ↓
feature hook / query
   ↓
RetroPick typed client
   ↓
Go Markets BFF
   ↓
RetroPick adapter
   ↓
Polymarket
```

## 4.2 Forbidden dependency direction

```text
React component
   ├──→ Gamma directly        FORBIDDEN
   ├──→ CLOB REST directly    FORBIDDEN
   ├──→ CLOB WS directly      FORBIDDEN unless explicit approved transport task
   └──→ Data API directly     FORBIDDEN
```

## 4.3 Never put these in frontend

- Builder API secret;
- Builder passphrase;
- backend session signing secret;
- server-held wallet private key;
- operator CLOB credentials;
- unrestricted internal service URL;
- private database credentials;
- geoblock bypass logic.

## 4.4 Frontend is not authority for

- jurisdiction/eligibility;
- trading enablement;
- portfolio enablement;
- venue order state;
- fill truth;
- settlement truth;
- resolution truth;
- current tick-size authority;
- fee-rate authority;
- market-open authority.

The frontend renders backend decisions and user-controlled signing actions.

---

# 5. Current backend-to-frontend contract surface

The shared TypeScript client in `@retropick/polymarket` already exposes the main read-terminal operations.

## 5.1 Current shared client entry point

Web uses:

```text
apps/web/src/products/markets/api/marketsClient.ts
```

which creates:

```text
@retropick/polymarket → createMarketsClient({ baseUrl })
```

Do not replace this with new ad-hoc fetch helpers.

## 5.2 Current typed operations

The shared client exposes:

```text
getEligibility()
getCapabilities()
listEvents()
getEvent()
getMarket()
getOrderBook()
getPriceHistory()
getMarketHealth()
listSignals()
getLiveness()
getReadiness()
```

## 5.3 Current contract types

Useful exported types include:

```text
EligibilityResponse
CapabilitiesResponse
EventsListResponse
EventDetail
EventSummary
MarketDetail
MarketSummary
OrderBookSnapshot
PriceHistoryResponse
MarketHealthSnapshot
SignalsListResponse
HealthResponse
MarketFreshness
FreshnessState
UpstreamProvenance
```

## 5.4 Client behavior already implemented

The shared client already handles:

- request timeout;
- `AbortSignal` cancellation;
- typed API errors;
- HTTP error mapping;
- malformed JSON;
- network failure;
- timeout versus caller abort;
- `Retry-After`;
- `x-request-id`;
- ETag caching for catalog;
- HTTP `304 Not Modified`.

Frontend code should preserve those behaviors instead of bypassing them.

---

# 6. Endpoint integration matrix

| Feature | BFF client method | Frontend status | Integration priority | Notes |
|---|---|---:|---:|---|
| Eligibility | `getEligibility()` | available | P0 | fail closed |
| Capabilities | `getCapabilities()` | available | P0 | backend is authority |
| Event catalog | `listEvents()` | available | P0 | ETag-aware |
| Event detail | `getEvent()` | available | P0 | canonical IDs |
| Market detail | `getMarket()` | available | P0 | canonical normalized shape |
| Orderbook | `getOrderBook()` | available | P0 | snapshot semantics |
| History | `getPriceHistory()` | available | P0 | chart source |
| Health | `getMarketHealth()` | available | P0 | liquidity/freshness |
| Signals | `listSignals()` | available | P2 | Intelligence after core |
| Liveness | `getLiveness()` | available | P1 | operational diagnostics |
| Readiness | `getReadiness()` | available | P1 | degraded state diagnostics |
| Authenticated orders | active branch | reserved | later | do not duplicate |
| Fills/activity | active branch | reserved | later | do not duplicate |
| Portfolio/PnL | pending contract/economics branches | reserved | later | do not define own semantics |
| Real order submit | capability gated/off | reserved | later | controlled venue proof required |

---

# 7. Feature readiness and ownership map

Legend:

```text
GREEN     = safe integration surface now
YELLOW    = implementation exists but reserved/pending review
RED       = do not integrate as production behavior yet
PRESENT   = presentation-only work is safe
```

| Feature | Web | Android | Friend-safe now? |
|---|---|---|---|
| Discover events | GREEN | PRESENT | yes |
| Event detail | GREEN | PRESENT | yes |
| Market detail | GREEN | PRESENT | yes |
| Outcome tabs | GREEN | PRESENT | yes |
| History chart | GREEN contract | PRESENT | yes |
| Orderbook snapshot | GREEN | PRESENT | yes |
| Bid / ask / spread | GREEN derived | PRESENT | yes |
| Health/freshness | GREEN | PRESENT | yes |
| Loading/error/empty | GREEN pattern | PRESENT | yes |
| Capability display | GREEN | PRESENT | yes |
| Eligibility display | GREEN | PRESENT | yes |
| Realtime presentation | partial | PRESENT | cautiously |
| Production Web realtime consumer | partial | n/a | coordinate |
| Wallet styling | partial | PRESENT | styling only |
| Open orders | YELLOW active branch | RED | no |
| Fills | YELLOW active branch | RED | no |
| Cancel lifecycle | YELLOW active branch | RED | no |
| Portfolio | YELLOW active branches | RED | no |
| PnL semantics | YELLOW pending review | RED | no |
| Order submit | RED capability off | RED | no |
| Android production BFF transport | n/a | RED active task | no |
| Android simulation removal | n/a | RED active task | no |
| Android production realtime | n/a | RED active task | no |
| Intelligence expansion | existing but deferred | existing but deferred | not core priority |

---

# 8. Reserved branch registry — do not collide

Before starting any frontend work, fetch the remote and inspect these branches.

## 8.1 Web trading lifecycle

```text
branch: agent/w3-002-web-trading-lifecycle
```

At the handoff it is diverged from current main and carries Web lifecycle changes.

Do not modify these paths in an unrelated frontend integration branch:

```text
apps/web/e2e/markets/e2e-portfolio-lifecycle.spec.ts
apps/web/e2e/markets/helpers.ts
apps/web/playwright.config.ts
apps/web/src/products/markets/__tests__/PortfolioPage.test.tsx
apps/web/src/products/markets/e2e/e2eHarness.ts
apps/web/src/products/markets/pages/PortfolioPage.tsx
apps/web/src/products/markets/trading/__tests__/marketsSigning.test.ts
apps/web/src/products/markets/trading/__tests__/tradingApiClient.lifecycle.test.ts
apps/web/src/products/markets/trading/components/TradingLifecyclePanel.tsx
apps/web/src/products/markets/trading/lib/marketsSigning.ts
apps/web/src/products/markets/trading/lib/tradingApiClient.ts
```

## 8.2 Portfolio availability contract

```text
branch: agent/w3-007-portfolio-contract
```

Reserved paths:

```text
apps/backend/internal/markets/portfolio_pnl_contract_test.go
packages/polymarket/src/generated/api.ts
schemas/openapi/markets-v1.yaml
```

Do not hand-edit the generated client or schema merely to satisfy a frontend mock.

## 8.3 Position economics

```text
branch: agent/w3-008-position-economics
```

Reserved paths include:

```text
apps/backend/internal/markets/positions/**
apps/backend/migrations/000025_*
apps/backend/migrations/position_economics_migration_test.go
apps/backend/migrations/projection_integrity_rollback_test.go
```

## 8.4 Android production transport

The W3-003A scope owns production Android BFF transport, realtime fail-closed behavior, and removal of synthetic fallbacks.

Until it lands, do not rewrite:

```text
lib/markets-terminal-client.ts
lib/realtime-client.ts
lib/polymarket-service.ts
lib/retropick-data.ts
```

unless the engineer is explicitly assigned that transport task.

---

# 9. Merge-safe feature island architecture

Parallel frontend integration should happen in additive islands.

## 9.1 Recommended Web island

Create new code under:

```text
apps/web/src/products/markets/terminal/
├── discovery/
├── event/
├── market/
├── chart/
├── orderbook/
├── health/
├── capability/
├── eligibility/
├── realtime/
├── data/
├── shared/
└── __tests__/
```

Example:

```text
terminal/
├── discovery/
│   ├── MarketExplorer.tsx
│   ├── TerminalEventCard.tsx
│   └── TerminalMarketRow.tsx
├── market/
│   ├── TerminalMarketHeader.tsx
│   ├── OutcomeStrip.tsx
│   └── ResolutionSummary.tsx
├── chart/
│   ├── ProbabilityChart.tsx
│   └── chartModel.ts
├── orderbook/
│   ├── TerminalOrderBook.tsx
│   ├── OrderBookRow.tsx
│   ├── BookDepth.tsx
│   └── bookModel.ts
├── health/
│   ├── HealthBadge.tsx
│   ├── FreshnessNotice.tsx
│   └── healthModel.ts
├── data/
│   ├── useTerminalEvent.ts
│   ├── useTerminalMarket.ts
│   ├── useTerminalBook.ts
│   ├── useTerminalHistory.ts
│   └── useTerminalHealth.ts
└── shared/
    ├── TerminalSkeleton.tsx
    ├── TerminalError.tsx
    ├── TerminalEmpty.tsx
    └── TerminalUnavailable.tsx
```

## 9.2 Why new island instead of editing existing components first

It reduces collisions with:

- current production pages;
- trading branch work;
- future portfolio branch merges;
- E2E harness changes.

## 9.3 Composition bridge

Once the feature island is green, make a **small separate commit** that wires it into existing pages.

For example:

```text
Commit A: add terminal feature island + tests
Commit B: compose terminal into MarketDetailPage
```

If Commit B conflicts during rebase, only the thin composition bridge must be resolved; the feature implementation remains intact.

---

# 10. Web integration architecture

## 10.1 Layering

```text
Page / route
    ↓
Terminal composition component
    ↓
feature hook / query option
    ↓
getMarketsClient()
    ↓
@retropick/polymarket
    ↓
Go BFF
```

## 10.2 Do not create a second API client

Use:

```ts
import { getMarketsClient } from "../api/marketsClient";
```

or existing query hooks/options.

Do not add:

```ts
fetch("https://gamma-api.polymarket.com/...")
fetch("https://clob.polymarket.com/...")
fetch("https://data-api.polymarket.com/...")
```

in production Web code.

## 10.3 Use canonical response types

Prefer:

```ts
import type {
  EventDetail,
  MarketDetail,
  OrderBookSnapshot,
  PriceHistoryResponse,
  MarketHealthSnapshot,
} from "@retropick/polymarket";
```

Do not copy upstream Polymarket response types into components.

## 10.4 Separate domain transformation from rendering

Good:

```text
OrderBookSnapshot
      ↓
bookModel(snapshot)
      ↓
BookViewModel
      ↓
TerminalOrderBook
```

This allows deterministic testing of spread, midpoint, depth, and formatting.

## 10.5 Keep money and probability representation explicit

Never parse monetary accounting values into imprecise binary floating-point when correctness depends on exact value.

UI-only chart coordinates may use numeric values after validated parsing, but authoritative monetary values should remain canonical strings/fixed-point representations until display conversion.

---

# 11. Web query and caching policy

Current query options already define useful defaults.

## 11.1 Catalog

Current pattern:

```text
staleTime ≈ 90s
ETag supported
```

Use infinite/paginated catalog loading rather than loading all markets into one client array.

## 11.2 Event/market detail

Current pattern:

```text
staleTime ≈ 45s
```

Use route IDs as query-key identity.

## 11.3 Capabilities

Current pattern:

```text
staleTime ≈ 60s
```

Do not cache capability decisions for the entire browser session.

## 11.4 Orderbook polling fallback

Current pattern:

```text
staleTime ≈ 3s
poll interval ≈ 8s
background polling disabled
```

The page currently uses polling until it owns a healthy realtime consumer.

## 11.5 Abort requests on navigation

Any page-level market request must be abortable when route IDs change.

This avoids rendering a previous market response into the next market route.

---

# 12. Event discovery integration

## 12.1 Backend method

```ts
client.listEvents({ cursor, limit })
```

## 12.2 UI responsibilities

Render:

- event title;
- market summaries;
- category/tag metadata when present;
- status;
- close/open context;
- freshness;
- provenance where useful;
- pagination/loading state.

## 12.3 Required states

```text
initial loading
page loading
empty catalog
partial page
stale cached catalog
network failure
backend degraded
retrying
```

## 12.4 Discovery rules

- No wallet required for read-only browsing.
- Search/filter must not imply server-supported fields that do not exist.
- Do not fabricate volume, liquidity, or probability from placeholder data.
- Preserve canonical event and market IDs in route links.
- Prefer debounced client search only when searching already-loaded records; server search requires contract support.

## 12.5 Unit tests

Test:

- renders event cards;
- empty list;
- first-load skeleton;
- error with retry;
- stale badge;
- pagination cursor transition;
- canonical links;
- no wallet dependency.

## 12.6 E2E

```text
open Discover
→ receive BFF catalog fixture
→ click event
→ event route loads
→ click market
→ market route loads
```

---

# 13. Event detail integration

## 13.1 Backend method

```ts
client.getEvent(eventId)
```

## 13.2 Event page must distinguish

```text
event metadata
market list
resolution context
status
freshness
upstream provenance
```

## 13.3 Error semantics

- canonical invalid ID → client validation error/empty state;
- `404` → not in RetroPick catalog;
- `429` → rate limited, honor retry-after where surfaced;
- `5xx` → backend/upstream problem;
- network → connectivity error;
- stale cached data + refetch error → render stale data with warning, not blank screen.

---

# 14. Market detail integration

Current `MarketDetailPage.tsx` already demonstrates several required behaviors:

- canonical market ID validation;
- selected outcome token;
- capability-based orderbook availability;
- stale/freshness UI;
- orderbook snapshot polling;
- price selection from book into trade presentation;
- resolution panel;
- desktop trade aside;
- mobile trade sheet.

## 14.1 Integrator rule

Improve/compose around this behavior. Do not rewrite the page from scratch merely to adopt a reference terminal layout.

## 14.2 Market header

Should display:

- question;
- description;
- status;
- freshness;
- close time where available;
- resolution source/rules summary;
- selected outcome;
- current bid/ask/midpoint when available.

## 14.3 Canonical identity

Route identity is RetroPick canonical market ID, not raw Polymarket numeric/slug identity.

Raw upstream IDs belong in provenance/venue references, not the UI routing contract.

---

# 15. Price/probability chart integration

## 15.1 Backend method

```ts
client.getPriceHistory(marketId, {
  tokenId,
  interval,
  fidelity,
})
```

Supported interval type currently includes:

```text
1h
6h
1d
1w
max
```

## 15.2 Chart architecture

```text
PriceHistoryResponse
        ↓
validate points
        ↓
chartModel()
        ↓
normalized display series
        ↓
ProbabilityChart
```

## 15.3 Chart requirements

- selected outcome determines token history;
- route/market change resets old series;
- outcome change does not mix series;
- loading state preserves layout height;
- empty history is not displayed as 0%;
- stale source is visibly stale;
- timestamp timezone is explicit;
- tooltip preserves original timestamp/value;
- chart should not claim market price is objective truth/probability certainty.

## 15.4 Performance

- memoize normalized series;
- do not recompute entire series on pointer move;
- decimate/virtualize when response is very large;
- avoid CSS/layout work per websocket frame;
- use `requestAnimationFrame` for high-frequency visual updates if realtime charting is later added.

## 15.5 Tests

- no data;
- one point;
- unordered timestamps rejected/sorted only if contract permits;
- malformed point ignored/fails closed according to adapter policy;
- outcome switch;
- interval switch;
- stale indicator;
- timezone label;
- tooltip formatting.

---

# 16. Orderbook integration

## 16.1 Backend method

```ts
client.getOrderBook(marketId, tokenId)
```

## 16.2 Display model

Build a pure transformation layer.

Recommended model:

```ts
interface BookViewModel {
  bids: BookRow[];
  asks: BookRow[];
  bestBid: string | null;
  bestAsk: string | null;
  spread: string | null;
  midpoint: string | null;
  observedAt: string;
  freshness: "fresh" | "stale" | "resyncing" | "degraded" | "unavailable";
}
```

## 16.3 Derived metrics

Safe presentation metrics include:

- best bid;
- best ask;
- spread;
- midpoint;
- cumulative depth;
- depth at selected tick bands;
- notional depth;
- book imbalance;
- slippage estimate;
- fillable quantity.

Any advanced metric must have a deterministic test.

## 16.4 Price click behavior

Clicking a row may populate the order ticket price presentation, but it must not submit an order or trigger signing.

## 16.5 Snapshot correctness

A snapshot is not realtime merely because it is recently fetched.

Use labels such as:

```text
Snapshot
Polling
Live
Stale
Resyncing
Unavailable
```

accurately.

---

# 17. Realtime integration

The shared realtime discipline is stricter than many third-party terminals.

## 17.1 Required state machine

```text
idle
  ↓
connecting
  ↓
snapshot_wait
  ↓
live
  ↓
┌──────────────┬─────────────┐
│ degraded     │ resyncing   │
└──────────────┴─────────────┘
       ↓
polling_fallback
```

## 17.2 Non-negotiable invariants

- never label a stream live before an authoritative snapshot;
- never apply a delta to an unknown base state;
- reject malformed prices and sizes;
- reject backward observed timestamps;
- reject stale stream epochs;
- detect duplicate/missing counters when contract supports counters;
- resync on integrity uncertainty;
- preserve market/token subscription identity;
- separate network ingest frequency from render frequency;
- foreground recovery must reacquire/validate snapshot;
- order ticket must know book freshness.

## 17.3 Web implementation principle

Do not open one upstream Polymarket socket per component.

Prefer:

```text
BFF realtime transport
        ↓
shared client/reducer
        ↓
subscription store
        ↓
multiple UI consumers
```

## 17.4 Rendering throttling

Network ingestion may be high frequency.

UI rendering can be throttled independently using:

```text
requestAnimationFrame
memoized selectors
batched state updates
```

without dropping correctness in the reducer state.

---

# 18. Market health and freshness

## 18.1 Backend method

```ts
client.getMarketHealth(marketId, tokenId)
```

## 18.2 Health is server-derived evidence

Do not replace backend health with random or aesthetic client scores.

## 18.3 Useful display states

```text
healthy
thin
volatile
stale
resyncing
unavailable
```

where contractually available.

## 18.4 UI principles

A user should be able to distinguish:

- market is closed;
- market is open but book unavailable;
- BFF is degraded;
- book is stale;
- realtime is resyncing;
- market is thin;
- polling is being used as fallback.

Do not collapse all of these into `Offline`.

---

# 19. Capabilities integration

## 19.1 Backend method

```ts
client.getCapabilities()
```

## 19.2 Capabilities are runtime policy

The frontend must use capability state to decide whether a feature is available.

Examples:

```text
realtime
orderbook read
portfolio read
order submit
intelligence
```

Actual field names must come from generated schema for the current main.

## 19.3 Fail-closed rendering pattern

Bad:

```ts
const trading = data?.trading ?? true;
```

Good:

```ts
const trading = data?.features?.order_submit === true;
```

If the capability request fails, treat gated actions as unavailable.

## 19.4 Capability UI

Prefer explicit user states:

```text
Trading temporarily unavailable
Portfolio data unavailable
Realtime unavailable — using polling
Eligibility unavailable
```

not silent disappearance when user context matters.

---

# 20. Eligibility integration

## 20.1 Backend method

```ts
client.getEligibility()
```

## 20.2 Rule

Eligibility is decided server-side.

Never determine production eligibility solely from:

- browser locale;
- device timezone;
- IP lookup performed by a third-party browser SDK;
- wallet country metadata;
- hard-coded country allowlist in JavaScript.

## 20.3 Fail closed

Unknown means unavailable/not eligible for trading until authoritative checks succeed.

## 20.4 Read-only behavior

Read-only discovery may remain available even when trading is unavailable, subject to product/legal policy.

## 20.5 Tests

- eligible;
- explicitly ineligible;
- unknown jurisdiction;
- API failure;
- timeout;
- stale eligibility version;
- capability false despite eligibility true;
- market closed despite eligibility true.

---

# 21. Error model and degraded UX

Every data surface should implement a consistent state matrix.

## 21.1 State matrix

| Data | Fresh? | Error? | Render |
|---|---:|---:|---|
| none | n/a | no | loading/empty |
| none | n/a | yes | blocking error |
| cached | yes | no | normal |
| cached | stale | no | data + stale warning |
| cached | stale | yes | stale data + retry/error warning |
| live | fresh | stream degraded | last valid data + degraded state |
| none | unavailable | upstream unavailable | unavailable state |

## 21.2 Request IDs

When a BFF error exposes a request ID, include it in diagnostic UI or support-copy action.

Example:

```text
Could not refresh market.
Request ID: req_...
```

Do not expose secrets or raw internal traces.

---

# 22. Provenance UX

RetroPick should preserve provenance without overwhelming normal users.

## 22.1 User-facing places

Suitable provenance placements:

- tooltip near freshness;
- market details panel;
- resolution panel;
- advanced terminal info drawer.

## 22.2 Useful provenance fields

- source/venue;
- observed timestamp;
- freshness;
- market canonical ID;
- upstream market/token identifier in advanced mode;
- resolution source.

## 22.3 Do not invent provenance

Never generate fake ETags, request IDs, observed timestamps, or random health scores.

This is especially important for Android because the approved Android baseline still contains legacy synthetic patterns that are reserved for remediation.

---

# 23. Web presentation architecture

## 23.1 Terminal desktop layout

Recommended desktop composition:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Header / search / account                                           │
├───────────────────────┬────────────────────────┬────────────────────┤
│ market context        │ chart                  │ trade/read panel   │
│ question/rules        │                        │                    │
├───────────────────────┴────────────────────────┼────────────────────┤
│ orderbook / depth / health                     │ ticket             │
├────────────────────────────────────────────────┴────────────────────┤
│ optional tape / holders / diagnostics                               │
└────────────────────────────────────────────────────────────────────┘
```

## 23.2 Mobile layout

```text
Market header
Outcome selector
Chart
Book/health tabs
Resolution
Sticky trade action
Bottom-sheet ticket
```

Do not squeeze desktop columns into mobile.

## 23.3 Touch targets

Minimum target:

```text
44x44 CSS px Web/iOS guidance
48x48 Android guidance where practical
```

## 23.4 Responsive strategy

Mobile first.

Use project/Tailwind breakpoints rather than ad-hoc breakpoints unless a component demonstrably requires one.

---

# 24. Web performance engineering

## 24.1 High-frequency orderbook

Avoid:

- sorting book arrays inside every row component;
- recalculating cumulative depth per row render;
- setting React state for every raw websocket message;
- rebuilding all chart points on hover;
- unstable object props that invalidate all memoized rows.

## 24.2 Preferred pattern

```text
raw message
   ↓
pure reducer
   ↓
canonical store
   ↓
memoized selector
   ↓
RAF-batched presentation snapshot
   ↓
virtualized/memoized rows
```

## 24.3 Lists

For very large catalogs or trade tapes:

- pagination first;
- then virtualization if necessary;
- stable keys;
- do not render 10,000 DOM nodes simply because reference terminal does.

## 24.4 Bundle safety

Ensure reference libraries or upstream SDKs are not accidentally added to production bundle when the BFF already owns that integration.

---

# 25. Web accessibility

Minimum acceptance:

- keyboard navigation;
- visible focus;
- semantic headings;
- table semantics or equivalent accessible book structure;
- color is not the only indication of bid/ask/status;
- screen-reader names for icon controls;
- reduced-motion consideration;
- no inaccessible hover-only information;
- chart summary or alternative textual values;
- error messages associated with actions;
- touch-friendly controls.

Orderbook row price selection must be operable without a mouse.

---

# 26. Web security

## 26.1 Dynamic content

Market titles/descriptions/rules are untrusted external content.

React text rendering is safe by default; do not introduce `dangerouslySetInnerHTML` for market descriptions unless a reviewed sanitizer is required.

## 26.2 Links

Validate external resolution/source links.

For new-window links:

```text
rel="noopener noreferrer"
```

## 26.3 Wallet boundary

- explicit user action triggers signature;
- no background signature request;
- no E2E signer path in production;
- no signature stored as a reusable secret;
- no localStorage Builder credential.

## 26.4 Test-only seams

Any E2E signature injection must be:

- explicit build/test flag;
- disabled by default;
- impossible to activate through URL/query/localStorage in production;
- covered by a negative production-mode test.

---

# 27. Android current architecture and integration strategy

## 27.1 Current stack

At the monorepo-approved SHA, Android is:

```text
Next.js
React
Capacitor
static/web assets
native Android Gradle wrapper
custom native plugins
```

## 27.2 Integration rule

Treat Android as a separate client consuming the same **semantic BFF contract**, not as a copy of Web implementation internals.

Share:

```text
API semantics
field meanings
capability semantics
freshness semantics
error semantics
state-machine semantics
E2E scenarios
```

Do not attempt to share:

```text
React component files via monorepo imports
browser-specific wallet internals
Web route state
Web-only test harness globals
```

## 27.3 Presentation-only safe island

Until production transport remediation lands, safe friend work should prefer new components such as:

```text
components/retropick/markets-read/
├── market-explorer.tsx
├── market-header.tsx
├── probability-chart.tsx
├── orderbook-panel.tsx
├── health-badge.tsx
├── freshness-notice.tsx
├── data-state.tsx
└── models.ts
```

These components should accept data through props rather than importing the legacy Android transport directly.

---

# 28. Android legacy/synthetic transport warning

At the approved Android baseline, `lib/markets-terminal-client.ts` contains patterns that are **not production-authoritative**, including examples of:

- localhost fallback;
- random health/depth generation;
- default-true capabilities;
- default-eligible fallback;
- random request IDs/provenance.

These are exactly the kinds of behavior the Android production transport task is intended to remove.

## 28.1 Friend integration rule

Do not build new UI whose correctness depends on those fallback values.

## 28.2 Presentation adapter seam

Use:

```text
BFF DTO / future production adapter
              ↓
       AndroidReadModel
              ↓
    presentation component
```

During UI development use deterministic fixtures with explicit labels such as `fixture`/`test`, never runtime random fallbacks.

---

# 29. Android production transport requirements — for W3-003A owner

When the reserved production transport task resumes, it must satisfy the following.

## 29.1 HTTP base URL

- configurable by build environment;
- HTTPS required for production;
- no localhost default in release;
- malformed/missing release config fails closed;
- no direct Gamma/CLOB URL.

## 29.2 Capability behavior

Failure must produce unavailable/false, never `true` fallback.

## 29.3 Eligibility behavior

Failure must produce unknown/not-ready, never eligible default.

## 29.4 Realtime

- BFF WebSocket/SSE contract only;
- reconnect with backoff;
- snapshot-first;
- resubscribe after reconnect;
- stale after configured interval;
- malformed frame rejected;
- duplicate/out-of-order counters handled;
- no simulation in release mode.

## 29.5 Tests

Test release build behavior specifically, not only dev mode.

---

# 30. Android build and verification ladder

From the Android repository root:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
npx cap sync android
```

Then:

```bash
cd android
./gradlew :app:lintDebug
./gradlew :app:testDebugUnitTest
./gradlew :app:assembleDebug
```

If release configuration is touched, also run the relevant release variant tasks.

## 30.1 Static safety scans

Examples:

```bash
git grep -nE 'gamma-api|clob\.polymarket|data-api' -- ':!docs/**'

git grep -nE 'localhost:8080|127\.0\.0\.1:8080' -- ':!docs/**' ':!**/*.test.*'

git grep -n 'Math.random' -- lib components app
```

Any match must be understood. Release-path synthetic state is not acceptable.

---

# 31. Cross-client parity contract

Web and Android parity means **semantic parity**, not identical components.

## 31.1 Must match

- canonical IDs;
- event/market fields;
- selected outcome identity;
- history values;
- book values;
- freshness state;
- capabilities;
- eligibility;
- error classification;
- market status;
- resolution context;
- later: order lifecycle state;
- later: portfolio/PnL availability semantics.

## 31.2 May differ

- layout;
- navigation;
- animation;
- platform wallet UX;
- typography scaling;
- native permission UX;
- gesture behavior.

## 31.3 Parity test principle

Given the same recorded BFF fixture:

```text
Web semantic model == Android semantic model
```

for all contract fields relevant to the feature.

---

# 32. OpenAPI workflow

## 32.1 Canonical contract

```text
schemas/openapi/markets-v1.yaml
```

## 32.2 TypeScript generation

Current package command:

```bash
pnpm --filter @retropick/polymarket generate
```

## 32.3 Drift verification

```bash
bash scripts/check-markets-openapi-drift.sh
```

## 32.4 Rule

Never hand-edit:

```text
packages/polymarket/src/generated/api.ts
```

unless the generation process itself explicitly requires it; normal changes modify schema then regenerate.

## 32.5 Contract change sequence

```text
1. change schema
2. add/update backend conformance tests
3. implement backend
4. regenerate client
5. run drift check
6. update Web
7. update Android adapter/types
8. cross-client fixture tests
9. E2E
```

## 32.6 Current reserved warning

The portfolio availability branch currently owns schema/generated-client changes. Unrelated read-terminal work should not modify the canonical schema until that branch is resolved or rebased.

---

# 33. AsyncAPI / realtime workflow

Use the current realtime schema and drift script.

Verification:

```bash
bash scripts/check-markets-realtime-asyncapi-drift.sh
```

Any realtime UI change that changes message semantics must begin with the realtime contract, not a component-specific custom message shape.

---

# 34. Backend responsibilities supporting frontend

Frontend engineers should understand what the BFF owns so they do not duplicate it.

## 34.1 Catalog

BFF owns:

- Gamma ingestion;
- normalization;
- canonical IDs;
- projection persistence;
- upstream provenance;
- freshness.

## 34.2 Market data

BFF owns:

- CLOB orderbook fetch;
- history fetch/cache;
- validation;
- market health;
- normalized errors;
- provenance.

## 34.3 Eligibility

BFF owns:

- policy inputs;
- jurisdiction/geoblock integration;
- fail-closed decision;
- auditability.

## 34.4 Orders

BFF owns:

- preview semantics;
- intent persistence;
- attempt journal;
- idempotency/reconciliation;
- capability gate;
- venue state projection.

Frontend owns explicit user intent and wallet signing UX.

## 34.5 Portfolio

BFF owns:

- position projection;
- activity projection;
- economic fields;
- nullable/unavailable semantics;
- reconciliation;
- capability gate.

Frontend must not substitute unknown PnL with zero.

---

# 35. Future trading integration — do not implement in read-terminal branch

This section exists so frontend architecture leaves the correct seams.

## 35.1 Intended execution state machine

```text
draft
previewed
awaiting_signature
signed
submitting
accepted
open
partially_filled
filled
cancel_pending
cancelled
expired
rejected
unknown_reconciling
settlement_pending
settled
```

## 35.2 UX implication

A single `loading` boolean is insufficient.

Future UI needs explicit lifecycle state.

## 35.3 Unknown submit result

An ambiguous timeout must become:

```text
unknown_reconciling
```

not an automatic resubmit.

## 35.4 User signing

The exact BFF-provided payload/domain/hash must be signed. Frontend must not invent typed-data semantics from memory.

---

# 36. Future portfolio/PnL integration — reserved

Portfolio semantics are actively being hardened.

Frontend design should already support:

```text
value available
value unavailable
partial source coverage
realized PnL unavailable
zero open positions
claimable/redeemable state
stale reconciliation
```

Do not collapse:

```text
unknown → 0
```

because zero is a real financial value.

---

# 37. `references/polymarket/**` — how to use it correctly

The entire reference tree is a source-study lab.

Do **not**:

- merge one repository wholesale;
- add nested Git repos;
- replace RetroPick BFF with a reference backend;
- copy secrets/config assumptions;
- assume third-party dependencies are current;
- bypass RetroPick schemas.

Use the corpus as a pattern library.

---

# 38. Reference: `humanplane-terminal`

## Primary use

Best reference for:

- dense professional terminal UX;
- browsing;
- orderbook presentation;
- chart/tape layout;
- trading panel composition;
- realtime rendering performance;
- trader drill-down.

## Adapt

- terminal information density;
- pure orderbook reducer idea;
- `requestAnimationFrame` rendering throttle;
- read-only use without wallet;
- keyboard navigation as optional professional mode;
- deep-linkable market/event/trader pages;
- estimated fill presentation patterns.

## Reject

- its backend architecture as replacement for Go BFF;
- browser as upstream authority;
- sensitive localStorage credential patterns;
- independent upstream socket per component.

## RetroPick destination

```text
apps/web/src/products/markets/terminal/**
packages/polymarket/src/realtime.ts
apps/backend/internal/markets/realtime/**
```

---

# 39. Reference: `polymarket-ts-sdk`

## Primary use

Official upstream TypeScript compatibility evidence.

## Adapt

- fixtures from official response behavior;
- endpoint behavior comparison;
- explicit upstream SDK version tracking;
- black-box conformance checks.

## Reject

- raw SDK types as RetroPick client contract;
- SDK object shape as database schema;
- forcing Android to depend on TypeScript SDK internals.

## Frontend implication

Web imports RetroPick generated types, not official raw Polymarket SDK domain objects.

---

# 40. Reference: `polymarket-wagmi-builder`

## Primary use

Official wallet/Safe/Builder onboarding patterns.

## Adapt

- wallet state separated from trading session state;
- readiness state machine;
- Safe/deployment/approval checks;
- remote Builder signing;
- new-versus-returning user initialization.

## Reject

- Builder secret in browser env;
- user CLOB secrets in localStorage;
- frontend-only eligibility authority;
- demo session security assumptions.

## Frontend use timing

Use when trading branch is integrated, not as part of read-only terminal implementation.

---

# 41. Reference: `polymarket-cli`

## Primary use

Official behavioral oracle and lifecycle checklist.

Frontend-related acceptance topics:

- markets/events;
- price/midpoint/spread;
- orderbook;
- history;
- tick size;
- fee rate;
- geoblock;
- balances;
- orders;
- trades/fills;
- positions;
- activity;
- holders;
- CTF lifecycle.

Use it to ask:

> Does RetroPick expose equivalent user-visible semantics through the BFF?

Do not run the CLI as a backend runtime dependency.

---

# 42. Reference: `polymarket-trade-engine`

Useful later for:

- explicit order state machine;
- partial fills;
- expiration;
- restart recovery;
- simulation/fault injection;
- graceful shutdown.

Frontend takeaway:

- do not model order state as `pending/success/error` only;
- design lifecycle UI for partial/unknown/reconciling states.

Not read-terminal scope.

---

# 43. Reference: `polyrec`

Useful for advanced market analytics:

- spread;
- depth;
- imbalance;
- microprice;
- slippage;
- feed lag;
- replay datasets.

Frontend rule:

Any displayed derived metric must name its source/time and have deterministic calculation tests.

Never silently switch authority from Polymarket to an external spot feed.

---

# 44. Reference: `polymarket-orderbook-tui`

Use for:

- minimal orderbook transport understanding;
- parser fixtures;
- reducer edge cases;
- diagnostic tooling ideas.

Do not copy its reliability assumptions into production.

RetroPick snapshot/resync policy remains stronger.

---

# 45. Reference: `direktur-polymarket-terminal`

Useful later for failure-mode design:

- ghost fills;
- one-sided execution;
- CLOB-versus-chain disagreement;
- CTF merge/redeem;
- explicit reconciliation.

Frontend implication:

Future UI must be able to display `reconciling`, `conflict`, and delayed position states rather than asserting certainty from one API response.

---

# 46. Reference: `polyterm`

Use after core terminal is green for:

- whale research;
- trader analytics;
- alerts;
- research briefs;
- market signals.

Current product priority is core market terminal and trading lifecycle, so do not consume engineering bandwidth here before core release gates are green.

---

# 47. `.agents/skills/**` integration map

The repository currently contains five frontend skills.

```text
.agents/skills/frontend-patterns/
.agents/skills/frontend-design/
.agents/skills/frontend-responsive-design-standards/
.agents/skills/frontend-security-coder/
.agents/skills/frontend-code-review/
```

Correct path is `.agents/skills`, plural.

---

# 48. Skill: `frontend-patterns`

Read before:

- adding React components;
- adding hooks;
- React Query work;
- state management;
- performance work;
- forms;
- routing;
- reusable component APIs.

Useful rules:

- composition over inheritance;
- stable data-fetching boundaries;
- reusable hooks;
- memoization only where it has measurable value;
- explicit loading/error states.

## RetroPick override

Generic skill examples may show direct `fetch()` calls. For Markets production code, route those through the existing RetroPick client/query layer.

Repository architecture wins over generic skill examples.

---

# 49. Skill: `frontend-responsive-design-standards`

Read for every terminal layout PR.

Mandatory:

- mobile-first;
- existing breakpoints first;
- fluid layout;
- no arbitrary breakpoints without reason;
- touch-friendly controls;
- readable typography;
- multi-device test.

Suggested visual verification sizes:

```text
360x800
390x844
430x932
768x1024
1024x768
1280x800
1440x900
1920x1080
```

---

# 50. Skill: `frontend-design`

Use for visual refinement, not architecture decisions.

## RetroPick-specific constraint

The skill encourages bold aesthetic direction. For an existing product integration, preserve RetroPick's current design tokens, shell, typography strategy, and interaction language unless the task explicitly authorizes a redesign.

Do not create a visually unrelated terminal just because a reference terminal looks attractive.

---

# 51. Skill: `frontend-security-coder`

Read before touching:

- wallet UI;
- auth/session;
- external links;
- market descriptions/rules rendering;
- URL/deep-link handling;
- localStorage/sessionStorage;
- third-party widgets;
- mobile/Capacitor APIs;
- service worker/PWA behavior.

RetroPick-specific security checks:

- no Builder secret in client bundle;
- no private key;
- no direct upstream credentials;
- no unsafe HTML;
- explicit wallet signature;
- test harness disabled in production;
- fail-closed capability/eligibility.

---

# 52. Skill: `frontend-code-review`

Use before final commit/PR.

Review:

```text
new files
modified files
performance
business logic
security boundary
responsive behavior
```

The skill's reference checklists are part of the review process.

For RetroPick, append these review questions:

- direct Polymarket call introduced?
- generated client hand-edited?
- capability defaulted true?
- eligibility defaulted true?
- fake financial data introduced?
- random provenance introduced?
- wallet signature automated?
- reserved path modified?
- stale data shown as fresh?
- unknown value rendered as zero?

---

# 53. Frontend skill activation matrix

| Task | Patterns | Responsive | Design | Security | Code review |
|---|---:|---:|---:|---:|---:|
| Event cards | yes | yes | yes | review links/text | final |
| Discover page | yes | yes | yes | yes | final |
| Chart | yes | yes | optional | data safety | final |
| Orderbook | yes | yes | yes | data safety | final |
| Health badge | yes | yes | yes | yes | final |
| Capability UI | yes | yes | optional | **mandatory** | final |
| Eligibility UI | yes | yes | optional | **mandatory** | final |
| Wallet UI | yes | yes | yes | **mandatory** | final |
| Trade ticket | yes | yes | yes | **mandatory** | final |
| Android Capacitor bridge | patterns where applicable | yes | optional | **mandatory** | final |
| E2E harness | yes | n/a | no | **mandatory** | final |

---

# 54. ECC usage policy

Current GitHub main contains only a minimal `ECC/.opencode/package-lock.json` under the checked-in `ECC/**` tree.

There is not currently a complete ECC frontend playbook there that an integrator should depend on.

Important observation:

```text
.agents/skills/frontend-patterns/SKILL.md
```

is marked with:

```text
origin: ECC
```

## Current policy

1. Use `.agents/skills/**` as the actionable frontend skill layer.
2. Do not install/update/sync ECC during a frontend integration task merely because the folder exists.
3. If ECC content is restored later, inspect it read-only first.
4. Do not let ECC automation rewrite repository architecture or provider/model settings.
5. Current code/contracts remain above ECC in authority.

---

# 55. Graphify integration workflow

Graphify is used to understand dependency impact before and after significant frontend changes.

## 55.1 Installation check

```bash
graphify --help
```

If missing, current repository script instructs:

```bash
uv tool install graphifyy
```

Do not change Graphify version during an integration branch unless explicitly tasked.

## 55.2 Frontend graph

Before implementation:

```bash
./scripts/graphify-retropick.sh frontend
```

## 55.3 Core graph

For integration touching schema/client/backend seams:

```bash
./scripts/graphify-retropick.sh core
```

## 55.4 Freshness gate

```bash
bash scripts/check-graphify-freshness.sh
```

## 55.5 Generated graph policy

Do not add giant Graphify-generated files to the PR simply because they changed locally.

Commit graph artifacts only when repository policy/task ownership explicitly requires them.

## 55.6 Graph review questions

Before coding:

- which page imports the component?
- which query owns data?
- does new code bypass the shared client?
- does a new package edge cross Markets → legacy/PRISM?
- will a component import trading code unnecessarily?

After coding:

- did dependency fan-out unexpectedly grow?
- did a shared component gain venue-specific logic?
- did frontend gain direct upstream dependencies?

---

# 56. Branch strategy for a friend/integration engineer

## 56.1 Start from current main

```bash
git fetch origin --prune

git switch main

git pull --ff-only origin main
```

Record:

```bash
git rev-parse HEAD
```

## 56.2 Create dedicated branch

Web:

```bash
git switch -c friend/web-read-terminal-v1
```

Android work belongs in the Android repository on its own branch:

```bash
git switch -c friend/android-read-terminal-v1
```

Do not mix two repositories into one pseudo-commit.

## 56.3 Do not branch from agent branches

Do not start from:

```text
agent/w3-002-web-trading-lifecycle
agent/w3-007-portfolio-contract
agent/w3-008-position-economics
```

Start from main and rebase once reviewed agent work lands.

---

# 57. Rebase strategy when agent work lands

When main advances:

```bash
git fetch origin --prune

git rebase origin/main
```

If the friend branch is additive under `terminal/**`, most agent merges should not touch it.

Resolve composition conflicts only after understanding the latest page logic.

Never solve a conflict by choosing `ours` or `theirs` across a whole trading/page directory without reviewing the semantic diff.

---

# 58. Web allowed-path policy

A highly merge-safe first PR should ideally contain only new paths such as:

```text
apps/web/src/products/markets/terminal/**
apps/web/e2e/markets/read-terminal*.spec.ts
apps/web/e2e/markets/read-terminal*.helpers.ts
```

A later composition commit may minimally touch:

```text
apps/web/src/products/markets/pages/EventsDiscoverPage.tsx
apps/web/src/products/markets/pages/EventDetailPage.tsx
apps/web/src/products/markets/pages/MarketDetailPage.tsx
```

only after rebasing against latest main.

---

# 59. Web forbidden/reserved-path check

Before commit:

```bash
git diff --name-only origin/main...HEAD
```

Investigate immediately if unrelated integration work changed:

```text
apps/backend/**
schemas/openapi/markets-v1.yaml
packages/polymarket/src/generated/api.ts
apps/web/src/products/markets/pages/PortfolioPage.tsx
apps/web/src/products/markets/trading/**
apps/web/src/products/markets/e2e/e2eHarness.ts
apps/web/e2e/markets/helpers.ts
apps/web/playwright.config.ts
```

---

# 60. Suggested local scope guard

Run before committing a read-terminal-only branch:

```bash
BASE="origin/main"

FORBIDDEN='^(apps/backend/|schemas/openapi/markets-v1\.yaml$|packages/polymarket/src/generated/api\.ts$|apps/web/src/products/markets/trading/|apps/web/src/products/markets/pages/PortfolioPage\.tsx$|apps/web/src/products/markets/e2e/e2eHarness\.ts$|apps/web/e2e/markets/helpers\.ts$|apps/web/playwright\.config\.ts$)'

BAD="$(git diff --name-only "$BASE"...HEAD | grep -E "$FORBIDDEN" || true)"

if [ -n "$BAD" ]; then
  echo "ERROR: reserved paths changed:"
  printf '%s\n' "$BAD"
  exit 1
fi
```

This is a guard, not a substitute for review.

---

# 61. Test pyramid — Web

## Level 1 — pure transformation tests

For:

- book model;
- chart model;
- health labels;
- formatting;
- capability state mapping;
- route ID validation.

Run fast and deterministic.

## Level 2 — component tests

Use Vitest + Testing Library.

Test:

- loading;
- data;
- empty;
- stale;
- degraded;
- error/retry;
- keyboard interaction;
- mobile/desktop conditional elements where feasible.

## Level 3 — shared client tests

If shared client behavior changes:

```bash
pnpm --filter @retropick/polymarket test
pnpm --filter @retropick/polymarket typecheck
```

## Level 4 — Markets Web suite

```bash
pnpm --filter @retropick/markets-web test:markets
```

## Level 5 — E2E

```bash
pnpm --filter @retropick/markets-web test:e2e:markets
```

## Level 6 — build/type/lint

```bash
pnpm --filter @retropick/markets-web lint
pnpm --filter @retropick/markets-web typecheck
pnpm --filter @retropick/markets-web build
```

## Level 7 — repository gates

```bash
bash scripts/check-markets-openapi-drift.sh
bash scripts/check-markets-realtime-asyncapi-drift.sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
go -C apps/backend test ./...
bash scripts/check-graphify-freshness.sh
```

---

# 62. E2E read-terminal scenarios

Create self-contained scenarios that do not modify W3-002 helpers if that branch remains unmerged.

## E2E-R01 — Discover

```text
Given BFF returns catalog
When user opens Discover
Then event cards render
And no wallet is required
```

## E2E-R02 — Event → Market

```text
Given an event with markets
When user opens event
And selects market
Then canonical market route loads
```

## E2E-R03 — Outcome book

```text
Given market has YES/NO outcomes
When user switches outcome
Then token-specific orderbook changes
And previous outcome book is not displayed as current
```

## E2E-R04 — History

```text
When interval changes
Then correct BFF history request occurs
And chart reflects returned token/interval only
```

## E2E-R05 — Stale

```text
Given market freshness is stale
Then stale warning is visible
And trading/readiness UI does not label data live
```

## E2E-R06 — Capability off

```text
Given realtime=false
Then UI uses snapshot/polling label
And does not claim LIVE
```

## E2E-R07 — Eligibility unknown

```text
Given eligibility unknown/failure
Then trade action remains unavailable
And read-only market remains understandable
```

## E2E-R08 — Orderbook error with market data

```text
Given market detail succeeds
And book endpoint fails
Then market content remains
And book panel shows scoped error/retry
```

## E2E-R09 — No direct upstream

Capture browser network and assert there is no request to direct Polymarket production domains from the Web bundle.

## E2E-R10 — Mobile terminal

At mobile viewport:

- no horizontal page overflow;
- outcome controls usable;
- book rows usable;
- sticky action does not obscure content;
- bottom sheet is keyboard/touch accessible.

---

# 63. Frontend contract tests

Frontend should add tests that protect semantic assumptions.

Examples:

```text
MarketDetail.status enum handled exhaustively
FreshnessState handled exhaustively
OrderBookSnapshot malformed values never become visible rows
History empty != zero probability
Capability missing != enabled
Eligibility missing != eligible
PnL unavailable != zero (future)
```

If generated schema adds an enum member, exhaustive frontend code should fail typecheck until behavior is decided.

---

# 64. No-direct-upstream verification

Web:

```bash
git grep -nEi 'gamma-api|clob\.polymarket|data-api\.polymarket' \
  -- apps/web packages \
  ':!references/**' ':!**/*.md' ':!**/*.test.*'
```

Android:

```bash
git grep -nEi 'gamma-api|clob\.polymarket|data-api\.polymarket' \
  -- app components lib \
  ':!**/*.test.*'
```

Any production match needs architecture review.

---

# 65. Fake-data verification

Search frontend production paths for suspicious fallback generation.

```bash
git grep -nE 'Math\.random|randomUUID|fake|mock|fixture|simulation' \
  -- apps/web/src/products/markets
```

A match is not automatically wrong—tests/fixtures are valid—but production user-visible market state must never silently depend on synthetic values.

Android needs this check especially while W3-003A remains incomplete.

---

# 66. Secret verification

Before PR:

```bash
git diff origin/main...HEAD | \
  grep -Ei 'api[_-]?key|private[_-]?key|secret|mnemonic|bearer|password|token' || true
```

Manually inspect matches.

Also use repository secret scanners if available.

Never paste raw credentials into test fixtures.

---

# 67. Bundle/environment verification

Web public environment variables are visible to users.

Therefore `NEXT_PUBLIC_*` must contain only public configuration.

Allowed examples:

```text
public BFF base URL
public product mode
public test mode ONLY in explicit test build
```

Forbidden:

```text
Builder secret
CLOB API secret
session secret
private RPC credential
operator token
```

---

# 68. CI parity

Local completion is not enough.

Current CI runs:

- Gitlink checks;
- pnpm frozen install;
- lint;
- typecheck;
- Playwright browser install;
- tests;
- OpenAPI drift;
- AsyncAPI drift;
- build;
- Go build;
- OpenAPI conformance tests;
- all Go tests;
- Graphify freshness;
- PostgreSQL migration smoke;
- sqlc drift.

A frontend PR must be compatible with this entire gate, even if it modifies only Web files.

---

# 69. Staging integration

Use the existing Markets stack rather than inventing a frontend-only mock server for final verification.

Useful root commands:

```bash
pnpm dev:markets-stack
pnpm smoke:markets-stack
pnpm dev:markets-stack:down
```

Use mocks for deterministic unit/E2E, then use the real BFF/staging stack for integration verification.

---

# 70. Runtime smoke checklist

When stack is running:

```text
GET health/live returns 200
GET health/ready returns expected state
catalog loads
market detail loads
orderbook loads or truthfully unavailable
a stale backend state is surfaced as stale/degraded
no direct upstream request from browser
no console unhandled rejection
no hydration error
no request loop
no mobile overflow
```

---

# 71. Browser manual QA checklist

## Discover

- first render stable;
- skeleton does not jump layout;
- event cards keyboard reachable;
- category/filter controls fit mobile;
- stale state visible.

## Event

- title and resolution information readable;
- markets list has canonical links;
- empty event handled.

## Market

- outcome selection clear;
- chart corresponds to selected outcome;
- book corresponds to selected outcome;
- freshness visible;
- resolution visible;
- trading presentation gated.

## Mobile

- no horizontal overflow;
- book is readable;
- action bar respects safe area;
- bottom sheet scrolls correctly;
- keyboard does not cover critical input.

---

# 72. Android manual QA checklist

On emulator/device:

- clean install;
- cold start;
- background/foreground;
- offline start;
- network lost while market open;
- network restored;
- rotation if supported;
- low-memory recreation if practical;
- notification permission remains correct;
- WebView/native back navigation correct;
- deep link correct;
- no localhost dependency in release-like build;
- no synthetic market state appears after BFF failure.

---

# 73. Responsive terminal acceptance

At every supported viewport:

- event title does not overlap actions;
- long market question wraps;
- long outcome name does not break tab row;
- orderbook price/size columns stay aligned;
- chart labels do not overlap excessively;
- stale/error banners do not obscure content;
- trade action remains reachable;
- safe-area insets respected on mobile;
- tap targets meet minimum size.

---

# 74. Accessibility test checklist

- tab through entire page;
- visible focus;
- activate book row by keyboard;
- screen reader names for icon buttons;
- page has one meaningful H1;
- status changes use appropriate live region only where useful;
- no color-only status;
- 200% zoom usable;
- reduced motion respected;
- chart has textual context.

---

# 75. Performance test checklist

Measure:

- catalog first render;
- market route transition;
- book update CPU;
- React commit frequency under realtime;
- memory after repeated market switches;
- chart point count behavior;
- large event list scrolling;
- mobile device responsiveness.

Red flags:

```text
full-page rerender per book delta
100% CPU with market open
memory grows after every route change
multiple sockets for same token
repeated requests caused by unstable query keys
```

---

# 76. Observability rules

Frontend should retain:

- request ID where available;
- user-visible freshness;
- source/provenance where useful;
- current market/token identity;
- current capability state;
- realtime connection state.

Logs must not contain:

- signature payload secrets beyond what is safe;
- Builder secret;
- session cookie;
- auth token;
- private key.

---

# 77. Deep-link rules

A refresh-safe URL should identify canonical product state.

At minimum:

```text
event ID
market ID
```

Outcome selection may be URL-addressable if product UX benefits and route contract is stable.

Never use a transient array index as market identity.

Validate decoded route params before requesting BFF.

---

# 78. Design-system rules

Reuse existing:

- colors/tokens;
- cards;
- shell spacing;
- border/radius language;
- typography;
- mobile bottom-sheet behavior;
- loading/data-state components where appropriate.

A terminal should feel more information-dense, but still part of RetroPick.

Avoid copying another terminal pixel-for-pixel.

---

# 79. Component API rules

Prefer components that accept canonical data/view models.

Good:

```ts
<TerminalOrderBook
  book={bookViewModel}
  onPriceSelect={handlePriceSelect}
/>
```

Avoid components that fetch internally from hidden URLs:

```ts
<TerminalOrderBook marketSlug="..." /> // internally calls Gamma/CLOB
```

Fetching belongs in data/composition layer.

---

# 80. State ownership rules

## Server state

Use React Query/current query infrastructure for:

- events;
- market;
- book;
- history;
- health;
- capabilities;
- eligibility.

## Local UI state

Use local component state for:

- selected tab;
- open/closed drawer;
- chart interval selection;
- temporary hover/selection.

## Do not duplicate server state

Avoid copying a full `MarketDetail` into local state merely to render it.

---

# 81. Formatting rules for market values

Create centralized display helpers for:

- probability/price;
- money;
- share quantity;
- timestamp;
- percentage spread;
- duration until close.

Do not allow every component to implement slightly different rounding.

Define whether a value is:

```text
raw decimal
fixed-point amount
probability-like price
percentage display
currency minor unit
```

before formatting.

---

# 82. Empty versus unavailable semantics

These are different.

Examples:

```text
No bids       = valid empty book side
Book missing  = unavailable
No history    = valid empty history or unavailable according to response
PnL 0         = valid numeric zero
PnL null      = unavailable
No positions  = valid zero positions
Portfolio API unavailable = unavailable
```

UI copy must preserve the distinction.

---

# 83. Stale data semantics

Stale data can be more useful than a blank screen if clearly labelled.

Pattern:

```text
last valid data
+ stale badge
+ observed time
+ retry action
```

Do not allow stale book data to silently drive a marketable order preview later.

---

# 84. Capability-gated component pattern

Recommended composition:

```tsx
if (capabilityQuery.isLoading) {
  return <CapabilitySkeleton />;
}

const enabled = capabilityQuery.data?.features?.someFeature === true;

if (!enabled) {
  return <FeatureUnavailable reason="..." />;
}

return <Feature />;
```

Do not optimistically enable gated financial actions.

---

# 85. Test fixtures

Fixtures should be:

- deterministic;
- versioned where useful;
- based on canonical RetroPick response shape;
- explicit about stale/degraded/unavailable state;
- free of secrets.

Use official Polymarket references to build upstream adapter fixtures, but UI fixtures should use **RetroPick-normalized** shapes.

---

# 86. Reference-to-test extraction workflow

When studying a reference repo:

```text
1. record reference repo path
2. record upstream commit SHA if available
3. identify exact behavior
4. identify failure case
5. map behavior to RetroPick-owned interface
6. create fixture/test first
7. implement RetroPick version
8. verify no new direct-upstream dependency
9. document what was adapted versus rejected
```

Example:

```text
HumanPlane pure book reducer
→ extract edge-case concept
→ add RetroPick reducer fixture
→ implement against RetroPick realtime message model
→ test snapshot/delta/resync
```

Not:

```text
cp -r references/polymarket/humanplane-terminal/src apps/web/...
```

---

# 87. API integration review checklist

Before adding a new call:

- does method already exist in `@retropick/polymarket`?
- does OpenAPI already define it?
- is this read or authenticated/private?
- does it require capability?
- does it require eligibility?
- does it require wallet session?
- what is freshness policy?
- what is retry policy?
- is it safe to cache?
- does it expose private user data?
- does it need `Cache-Control: private, no-store`?
- does response include provenance?

---

# 88. Adding a new read endpoint — only when required

Do not add backend endpoints from a frontend branch casually.

If a genuinely missing read capability is required:

```text
1. open separate API/backend task
2. modify OpenAPI
3. add conformance test
4. implement Go handler/service/adapter
5. add normalization fixture
6. generate TS client
7. run drift
8. add frontend hook
9. add UI
10. add E2E
```

Keep backend/API changes in a separable commit/PR from large UI work when possible.

---

# 89. Trading boundaries for frontend engineer

Until order-submit capability is deliberately enabled and proven:

- do not remove `TradingUnavailable` states;
- do not hard-code trading true;
- do not bypass preview;
- do not direct-post CLOB orders;
- do not invent user API credentials;
- do not auto-sign;
- do not retry ambiguous submit;
- do not claim an order was accepted without BFF/venue evidence.

---

# 90. Wallet boundary for Web

Web dependencies already include wagmi, viem, Reown AppKit, SIWE.

Use existing wallet/session architecture.

Any new wallet UX must:

- identify connected signer;
- separate signer from funder where relevant;
- verify expected chain/network;
- preserve explicit signature confirmation;
- not move secret signing material to backend.

Study `polymarket-wagmi-builder` for patterns, not for direct copy.

---

# 91. Wallet boundary for Android

Current Android/Capacitor architecture may use browser-compatible wallet flows plus native wrapper capabilities.

Do not invent a new secure-wallet subsystem in the read-terminal branch.

When trading parity work begins, require:

- explicit user action;
- secure deep-link/wallet-return handling;
- no private-key storage;
- session binding;
- recovery after app background/foreground;
- cancellation handling.

---

# 92. Testing failures rather than only happy paths

For every feature, create at least one failure test.

Examples:

| Feature | Happy | Failure |
|---|---|---|
| Catalog | events render | timeout + retry |
| Event | detail renders | 404 |
| Market | detail renders | stale projection |
| Chart | points render | empty/unavailable |
| Book | levels render | malformed/unavailable |
| Health | healthy | stale/resyncing |
| Capability | enabled | API failure ⇒ disabled |
| Eligibility | eligible | unknown ⇒ trading off |
| Realtime | live after snapshot | dropped gap ⇒ resync |

---

# 93. Determinism requirement

Tests must never depend on:

- `Math.random()`;
- live market price;
- wall-clock timing without controlled clock;
- mutable external API state;
- current production market availability.

Use recorded fixtures and fake clocks.

Use live/staging smoke separately from deterministic tests.

---

# 94. Test data naming

Clearly name fixture purpose:

```text
fresh_open_market
stale_open_market
closed_market
book_empty_bid_side
book_thin
book_resyncing
eligibility_unknown
capabilities_read_only
history_empty
history_dense
```

This makes test intent reviewable.

---

# 95. Pull request structure

Recommended PR size:

```text
PR 1 — read-terminal components and pure models
PR 2 — data hooks/integration
PR 3 — page composition
PR 4 — Android presentation parity
PR 5 — cross-client E2E/parity
```

Or combine when small enough, but keep commits separable by concern.

Avoid a single PR that simultaneously rewrites:

```text
backend
OpenAPI
Web terminal
trading
portfolio
Android transport
Android UI
```

---

# 96. Commit structure

Example:

```text
feat(markets-web): add terminal read models and components
test(markets-web): cover read terminal degraded states
feat(markets-web): compose terminal into market detail
test(markets-web): add read terminal e2e
```

Android:

```text
feat(android): add markets read terminal presentation
test(android): cover terminal read states
```

Keep generated artifacts out unless required.

---

# 97. PR preflight

Before push:

```bash
git status --short

git diff --check

git diff --name-only origin/main...HEAD

git log --oneline origin/main..HEAD
```

Then run scoped and repo-level gates.

---

# 98. PR body template

```markdown
## Scope

Adds RetroPick Markets read-terminal frontend integration for: <features>.

## Baseline

- monorepo base: <sha>
- Android base if applicable: <sha>

## Architecture

- consumes shared RetroPick Go BFF only
- no direct Gamma/CLOB/Data API calls
- no schema/backend changes unless listed
- no trading/portfolio reserved-path changes

## Changed paths

<list>

## Data sources

<client methods / endpoints>

## Degraded behavior

<what happens on stale/unavailable/error>

## Tests

- [ ] unit
- [ ] Markets Vitest
- [ ] Playwright
- [ ] lint
- [ ] typecheck
- [ ] build
- [ ] OpenAPI drift
- [ ] AsyncAPI drift
- [ ] Go Markets tests
- [ ] Graphify freshness
- [ ] Android Gradle gates if applicable

## Merge-safety

- [ ] rebased on current main
- [ ] reserved branch paths untouched
- [ ] generated client not hand-edited
- [ ] no direct upstream production dependency

## Screenshots / recordings

<desktop/mobile>

## Residual risks

<explicit>
```

---

# 99. Reviewer checklist

## Architecture

- correct BFF boundary?
- correct canonical types?
- direct upstream introduced?
- correct capability semantics?
- correct eligibility semantics?

## Data correctness

- stale != fresh?
- empty != unavailable?
- unknown != zero?
- selected token identity preserved?

## React

- stable query keys?
- unnecessary local copies of server state?
- high-frequency rerenders?
- abort on route switch?

## Security

- secret leaked?
- unsafe HTML?
- open redirect/link risk?
- auto-sign?
- E2E seam reachable in production?

## UX

- mobile?
- keyboard?
- loading/error/degraded?
- accessible status?

## Merge safety

- reserved paths touched?
- branch stale?
- generated outputs unexpectedly huge?

---

# 100. Definition of done — Web read-terminal feature

A feature is done only when:

- canonical BFF method used;
- no direct upstream production request;
- normalized type used;
- loading state implemented;
- empty state implemented;
- error state implemented;
- stale/degraded state implemented when applicable;
- responsive behavior implemented;
- keyboard/accessibility checked;
- pure model tests added where calculations exist;
- component tests added;
- E2E updated if journey changes;
- lint passes;
- typecheck passes;
- Markets tests pass;
- Playwright passes;
- build passes;
- drift gates pass;
- diff check passes;
- reserved-path check passes;
- branch rebased on current main;
- PR documents residual limitations.

---

# 101. Definition of done — Android presentation feature

- based on approved Android baseline or explicitly reconciled newer SHA;
- presentation does not depend on synthetic random runtime data;
- no new direct Polymarket production call;
- missing backend state is represented unavailable;
- responsive mobile layout;
- native safe area respected;
- lint passes;
- TypeScript check passes;
- Next build passes;
- Capacitor sync passes;
- Gradle lint passes;
- Gradle unit tests pass;
- APK build passes;
- generated artifacts reviewed;
- monorepo gitlink is not changed unless separately approved.

---

# 102. Definition of done — cross-platform parity

Given the same canonical BFF fixture:

- Web and Android identify same event/market/token;
- same price/history values;
- same book top levels;
- same freshness state;
- same capability state;
- same eligibility state;
- same resolution semantics;
- same unavailable/unknown distinction;
- platform-specific layout differences documented;
- no client invents missing backend data.

---

# 103. Stop conditions for integration engineer

Stop and ask for architecture/review rather than improvising if:

- schema lacks required field;
- reference repo has feature but RetroPick BFF does not;
- direct upstream call seems easier;
- trading capability is false but UI task expects trading;
- portfolio field semantics unclear;
- Android current remote conflicts with pinned gitlink;
- generated schema/client branch is pending review;
- production signer/test seam is unclear;
- a merge conflict touches order/trading/portfolio data model;
- a test only passes by weakening an assertion.

---

# 104. Troubleshooting — catalog does not load

Check in order:

```text
BFF liveness
BFF readiness
API base URL
browser network
HTTP status
request ID
catalog worker/projection freshness
capability/readiness degraded status
```

Do not switch to direct Gamma as a “temporary fix” in production code.

---

# 105. Troubleshooting — orderbook blank

Check:

- valid canonical market ID;
- selected outcome token ID;
- market capability `orderBook`/equivalent;
- BFF orderbook response;
- market open/closed status;
- query enabled condition;
- current snapshot freshness;
- endpoint error/request ID.

An empty bid/ask side can be a valid book; unavailable is different.

---

# 106. Troubleshooting — chart wrong outcome

Check:

- outcome token selection;
- query key includes token ID;
- old request aborts after selection change;
- chart series memo key includes token/interval;
- response token/provenance matches requested token.

---

# 107. Troubleshooting — repeated requests

Check:

- unstable React Query keys;
- query options created with changing identity where it matters;
- refetch interval duplicated by realtime;
- component remount loop;
- page routing loop;
- effect dependencies.

Never solve request loops by arbitrarily setting a huge stale time without understanding ownership.

---

# 108. Troubleshooting — Android works only on emulator

Likely causes:

- localhost points to device itself;
- cleartext HTTP blocked;
- missing production BFF URL;
- CORS/WebView issue;
- network security config;
- Capacitor asset/runtime config.

Release builds must use production-safe configured HTTPS/WSS endpoints.

---

# 109. Troubleshooting — main moved while branch is active

Do:

```bash
git fetch origin --prune
git log --oneline --decorate --graph --max-count=30 --all
git rebase origin/main
```

Then rerun all relevant tests.

If main integrated a reserved branch, compare changed filenames before resolving conflicts.

---

# 110. Troubleshooting — generated API drift

Do not manually patch `generated/api.ts`.

Run:

```bash
pnpm --filter @retropick/polymarket generate
bash scripts/check-markets-openapi-drift.sh
```

If drift remains, identify tool version/schema mismatch.

---

# 111. Troubleshooting — Web test passes but CI fails

CI additionally exercises:

- Gitlink checks;
- full recursive tests;
- Playwright install/run;
- schema drift;
- Go build/tests;
- Graphify freshness;
- migration job;
- sqlc drift.

Reproduce the specific gate instead of weakening Web tests.

---

# 112. Integration roadmap

## F0 — Baseline

- fetch main;
- record SHA;
- inspect reserved branches;
- run existing Web tests;
- run Graphify frontend.

## F1 — Read model island

- pure terminal models;
- data-state primitives;
- unit tests.

## F2 — Discovery

- catalog terminal;
- event cards/rows;
- responsive states.

## F3 — Event/market context

- detail headers;
- resolution;
- outcome selection.

## F4 — Chart

- history query;
- chart model;
- interval UX;
- tests.

## F5 — Orderbook

- snapshot;
- rows;
- spread/depth;
- price selection;
- tests.

## F6 — Health/capabilities/eligibility

- explicit degraded states;
- fail-closed controls.

## F7 — Web composition

- minimal integration into existing routes;
- no trading branch modifications.

## F8 — Web E2E

- core read journey;
- stale/error/mobile/no-direct-upstream.

## F9 — Android presentation parity

- props/read models only;
- deterministic fixtures;
- no transport rewrite.

## F10 — Android production transport

Only after W3-003A ownership is active and reviewed.

## F11 — Cross-client parity

- same fixture semantics;
- same failure semantics.

## F12 — Trading lifecycle integration

Only after W3-002 + portfolio contract/economics are reviewed/integrated.

## F13 — Real venue proof

Controlled low-notional execution with capability gates and reconciliation.

---

# 113. Big-picture feature backlog after core

After core release gates are green, reference corpus supports expansion into:

- trade tape;
- holders;
- trader leaderboard;
- trader profiles;
- advanced book analytics;
- whale alerts;
- research briefs;
- bookmarks;
- alerts;
- quantitative telemetry;
- CTF/redeem visibility;
- session P/L.

These should not preempt unfinished core trading/reconciliation work.

---

# 114. File map — Web current integration points

```text
apps/web/src/products/markets/api/marketsClient.ts
  → singleton shared BFF client

apps/web/src/products/markets/queries/marketsQueryOptions.ts
  → canonical query behavior/staleness/polling

apps/web/src/products/markets/hooks/**
  → feature query hooks

apps/web/src/products/markets/pages/EventsDiscoverPage.tsx
  → discover composition

apps/web/src/products/markets/pages/EventDetailPage.tsx
  → event composition

apps/web/src/products/markets/pages/MarketDetailPage.tsx
  → market/book/ticket composition

apps/web/src/products/markets/components/OrderBookPanel.tsx
  → existing orderbook presentation

apps/web/src/products/markets/components/FreshnessBadge.tsx
  → freshness pattern

apps/web/src/products/markets/components/DataState.tsx
  → loading/error/stale states

apps/web/src/products/markets/trading/**
  → RESERVED active lifecycle area
```

---

# 115. File map — shared TS client

```text
packages/polymarket/src/client.ts
  typed HTTP BFF client

packages/polymarket/src/errors.ts
  typed client errors

packages/polymarket/src/etag-cache.ts
  ETag cache

packages/polymarket/src/realtime.ts
  realtime state/reducer layer

packages/polymarket/src/generated/api.ts
  generated OpenAPI types — DO NOT hand edit

packages/polymarket/src/client.test.ts
  HTTP client behavior tests

packages/polymarket/src/realtime.test.ts
  realtime behavior tests
```

---

# 116. File map — backend relevant to frontend

High-level current Markets tree contains:

```text
apps/backend/internal/markets/
├── activity/
├── auth/
├── balances/
├── catalog/
├── clob/
├── config/
├── devseed/
├── eligibility/
├── gamma/
├── positions/
├── realtime/
├── reconcile/
├── orders/
└── ...
```

Frontend engineers should inspect these only to understand contract/runtime behavior, not import Go internals into frontend assumptions.

---

# 117. File map — Android current baseline

```text
RetroPick-Android/
├── app/
├── components/
├── lib/
│   ├── ctf-service.ts
│   ├── markets-terminal-client.ts      RESERVED/legacy remediation
│   ├── polymarket-service.ts           RESERVED/legacy remediation
│   ├── realtime-client.ts              RESERVED/legacy remediation
│   ├── retropick-data.ts               RESERVED/legacy remediation
│   ├── storage-service.ts
│   └── whale-alert-notifications.ts
├── android/
│   ├── app/
│   ├── gradlew
│   └── ...
├── capacitor.config.ts
└── package.json
```

---

# 118. Command cookbook — Web setup

```bash
cd /path/to/monorepo-base
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @retropick/markets-web typecheck
pnpm --filter @retropick/markets-web test:markets
pnpm --filter @retropick/markets-web build
```

Run dev:

```bash
pnpm dev:web
```

Run stack:

```bash
pnpm dev:markets-stack
```

---

# 119. Command cookbook — Web verification

```bash
pnpm --filter @retropick/polymarket test
pnpm --filter @retropick/polymarket typecheck
pnpm --filter @retropick/markets-web lint
pnpm --filter @retropick/markets-web typecheck
pnpm --filter @retropick/markets-web test:markets
pnpm --filter @retropick/markets-web test:e2e:markets
pnpm --filter @retropick/markets-web build
bash scripts/check-markets-openapi-drift.sh
bash scripts/check-markets-realtime-asyncapi-drift.sh
go -C apps/backend test ./...
bash scripts/check-graphify-freshness.sh
git diff --check
```

---

# 120. Command cookbook — Android setup

```bash
git clone git@github.com:RetroPick/RetroPick-Android.git
cd RetroPick-Android
git fetch origin --prune
git checkout cad0760d7131456774e359565f1715920dff5391
npm ci
npm run lint
npx tsc --noEmit
npm run build
npx cap sync android
cd android
./gradlew :app:lintDebug :app:testDebugUnitTest :app:assembleDebug
```

Use a worktree/branch rather than working detached for implementation.

---

# 121. Command cookbook — branch inspection

```bash
git fetch origin --prune

git branch -a | grep -E 'w3-002|w3-007|w3-008'

git diff --name-only origin/main...origin/agent/w3-002-web-trading-lifecycle

git diff --name-only origin/main...origin/agent/w3-007-portfolio-contract

git diff --name-only origin/main...origin/agent/w3-008-position-economics
```

Review this before every rebase if the integration branch is long-lived.

---

# 122. Command cookbook — Graphify

```bash
./scripts/graphify-retropick.sh frontend
./scripts/graphify-retropick.sh core
bash scripts/check-graphify-freshness.sh
```

Do not commit generated graph output by default.

---

# 123. Command cookbook — source safety scan

```bash
git diff --check

git diff --name-only origin/main...HEAD

git diff origin/main...HEAD | grep -Ei 'secret|private.?key|mnemonic|api.?key|bearer' || true

git grep -nEi 'gamma-api|clob\.polymarket|data-api\.polymarket' apps/web packages || true
```

---

# 124. Handoff report template

At completion, provide:

```text
BASE SHA
BRANCH
FINAL SHA
CHANGED FILES
FEATURES IMPLEMENTED
FEATURES EXPLICITLY NOT IMPLEMENTED
BFF METHODS USED
CAPABILITY BEHAVIOR
ELIGIBILITY BEHAVIOR
STALE/DEGRADED BEHAVIOR
UNIT TESTS
E2E TESTS
TYPECHECK
LINT
BUILD
OPENAPI DRIFT
ASYNCAPI DRIFT
GO TESTS
GRAPHIFY FRESHNESS
ANDROID TESTS if applicable
RESIDUAL RISKS
MERGE CONFLICT CHECK
```

---

# 125. Final integration contract for a friend

Use the following as the assignment boundary.

> Build and integrate the RetroPick Markets **read-terminal frontend** for Web and Android using the existing RetroPick Go Markets BFF and canonical schemas. Implement market/event discovery, event detail, market detail, outcome selection, historical price/probability chart, orderbook visualization, best bid/ask/spread/depth, market health, freshness/degraded states, capabilities, eligibility, loading/error/empty states, and responsive terminal presentation. Use the current `@retropick/polymarket` client on Web. On Android, keep presentation isolated from the legacy/synthetic transport until the dedicated production transport task lands. Never call Gamma/CLOB/Data API directly from production frontend. Never introduce fake financial state. Never default trading or eligibility to true. Do not modify active trading lifecycle, portfolio/PnL contract/economics, or Android transport files unless explicitly reassigned. Rebase on current main before composition, run the full verification ladder, and provide exact SHA/files/test evidence.

---

# 126. Final release-oriented mental model

A frontend is not production-ready merely because the screen looks complete.

The complete chain is:

```text
Polymarket authoritative data
          ↓
RetroPick upstream adapter validates
          ↓
BFF normalizes and records provenance
          ↓
OpenAPI/AsyncAPI contract
          ↓
client validates identity/freshness
          ↓
UI renders explicit state
          ↓
user sees truthful data
```

Later, trading adds:

```text
user intent
   ↓
BFF preview
   ↓
explicit wallet signature
   ↓
persisted submit intent/attempt
   ↓
venue acceptance
   ↓
fill/cancel/reconcile
   ↓
durable position/activity
   ↓
truthful portfolio
   ↓
Web + Android parity
```

Frontend integration should strengthen this chain, never create a bypass around it.

---

# Appendix A — Detailed per-feature acceptance checklist


## A1 Event Discovery

- [ ] Uses BFF catalog client, not direct Gamma.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Initial loading skeleton is stable.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Empty catalog is distinct from fetch failure.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Pagination cursor is preserved.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Canonical event links are used.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No wallet required for read-only view.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Stale catalog is visibly stale.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Retry does not duplicate items.

  - Test evidence 8: deterministic automated coverage or explicit manual proof.

  - Verification 8: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Large lists remain responsive.

  - Test evidence 9: deterministic automated coverage or explicit manual proof.

  - Verification 9: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Mobile card layout is usable.

  - Test evidence 10: deterministic automated coverage or explicit manual proof.

  - Verification 10: inspect network/state/output and confirm no fallback violates the contract.


## A2 Event Detail

- [ ] Canonical event ID is validated.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] 404 has dedicated not-found state.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Resolution metadata remains provenance-preserving.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Market children route with canonical IDs.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Stale data warning does not hide content.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Error retry is scoped to event data.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Long descriptions wrap safely.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.

- [ ] External resolution links are safe.

  - Test evidence 8: deterministic automated coverage or explicit manual proof.

  - Verification 8: inspect network/state/output and confirm no fallback violates the contract.


## A3 Market Detail

- [ ] Market question and status are canonical BFF fields.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Outcome selection resets token-specific dependent state.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Closed market does not present book as live.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Capabilities gate optional sections.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Resolution panel is visible.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Freshness is visible.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Deep link survives refresh.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Invalid route ID fails before unnecessary request when possible.

  - Test evidence 8: deterministic automated coverage or explicit manual proof.

  - Verification 8: inspect network/state/output and confirm no fallback violates the contract.


## A4 Price History

- [ ] History request uses market ID + token ID.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Interval is part of query identity.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Outcome switch cannot display previous token series as current.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Empty data is not drawn as zero.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Stale history is labelled.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Tooltip timestamps are correct.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Dense history does not freeze UI.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No direct upstream chart endpoint is called.

  - Test evidence 8: deterministic automated coverage or explicit manual proof.

  - Verification 8: inspect network/state/output and confirm no fallback violates the contract.


## A5 Orderbook

- [ ] Snapshot token identity matches selected outcome.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Bid/ask sides are ordered correctly.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Best bid/ask are deterministic.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Spread uses validated inputs.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Empty side is valid.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Unavailable book is explicit.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Stale snapshot is labelled.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Book row selection never triggers submit.

  - Test evidence 8: deterministic automated coverage or explicit manual proof.

  - Verification 8: inspect network/state/output and confirm no fallback violates the contract.

- [ ] High-frequency rendering is bounded.

  - Test evidence 9: deterministic automated coverage or explicit manual proof.

  - Verification 9: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No delta is applied before snapshot in realtime mode.

  - Test evidence 10: deterministic automated coverage or explicit manual proof.

  - Verification 10: inspect network/state/output and confirm no fallback violates the contract.


## A6 Market Health

- [ ] Health comes from BFF or deterministic local derivation explicitly labelled.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No random depth/liquidity score.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Observed timestamp is preserved.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Unavailable differs from unhealthy.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Thin/stale/resyncing states are understandable.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Health does not override market status authority.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.


## A7 Capabilities

- [ ] Missing response does not enable feature.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] False capability disables action.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Capability polling/cache duration is bounded.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] UI explains important unavailable states.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Test fixture covers false and request failure.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.


## A8 Eligibility

- [ ] Backend is sole production authority.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Unknown does not become eligible.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Timeout fails closed.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Read-only UX remains distinct from trading availability.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No client geo bypass.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No hard-coded allowlist used as authority.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.


## A9 Realtime

- [ ] Starts connecting/snapshot_wait, not live.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Snapshot establishes base.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Malformed frame rejected.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Duplicate/out-of-order handling tested.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Reconnect resubscribes.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Integrity gap triggers resync.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Foreground return reacquires valid snapshot.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Polling fallback is labelled.

  - Test evidence 8: deterministic automated coverage or explicit manual proof.

  - Verification 8: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Network ingestion is decoupled from React render rate.

  - Test evidence 9: deterministic automated coverage or explicit manual proof.

  - Verification 9: inspect network/state/output and confirm no fallback violates the contract.


## A10 Responsive

- [ ] Mobile-first layout.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No horizontal body overflow.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Touch targets >= 44px where applicable.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Book columns remain readable.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Long text wraps.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Bottom sheet safe area respected.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Tablet layout checked.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Desktop density checked.

  - Test evidence 8: deterministic automated coverage or explicit manual proof.

  - Verification 8: inspect network/state/output and confirm no fallback violates the contract.


## A11 Accessibility

- [ ] Keyboard full journey.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Visible focus.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Semantic headings.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Icon actions named.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Color not sole state indicator.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Reduced motion respected.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Chart has textual context.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.

- [ ] Error state announced appropriately.

  - Test evidence 8: deterministic automated coverage or explicit manual proof.

  - Verification 8: inspect network/state/output and confirm no fallback violates the contract.


## A12 Security

- [ ] No secrets in public bundle.

  - Test evidence 1: deterministic automated coverage or explicit manual proof.

  - Verification 1: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No unsafe HTML for upstream text.

  - Test evidence 2: deterministic automated coverage or explicit manual proof.

  - Verification 2: inspect network/state/output and confirm no fallback violates the contract.

- [ ] External URLs validated.

  - Test evidence 3: deterministic automated coverage or explicit manual proof.

  - Verification 3: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No background wallet signature.

  - Test evidence 4: deterministic automated coverage or explicit manual proof.

  - Verification 4: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No Builder secret in client.

  - Test evidence 5: deterministic automated coverage or explicit manual proof.

  - Verification 5: inspect network/state/output and confirm no fallback violates the contract.

- [ ] E2E signer impossible in production.

  - Test evidence 6: deterministic automated coverage or explicit manual proof.

  - Verification 6: inspect network/state/output and confirm no fallback violates the contract.

- [ ] No direct upstream auth credentials.

  - Test evidence 7: deterministic automated coverage or explicit manual proof.

  - Verification 7: inspect network/state/output and confirm no fallback violates the contract.


---

# Appendix B — Detailed failure-mode matrix

| Failure | Web behavior | Android behavior | Trading implication |
|---|---|---|---|
| BFF unreachable | scoped network error | unavailable/offline | disable gated actions |
| Catalog stale | stale catalog + observed time | stale catalog | no effect on execution without fresh preview |
| Market detail 404 | not found | not found | no trade |
| Orderbook timeout | market visible, book unavailable | same semantics | marketable preview disabled |
| History unavailable | chart empty/unavailable | same | no direct execution impact |
| Health stale | warning | warning | freshness gate may block preview |
| Capabilities unavailable | gated features false | gated features false | no submit |
| Eligibility unavailable | unknown | unknown | no submit |
| Realtime disconnect | degraded → fallback/resync | same semantics | no claim of live book |
| Realtime gap | resync | resync | stale book not used |
| Backend 429 | backoff/retry message | backoff/retry | no tight loop |
| Backend 5xx | retry/error | retry/error | fail closed |
| Malformed JSON | typed malformed error | adapter error | fail closed |
| Auth expired | explicit re-auth | explicit re-auth | no hidden retries that sign |
| Wallet disconnected | read-only | read-only | no signing |
| Market closed | closed state | closed state | disable submit |
| Portfolio source unavailable | null/unavailable | null/unavailable | never render 0 |
| Submit timeout (future) | unknown/reconciling | unknown/reconciling | never blind resubmit |
| Cancel/fill race (future) | reconciling | reconciling | refresh authoritative state |

---

# Appendix C — Reference corpus decision table

| Reference | Use now | Use later | Never copy directly |
|---|---|---|---|
| HumanPlane | terminal layout, book UX, render patterns | trader drilldown | backend replacement, sensitive storage |
| official TS SDK | upstream fixtures/conformance | ongoing compatibility | raw SDK as client contract |
| wagmi builder | wallet pattern study | Safe/Builder readiness | browser Builder secret |
| official CLI | read/lifecycle acceptance oracle | execution/CTF acceptance | private-key UX for normal users |
| PolyTerm | taxonomy only | intelligence/alerts | opaque signals as fact |
| trade-engine | state model knowledge | execution recovery | auto strategy scope/server key |
| txbaba terminal | workflow ideas | fast crypto workflows | private keys/geo bypass |
| polyrec | analytics formulas | replay/quant panels | external feed authority |
| orderbook TUI | parser/reducer study | debug tool | production reliability assumptions |
| direktur terminal | failure cases | reconciliation/CTF | copy trading/sniping core |

---

# Appendix D — Skills read order by task type

## New Web page

```text
1. current page/shell code
2. .agents/skills/frontend-patterns/SKILL.md
3. .agents/skills/frontend-responsive-design-standards/SKILL.md
4. .agents/skills/frontend-design/SKILL.md
5. .agents/skills/frontend-security-coder/SKILL.md if any external/user/wallet data
6. .agents/skills/frontend-code-review/SKILL.md before completion
```

## Orderbook/realtime

```text
1. packages/polymarket/src/realtime.ts + tests
2. references/polymarket/README.md orderbook invariants
3. humanplane-terminal reference
4. polymarket-orderbook-tui reference
5. frontend-patterns
6. frontend-code-review
```

## Wallet/trading

```text
1. canonical OpenAPI
2. current trading branch/current main
3. polymarket-wagmi-builder reference
4. polymarket-cli behavioral oracle
5. frontend-security-coder
6. frontend-code-review
```

## Android screen

```text
1. approved Android SHA implementation
2. current BFF contract
3. frontend-responsive-design-standards
4. frontend-patterns
5. frontend-security-coder for transport/wallet/native APIs
6. frontend-code-review
```

---

# Appendix E — Minimal engineering session checklist

Before coding:

```text
[ ] git fetch --prune
[ ] record main SHA
[ ] inspect reserved branches
[ ] inspect Graphify frontend map
[ ] read relevant .agents skill(s)
[ ] read relevant reference repo/manual section
[ ] identify canonical BFF client method
[ ] identify failure states
[ ] define allowed file paths
```

During coding:

```text
[ ] no raw upstream fetch
[ ] no fake financial fallback
[ ] no fail-open capability
[ ] no fail-open eligibility
[ ] deterministic view models
[ ] responsive/mobile-first
[ ] error/stale/unavailable states
[ ] tests created with feature
```

Before commit:

```text
[ ] diff --check
[ ] changed-file audit
[ ] reserved path audit
[ ] secret scan
[ ] direct-upstream scan
[ ] fake-data scan
[ ] unit tests
[ ] typecheck
[ ] lint
[ ] build
```

Before PR:

```text
[ ] rebase origin/main
[ ] rerun tests
[ ] E2E
[ ] OpenAPI drift
[ ] AsyncAPI drift
[ ] Go tests
[ ] Graphify freshness
[ ] screenshots mobile/desktop
[ ] handoff SHA + evidence
```

---

# Appendix F — Architecture decisions that must not regress

1. Markets is Polymarket-native.
2. Markets does not create a custom RetroPick exchange.
3. Markets does not issue RetroPick outcome tokens.
4. Polymarket remains venue/liquidity/settlement authority.
5. RetroPick BFF is the client boundary.
6. Web and Android share contracts, not UI source.
7. Upstream objects are normalized through an anti-corruption layer.
8. PostgreSQL owns durable projections.
9. Realtime is snapshot-first.
10. Unknown data is not fabricated.
11. User signatures remain user-controlled.
12. Builder secrets remain backend-only.
13. Eligibility fails closed.
14. Capabilities fail closed.
15. Ambiguous order submission is reconciled, not blindly retried.
16. Portfolio unknown values are not converted to zero.
17. Legacy MarketEngine is not revived for Markets.
18. Reference repos are pattern libraries, not fork targets.
19. Generated contracts are generated, not manually patched.
20. Parallel feature work uses merge-safe ownership boundaries.

---

# Appendix G — Suggested friend task statement

```text
ROLE
Senior Frontend Integration Engineer for RetroPick Markets V1.

BASELINE
Use current RetroPick/monorepo-base origin/main. Record exact SHA before work.
For Android compatibility use the monorepo-pinned RetroPick-Android SHA unless a newer SHA is explicitly reviewed and approved.

MISSION
Integrate a production-grade Markets read terminal across Web and Android presentation using only the RetroPick Go Markets BFF contract.

IN SCOPE
- event discovery
- event detail
- market detail
- outcome selection
- history/probability chart
- orderbook snapshot presentation
- bid/ask/spread/depth
- market health
- freshness/degraded states
- capabilities
- eligibility
- loading/error/empty states
- responsive desktop/mobile terminal UI
- deterministic unit/component tests
- read-terminal E2E
- cross-client semantic parity

OUT OF SCOPE
- direct Polymarket API calls
- real order submission
- Web trading lifecycle reserved files
- portfolio/PnL schema/economics reserved files
- Android production transport/realtime cleanup reserved files
- server-held wallet keys
- Builder secrets in frontend
- Intelligence expansion before core is green
- framework rewrite to Compose

MANDATORY SOURCES
- schemas/openapi/markets-v1.yaml
- packages/polymarket/src/client.ts
- packages/polymarket/src/realtime.ts
- apps/web/src/products/markets/** current code
- .dev/markets-v1/** relevant specs
- .agents/skills/** relevant frontend skills
- references/polymarket/README.md
- selected reference repos as pattern studies

MERGE SAFETY
Work additively under apps/web/src/products/markets/terminal/** first. Keep page integration in a small follow-up commit. Do not touch reserved paths. Rebase current main before final verification.

VERIFICATION
Run scoped Web tests, shared client tests, lint, typecheck, E2E, build, OpenAPI/AsyncAPI drift, Go Markets suite, Graphify freshness, diff checks, direct-upstream scan, secret scan, and Android npm/Capacitor/Gradle gates when Android is changed.

HANDOFF
Report exact base SHA, final SHA, changed paths, tests, screenshots, residual risks, and explicit confirmation that reserved paths/direct Polymarket calls were not introduced.
```

---

# Appendix H — Production readiness gate for frontend integration

The integration is not production-ready until all applicable answers are **YES**:

```text
[ ] Is every production data request routed through RetroPick BFF?
[ ] Are canonical IDs used?
[ ] Is source freshness visible/handled?
[ ] Can stale data never masquerade as live?
[ ] Are capability failures fail-closed?
[ ] Are eligibility failures fail-closed?
[ ] Is unknown distinct from zero?
[ ] Is every financial action user initiated?
[ ] Is every wallet signature explicit?
[ ] Are Builder/operator secrets absent from frontend?
[ ] Is the E2E signer impossible in normal production mode?
[ ] Are orderbook calculations deterministic?
[ ] Does mobile work without desktop assumptions?
[ ] Does keyboard navigation work?
[ ] Do unit tests cover failure modes?
[ ] Does Playwright cover the read journey?
[ ] Does build pass?
[ ] Does OpenAPI drift pass?
[ ] Does AsyncAPI drift pass?
[ ] Do Go tests pass?
[ ] Does Graphify freshness pass?
[ ] Is the branch rebased onto current main?
[ ] Are active agent/reserved files untouched or intentionally reconciled?
[ ] Is Android pinned/reconciled intentionally?
[ ] Does Android release-like build avoid localhost/synthetic fallback?
[ ] Is handoff evidence complete?
```

---

# End of manual

This manual is intentionally strict: the easiest way to damage RetroPick at this stage is to make a frontend look complete by bypassing the BFF, inventing missing states, or resolving Git conflicts by overwriting active lifecycle work. The integration strategy above instead keeps the frontend additive, contract-driven, testable, and merge-safe while preserving the path to real Polymarket execution and Web/Android parity.
