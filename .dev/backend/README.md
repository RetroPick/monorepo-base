# RetroPick backend (`apps/backend`)

This folder documents the **current backend implementation** in `apps/backend/`, including **operator runbooks** for running a persistent backend (API + indexer + keeper + Postgres) and the key internal dataflows (indexer → projections → realtime → websocket).

If you are looking for broader system docs (contracts + frontend + backend), start at [`docs/README.md`](../../docs/README.md) and [`docs/technical/current-implementation/`](../../docs/technical/current-implementation/).

## Quick map

- **Processes**: [`processes.md`](./processes.md)
- **Architecture & modules**: [`architecture.md`](./architecture.md)
- **Config / env vars**: [`config-and-env.md`](./config-and-env.md)
- **Database & migrations**: [`database-and-migrations.md`](./database-and-migrations.md)
- **Indexer**: [`indexer.md`](./indexer.md)
- **Realtime + websocket**: [`realtime-and-websocket.md`](./realtime-and-websocket.md)
- **Keeper automation**: [`keeper.md`](./keeper.md)
- **Funding abstraction**: [`funding-abstraction.md`](./funding-abstraction.md)
- **Security & trust boundaries**: [`security-and-trust-boundaries.md`](./security-and-trust-boundaries.md)
- **Operations runbook**: [`operations-runbook.md`](./operations-runbook.md)
- **User surface (older notes)**: [`user/README.md`](./user/README.md)
- **Code walkthrough (near-exhaustive)**: [`code/README.md`](./code/README.md)

## “Current implementation” vs “target architecture” note

The repo includes an aspirational VPS architecture document at `.dev/.tecStackPublicRPC.md` that describes additional processes (oracle monitor / reporter / alert dispatcher) and multiple logical databases.

The **current `apps/backend/` implementation** is simpler:

- **One primary database URL**: `DATABASE_URL` (single Postgres schema with tables for events, projections, funding, keeper, incidents).
- **Optional extra processes**: indexer and keeper are real; alert is webhook-driven; reporter is a disabled-by-default TrustedReporter EIP-712 claim signer. The broader automated oracle-monitoring stack described in `.dev/.tecStackPublicRPC.md` remains a *target* unless the code in `apps/backend/cmd/*` implements it.

Each doc below links directly to the exact source files that define behavior.
