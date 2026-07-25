# ADR-R4: Legacy epoch v1 archived from active tree

**Status:** Accepted  
**Date:** 2026-07-24  
**Supersedes:** Active use of D1–D14 for new feature work

## Decision

Move all legacy epoch v1 code and docs to `archive/`. The active monorepo serves **Markets**, **PRISM** (placeholder), and **Android** (scaffold) only.

## Consequences

- `apps/backend/cmd/api/main.go` is Markets BFF + health + auth only.
- Web default product is `markets` (`NEXT_PUBLIC_PRODUCT` unset).
- CI Foundry workflow is `workflow_dispatch` against `archive/contracts/legacy-pool-v1`.
- Claim-only or epoch operations require explicit restore from archive.

## Restore procedure

See [archive/README.md](../../../archive/README.md).
