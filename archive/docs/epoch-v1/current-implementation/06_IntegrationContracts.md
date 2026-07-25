# 06 Integration Contracts

> **ABI map:** [`.dev/abi-map.md`](../../../.dev/abi-map.md). **Epoch fields:** [`.dev/backend/epoch-field-parity.md`](../../../.dev/backend/epoch-field-parity.md).

## Purpose
Defines practical integration boundaries between frontend, backend, and smart contracts in the current implementation.

## Frontend <-> Backend HTTP Contracts
Primary typed client: `apps/web/src/lib/api/retropickApi.ts`.

Key endpoint groups:
- **Markets**: `/api/v1/markets`, `/api/v1/markets/{id}`, epochs/outcomes/probability/chart.
- **User**: balance, positions, claims, portfolio summary, watchlist, faucet-state.
- **Tx orchestration**: `/api/v1/tx/prepare/{enter|switch|claim}`, `/api/v1/tx/submit`.
- **Funding**:
  - legacy path `/api/v1/funding/*`,
  - abstraction path `/api/funding/*`.
- **Registry/config**: `/api/v1/config/contracts`.

## Frontend <-> Backend Realtime Contract
Endpoint: `/ws`.

Behavior contract:
- Client subscribes by channel names.
- Server enforces channel authorization (`global`, `market`, `user`, `deposit`, `ops`).
- Optional `lastSeq` allows replay of missed events.
- Client handles `resync_required` and refetches when sequence gaps occur.

## Backend <-> Smart Contract Contracts
- Backend indexer decodes events using embedded MarketEngine ABI.
- API can read live contract views via `ethops` caller.
- Tx prepare endpoints build calldata/target/value for wallet execution against deployed MarketEngine/faucet contracts.
- Contract addresses and chain metadata are sourced from backend registry.

## Event Contract (Indexer Side)
Main indexed event families:
- Template/market lifecycle: upsert/initialize/open/lock/resolve/halt.
- User actions: deposit, switch, claim.

Indexer contract:
- Preserve canonical chain event rows.
- Update derived projections for frontend consumption.
- Emit realtime envelopes with dedupe keys and sequence ids.

## Data Freshness Contract
- Many market/user responses include freshness metadata (`lastIndexedBlock`, `lastSyncAt`, projection block fields).
- Frontend should treat these fields as observability signals for stale/lagged states.

## Auth/Identity Contract
- Bearer JWT is used for authenticated principal extraction where required.
- Operator endpoints enforce operator principal.
- Some wallet-based routes are query/body address driven and intentionally less strict; these must be treated as explicit trust-boundary choices.

## Compatibility Notes
- Funding integration currently supports two generations of endpoint surface.
- Frontend should continue to use typed clients and avoid ad hoc response parsing to reduce drift risk.
