# Engineering Architecture

RetroPick v1 is epoch-driven. Market actions are gated by on-chain `MarketEngine` epoch state, while the backend indexes, projects, and serves chain state to the web and ops apps.

## Canonical Components

- `contracts/legacy-pool-v1`: Foundry contracts for `MarketEngine` and modules.
- `apps/backend`: Go API, indexer, keeper, funding workers, price worker, realtime, and migrations.
- `apps/web`: customer-facing web app.
- `apps/ops-web`: operator dashboard.
- `packages/*`: shared TypeScript contracts, types, and product logic.

## Backend Boundary

The backend remains one Go module with multiple `cmd/*` entrypoints. Process separation is done by entrypoint and deployment configuration, not by splitting code into separate app directories yet.

## Contract Boundary

New docs and tooling should reference `contracts/legacy-pool-v1`. `contracts/legacy-pool-v1` is only a compatibility alias.
