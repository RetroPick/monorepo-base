# Existing Repository Audit

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

## 1. Purpose

Inventory monorepo state after Phase R0–R4 restructure to show what exists today versus what Markets V1 must build. Prevents agents from extending legacy epoch code or duplicating paths.

## 2. Scope

### In scope

- `apps/backend/internal/markets/*`
- `apps/web/src/products/markets/*`
- `packages/polymarket`
- `schemas/openapi/markets-v1.yaml`
- `apps/android`
- `archive/` legacy quarantine

### Out of scope

- Full audit of PRISM placeholder (`contracts/prism/`, `apps/web/src/products/prism/`).
- `apps/landing-web`, `apps/retropick-landing-standalone`.

## 3. Prerequisites

- [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md)
- [archive/README.md](../../../archive/README.md)
- [EXISTING_REPOSITORY_AUDIT evidence EV-025, EV-026](../research/evidence-register.yaml)

## 4. Authoritative sources

| Path | Role | Inspected |
|------|------|-----------|
| `docs/ARCHITECTURE.md` | R0–R4 layout | 2026-07-25 |
| `apps/backend/internal/markets/` | Markets BFF | 2026-07-25 |
| `schemas/openapi/markets-v1.yaml` | API contract | 2026-07-25 |
| `archive/README.md` | Quarantine manifest | 2026-07-25 |

## 5. Current state

### 5.1 Summary table

| Area | Path | State | Notes |
|------|------|-------|-------|
| Markets BFF | `apps/backend/internal/markets/` | **Stub + Gamma catalog** | 3 HTTP endpoints; trading false |
| Gamma client | `apps/backend/internal/markets/gamma/` | **Implemented** | `client.go` + tests |
| Web Markets | `apps/web/src/products/markets/` | **Shell** | Home page + API hooks |
| TS types | `packages/polymarket/` | **Minimal** | Re-exports 4 types only |
| OpenAPI | `schemas/openapi/markets-v1.yaml` | **3 endpoints** | eligibility, capabilities, events |
| Android | `apps/android/` | **README-only** | No Gradle project |
| PRISM web | `apps/web/src/products/prism/` | Placeholder | Out of Markets scope |
| Legacy epoch | `archive/` | **Quarantined** | No active imports |
| Deploy | `deploy/web-markets/` | Example env | `NEXT_PUBLIC_PRODUCT=markets` |

### 5.2 Backend — `apps/backend/internal/markets/`

```
internal/markets/
├── README.md           # Endpoint table, env vars
├── handler.go          # Eligibility, Capabilities, ListEvents
├── handler_test.go
├── router.go           # Route registration
├── service.go          # Business logic; trading flags false
├── service_test.go
├── types.go            # OpenAPI-aligned structs
└── gamma/
    ├── client.go       # GET gamma-api.polymarket.com/events
    └── client_test.go
```

**Line counts (approx.):** ~500 LOC Go including tests.

**Endpoints implemented:**

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/v1/markets/eligibility` | Fail-closed: `eligible: false`, reason `markets_platform_not_enabled` |
| GET | `/api/v1/markets/capabilities` | `catalog` from env; `trading: false`, `combos: false` |
| GET | `/api/v1/markets/events` | Proxies Gamma when `MARKETS_CATALOG_ENABLED=1` |

**Configuration:**

- `MARKETS_GAMMA_API_URL` (default `https://gamma-api.polymarket.com`)
- `MARKETS_CATALOG_ENABLED` (default `1`)

**Not present:** CLOB client, order orchestrator, portfolio DB, relayer, geoblock client, websocket hub, intelligence workers.

**Adjacent backend packages (epoch-era, not Markets):** `indexer/`, `keeper/`, `marketdata/`, `funding/`, etc. remain in `internal/` for operational/historical reasons but are **not** Markets V1 paths. Epoch domain archived to `archive/apps/backend/internal/legacy/`.

### 5.3 Web — `apps/web/src/products/markets/`

```
products/markets/
├── README.md
├── MarketsHomePage.tsx    # Status dashboard: eligibility, capabilities, events list
├── marketsRoutes.tsx      # Route wiring
├── api/marketsApi.ts      # fetch helpers for 3 endpoints
└── hooks/useMarketsPlatform.ts  # React Query hooks
```

Consumes `@retropick/polymarket` types. No wallet connect, order ticket, or order book UI. Legacy epoch UI archived under `archive/apps/web/`.

### 5.4 Package — `packages/polymarket/`

```
packages/polymarket/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    └── types.ts    # MarketsCapabilities, MarketsEligibility, MarketsEventsList, MarketsEventSummary
```

Placeholder for future venue adapter types and codegen. **Does not** call Polymarket APIs directly.

### 5.5 OpenAPI — `schemas/openapi/markets-v1.yaml`

**Version:** 1.0.0
**Servers:** `/api/v1`

