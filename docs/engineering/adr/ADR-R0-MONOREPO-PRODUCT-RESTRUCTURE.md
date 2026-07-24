# ADR-R0: Monorepo product restructure

**Status:** Accepted  
**Date:** 2026-07-24  
**Phase:** R0 (skeleton)

## Context

The repository contained epoch-based `MarketEngine` prediction markets (`fe-v1`, `package/prediction-v2`) while the product direction shifted to:

1. **Markets** — Polymarket-native client (web + Android)
2. **PRISM** — structured-outcome protocol (future)
3. **Legacy epoch v1** — frozen, claim-only

These share almost no domain logic. Continuing to extend `fe-v1` and `internal/domain/market` for Markets would cause semantic collisions and unsafe reuse.

## Decision

1. **Rename apps** for product clarity:
   - `fe-v1` → `apps/web`
   - `ops` → `apps/ops-web`
   - `retropick-landing` → `apps/landing-web`
   - `RetroPick-Android` → `apps/android` (absorbed into monorepo)

2. **Move contracts**:
   - `package/prediction-v2` → `contracts/legacy-pool-v1`
   - `package/treasury-vault-eth` → `contracts/legacy-pool-v1/treasury-vault-eth`
   - `package/abi` → `packages/legacy/abi`
   - `contracts/prism/` created as placeholder

3. **Add structure**: `deploy/`, `archive/`, `schemas/`, `packages/{platform,polymarket,prism}`

4. **Freeze legacy** — no new features on epoch engine; Markets and PRISM are greenfield bounded contexts.

## Consequences

- All path references updated (`contracts:build`, CI, docker-compose, harness).
- Phase R1 will quarantine `internal/domain/epoch` and strip epoch routes from `apps/web`.
- Markets implementation uses `packages/polymarket`, `internal/markets/`, `schemas/openapi/markets-v1.yaml`.

## Alternatives rejected

- **Extend fe-v1 in place** — wrong domain model for Polymarket CLOB.
- **New separate repo** — deferred; monorepo kept with strict product folders.
- **Single undifferentiated web app without product folders** — rejected; deploy split requires `products/markets` vs `products/prism` boundaries (Phase R1).
