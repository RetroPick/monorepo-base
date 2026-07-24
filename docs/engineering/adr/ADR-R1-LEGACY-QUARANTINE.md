# ADR-R1: Legacy quarantine and product route boundaries

**Status:** Accepted  
**Date:** 2026-07-24  
**Phase:** R1

## Context

Phase R0 renamed folders but legacy epoch code remained mixed with future Markets/PRISM work.

## Decision

1. **Backend:** `internal/domain` → `internal/legacy/domain`; `internal/markets/` placeholder for greenfield.
2. **Packages:** Epoch TS packages under `packages/legacy/*`; keep npm names (`@retropick/contracts`, etc.).
3. **Web:** Product routes under `apps/web/src/products/{markets,prism,legacy}`; `NEXT_PUBLIC_PRODUCT` gates deploy surfaces.
4. **Schemas:** `schemas/openapi/markets-v1.yaml` stub as canonical Markets contract.
5. **Deploy:** `deploy/web-markets/.env.example` sets `NEXT_PUBLIC_PRODUCT=markets`.

## Consequences

- Markets deploy excludes `/app/*` legacy MarketEngine routes.
- Local dev defaults to `NEXT_PUBLIC_PRODUCT=all` (unset).
- Physical migration of legacy `src/features/*` into `products/legacy/` is incremental.

## Follow-up (Phase R2+)

- Implement `internal/markets/` and wire Markets routes to BFF.
- Generate TS/Kotlin clients from `markets-v1.yaml`.