| Path | operationId | Schemas |
|------|-------------|---------|
| `/markets/eligibility` | getMarketsEligibility | EligibilityResponse |
| `/markets/capabilities` | getMarketsCapabilities | CapabilitiesResponse |
| `/markets/events` | listMarketsEvents | EventsListResponse, EventSummary |

**Missing vs target** (from `.dev/MARKETS.md` §9): market detail, orderbook, orders, positions, CTF, realtime — to be added incrementally per phase.

### 5.6 Android — `apps/android/`

Only documentation:

- `README.md` — not buildable; points to BUILD_SESSION_PROMPT
- `.dev/BUILD_SESSION_PROMPT.md`, copies of MARKETS specs

No `build.gradle.kts`, no `app/` module, no Compose sources.

### 5.7 Legacy quarantine — `archive/`

Per `archive/README.md` (2026-07-24):

| Former active path | Archive path |
|--------------------|--------------|
| `contracts/legacy-pool-v1/` | `archive/contracts/legacy-pool-v1/` |
| `packages/legacy/` | `archive/packages/legacy/` |
| `apps/backend/internal/legacy/` | `archive/apps/backend/internal/legacy/` |
| `apps/web/src/products/legacy/` | `archive/apps/web/products/legacy/` |
| Epoch docs | `archive/docs/epoch-v1/` |

**Policy:** Active code MUST NOT import from `archive/`. Legacy API was `/api/v1/legacy/markets/*` — frozen, not extended.

### 5.8 Schemas and deploy

- `schemas/events/`, `schemas/fixtures/` — exist; Markets-specific fixtures TBD PHASE-1.
- `deploy/web-markets/.env.example` — product flag for Markets web build.

### 5.9 Gap analysis (high level)

| Capability | Repo state |
|------------|------------|
| Event catalog (read) | Gamma proxy stub |
| Market detail / orderbook | Not started |
| Trading / wallet | Not started |
| Portfolio / CTF | Not started |
| Intelligence / alerts | Not started |
| Android app | Not started |
| PostgreSQL markets schema | Not started |

## 6. Target design

Greenfield work lands exclusively in:

- `apps/backend/internal/markets/` (+ future subpackages: `clob/`, `portfolio/`, `intel/`)
- `apps/web/src/products/markets/`
- `apps/android/` (Gradle scaffold PHASE-5)
- `packages/polymarket/`
- `schemas/openapi/markets-v1.yaml` (contract-first)

See [TARGET_MONOREPO_ARCHITECTURE.md](TARGET_MONOREPO_ARCHITECTURE.md).

## 7. Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Extend `internal/marketdata` for Polymarket | Wrong domain; epoch coupling |
| Restore epoch API for Markets | ADR-001, archive policy |
| New repo outside monorepo | Breaks shared OpenAPI codegen |

## 8. Decisions

- Markets BFF is greenfield at `internal/markets/` (EV-025).
- Legacy frozen in `archive/` (EV-026).
- OpenAPI is canonical cross-client contract (EV-005 in prior stub → schemas file verified).
- Android README-only until PHASE-5.

## 9. Data and control flows

```mermaid
flowchart TB
  subgraph exists [Exists today]
    WebShell[web/products/markets shell]
    BFFStub[internal/markets stub]
    Gamma[gamma client]
    OpenAPI[markets-v1.yaml 3 paths]
    PkgTypes[packages/polymarket types]
  end
  subgraph archive [Quarantined]
    LegacyAPI[legacy markets API]
    EpochDomain[archive/internal/legacy]
  end
  subgraph missing [Not built]
    CLOB[clob adapter]
    DB[(markets schema)]
    AndroidApp[android gradle]
  end
  WebShell --> OpenAPI
  WebShell --> BFFStub
  BFFStub --> Gamma
  PkgTypes -.-> WebShell
  BFFStub -.-> CLOB
  BFFStub -.-> DB
  AndroidApp -.-> OpenAPI
  LegacyAPI -.x BFFStub
```

## 10. Failure and recovery

Audit stale when file tree diverges. Re-run inventory at each phase gate; update §5 tables.

## 11. Security

No secrets in audited paths. Eligibility fail-closed already implemented.

## 12. Observability

`internal/platform/obs` exists platform-wide; Markets-specific metrics not wired.

## 13. Test strategy

Existing: `handler_test.go`, `service_test.go`, `gamma/client_test.go`. Expand with contract tests when OpenAPI grows.

## 14. Rollout and rollback

Documentation-only audit. Implementation rollout per phases/README.md.

## 15. Open questions

- Whether epoch `internal/marketdata` will be deleted or renamed (OQ-012 scope).
- Exact path for Android Gradle root (`apps/android` vs `apps/android-markets`).

## 16. Acceptance criteria

- [x] Inventories all paths requested in Wave 0 task
- [x] Documents 3 OpenAPI endpoints
- [x] Documents legacy quarantine in archive/
- [x] Gap analysis vs target Markets V1
