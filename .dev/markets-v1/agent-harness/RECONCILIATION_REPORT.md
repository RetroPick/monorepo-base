# Markets V1 Phase 1 Reconciliation Report

**Date:** 2026-07-30  
**Starting HEAD:** `bf269210772b07764ac02a60eff1ca91deae6d4f`  
**Authorized slice:** backend foundation and public read markets  
**Result:** `PASS_WITH_FOCUSED_ADR`  
**Decision:** [ADR-010](../architecture/adr/ADR-010-PHASE-1-BACKEND-FIRST-SLICE.md)

## Repository-to-design matrix

| Area | Approved design | Repository evidence | Status | Action |
|---|---|---|---|---|
| monorepo/workspaces | Reuse Go BFF and existing workspace | `apps/backend`, root pnpm workspace | aligned | Reuse |
| backend language | Go modular monolith | `apps/backend/go.mod`, `cmd/api`, `internal/*` | aligned | Extend `internal/markets` |
| database/migrations | PostgreSQL, golang-migrate, sqlc | `migrations/`, `sqlc.yaml`, `internal/dbqueries` | aligned | Add migration 000016 and Markets queries |
| OpenAPI/schema ownership | Shared Markets V1 contract | `schemas/openapi/markets-v1.yaml` is a partial stub | missing | Expand contract before handlers |
| Polymarket adapter | BFF anti-corruption layer | `internal/markets/gamma` lists minimal events | partial | Harden Gamma and add public CLOB client |
| realtime pipeline | Snapshot plus gap recovery | Existing ADR implies sequence; upstream exposes hash/time, not sequence | conflict | Resolve with ADR-010 snapshot/hash resync |
| observability | Freshness and upstream result metrics | Generic health and legacy metrics exist | partial | Add Markets metrics/readiness data |
| CI/CD | Existing Go, migration, and sqlc drift gates | `.github/workflows/ci.yml` | aligned | Extend existing gates |
| Phase 1 tasks | Backend-first read slice | Harness includes web/Android and omits several backend tasks | conflict | Realign task graph for this run |

## Code-to-harness drift

- The manifest recorded every task as `planned`, but event listing, capability,
  eligibility, and a minimal Gamma client already existed.
- `Service.Capabilities` referenced a missing response field, so the pre-existing
  Markets package did not compile.
- No Markets persistence, detail routes, CLOB market data, realtime state,
  signal engine, or conformance evidence existed.
- The canonical OpenAPI described only three partial endpoints.

## Official upstream verification

Facts were retrieved from official Polymarket documentation on 2026-07-30.

| Fact | Evidence | Confidence | Revalidation trigger |
|---|---|---|---|
| Gamma is the event/market metadata surface | `/getting-started/api`; event and market API references | high | Gamma schema/changelog change |
| CLOB `/book` and `/prices-history` are public read surfaces | prices/order-books and rate-limit docs | high | CLOB V2 migration or endpoint change |
| Public realtime uses the market WebSocket and token IDs | WSS market API reference | high | WebSocket schema change |
| Book and delta payloads expose hash/time, not a documented monotonic sequence | WSS market API reference | high | sequence field becomes documented |
| Gamma and CLOB apply documented IP-based throttling | rate-limit reference | high | rate-limit page change |
| No unified official Go SDK is documented | official SDK listings; direct API guidance | medium | official Go SDK release |
| Eligibility/geoblock is not required for public reads and remains fail-closed for transactions | current phase boundary | medium | Phase 2 authorization |

No contract address, collateral address, signing domain, credential, or
transactional assumption is needed by this public-read slice.

## Focused deviations

1. Web and Android implementation are deferred by the uploaded assignment.
2. The task graph's web-rendering exit criterion is replaced by backend contract
   conformance and deterministic fixture evidence.
3. Realtime recovery uses snapshot hash, timestamps, bounded age, and forced
   resnapshot because upstream does not document a monotonic sequence.
4. Existing Go/PostgreSQL architecture is retained; no SDK, datastore,
   microservice platform, Kafka, or Kubernetes dependency is introduced.

## Gate

The slice may proceed because the conflicts are local, reversible, and resolved
by ADR-010. Human approval remains required for production deployment,
production writes, secrets, custody/signing, fund movement, destructive
migration, custom contracts, and jurisdiction enablement.
