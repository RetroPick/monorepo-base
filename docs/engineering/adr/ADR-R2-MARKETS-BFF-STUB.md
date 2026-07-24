# ADR-R2: Markets BFF read stub

**Status:** Accepted  
**Date:** 2026-07-24  
**Phase:** R2

## Context

Markets web (`NEXT_PUBLIC_PRODUCT=markets`) needs a backend that is not the epoch `MarketEngine` API. Legacy routes remain at `/api/v1/markets` (template list) and `/api/v1/markets/{templateId}`.

## Decision

1. Add `apps/backend/internal/markets/` with fail-closed eligibility, capabilities, and empty events list.
2. Register **static** routes before legacy param routes in `cmd/api/main.go`:
   - `GET /api/v1/markets/eligibility`
   - `GET /api/v1/markets/capabilities`
   - `GET /api/v1/markets/events`
3. Add `@retropick/polymarket` shared types and web client under `apps/web/src/products/markets/`.
4. Expand `schemas/openapi/markets-v1.yaml` to match handlers.

## Consequences

- Chi matches literal paths before `{templateId}`; no legacy break for normal template IDs.
- Phase R3: Polymarket ingest, move legacy epoch list to `/api/v1/legacy/markets`, implement `docs/markets-v1/`.

## Follow-up

- Wire geoblock/eligibility upstream
- Gamma/CLOB catalog ingest
- Generate clients from OpenAPI
