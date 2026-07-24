# ADR-R3: Legacy API namespace and Polymarket Gamma catalog

**Status:** Accepted  
**Date:** 2026-07-24  
**Phase:** R3

## Context

Phase R2 introduced the Polymarket Markets BFF at `/api/v1/markets/*` (eligibility, capabilities, events). The legacy epoch MarketEngine API also used `/api/v1/markets`, creating a route collision.

Markets V1 needs a read-only Polymarket catalog surface proxied through the BFF (not direct browser calls to Gamma in production).

## Decision

1. **Move legacy epoch routes** to `/api/v1/legacy/markets/*` in `apps/backend/cmd/api/main.go`.
2. **Keep Markets BFF** at `/api/v1/markets/eligibility`, `/capabilities`, `/events`.
3. **Implement Gamma ingest** in `apps/backend/internal/markets/gamma` and wire `ListEvents` when `MARKETS_CATALOG_ENABLED=1` (default on).
4. **Update web legacy client** (`apps/web/src/lib/api/retropickApi.ts`) to call `/api/v1/legacy/markets/*`.
5. **No deprecated aliases** at the old epoch paths in R3 (breaking change documented here; clients must migrate).

## Consequences

- Markets and legacy epoch APIs are namespaced and can evolve independently.
- Web legacy product mode continues to work after path updates.
- `GET /api/v1/markets/events` returns normalized Gamma events with offset cursor pagination.
- Eligibility remains fail-closed until geoblock policy is implemented.
- Android and ops tooling must use the new legacy prefix for epoch data.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `MARKETS_GAMMA_API_URL` | `https://gamma-api.polymarket.com` | Upstream catalog |
| `MARKETS_CATALOG_ENABLED` | `1` | Disable to return empty stub catalog |

## Verification

```bash
go -C apps/backend test ./internal/markets/...
pnpm --filter web typecheck
pnpm --filter web test
```
