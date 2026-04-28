# Backend Architecture Scaffold

## Purpose

The backend is the API and coordination layer for user apps, operator apps, and automation services. It should be implemented as Go services following [`.tecStackPublicRPC.md`](../.tecStackPublicRPC.md), but grounded in the deployed contract registry and ABI map in [`../abi-map.md`](../abi-map.md).

## Service Boundaries

| Service | Responsibility | Chain access |
|---|---|---|
| `retropick-api` | REST, WebSocket, SIWE sessions, operator endpoints | PostgreSQL by default; explicit `live=true` chain reads only. |
| `retropick-index` | Event indexing and canonical state projection | Batched public RPC `eth_getLogs`. |
| `retropick-keeper` | Manual/rolling lifecycle automation | PostgreSQL schedule plus one live preflight before tx. |
| `retropick-alert` | Incidents, alerts, oracle stale checks | PostgreSQL only in normal operation. |
| `retropick-reporter` | TrustedReporter signing/posting | Only when reporter markets are enabled. |

Do not add a backend path that submits user deposits, switches, claims, or approvals. Users submit those directly from their wallet.

## Proposed Go Layout

```text
.dev/backend
├── README.md
├── user/README.md
├── operator/README.md
└── implementation-target/
    ├── cmd/api
    ├── cmd/indexer
    ├── cmd/keeper
    ├── cmd/alert
    ├── cmd/reporter
    └── internal
        ├── config
        ├── contracts
        ├── db
        ├── http
        ├── ws
        ├── auth
        ├── operator
        ├── indexer
        ├── keeper
        └── alerts
```

The `implementation-target` tree is the intended future Go app layout, not a requirement to place Go code under `.dev`. If the real app later lives elsewhere, keep this document as the architectural contract.

## Contract Registry

Backend config should load a generated registry derived from [`../../abi/address.md`](../../abi/address.md).

Required fields:

- environment name
- chain id
- RPC endpoint list
- MarketEngine proxy
- implementation
- stake token
- faucet
- Chainlink-family adapters
- module addresses
- ABI artifact names
- deployment manifest path

Runtime invariant:

- all MarketEngine reads/writes use the proxy address
- `IMarketEngine` is the default ABI for app reads/writes
- `MarketEngineDispatcher` is used for module registry, UUPS/operator checks, and full event ABI

## API Rules

Default reads:

- serve user and operator views from PostgreSQL projections
- include `lastIndexedBlock`, `lastSyncAt`, and data freshness on responses
- allow explicit operator live reads via `?live=true`

Writes:

- user writes are wallet-owned and frontend-submitted
- operator writes should be represented as decoded calldata or Safe transaction drafts unless the service is explicitly a keeper/reporter service
- keeper writes must create a durable DB execution record before broadcasting

## REST Surface

Public:

- `GET /api/v1/health`
- `GET /api/v1/config/contracts`
- `GET /api/v1/markets`
- `GET /api/v1/markets/:templateId`
- `GET /api/v1/markets/:templateId/epochs`
- `GET /api/v1/markets/:templateId/epochs/:epochId`
- `GET /api/v1/markets/:templateId/outcomes`
- `GET /api/v1/markets/:templateId/oracle`

User:

- `POST /api/v1/auth/nonce`
- `POST /api/v1/auth/verify`
- `DELETE /api/v1/auth/session`
- `GET /api/v1/user/positions`
- `GET /api/v1/user/epochs`
- `GET /api/v1/user/claims`
- `GET /api/v1/user/history`
- `GET /api/v1/user/faucet-state` for Base Sepolia only

Operator:

- `GET /api/v1/ops/global-state`
- `GET /api/v1/ops/templates`
- `GET /api/v1/ops/templates/:templateId/state`
- `GET /api/v1/ops/templates/:templateId/yield`
- `GET /api/v1/ops/templates/:templateId/epochs/:epochId`
- `GET /api/v1/ops/keeper/schedule`
- `GET /api/v1/ops/keeper/executions`
- `GET /api/v1/ops/oracle/health`
- `GET /api/v1/ops/incidents`
- `POST /api/v1/ops/incidents/:id/update`
- `GET /api/v1/ops/audit`
- `POST /api/v1/ops/tx/prepare` for Safe/operator calldata generation

## WebSocket Channels

- `global`
- `market:{templateId}`
- `epoch:{templateId}:{epochId}`
- `oracle:{feedId}`
- `user:{wallet}`
- `ops:keeper`
- `ops:incidents`
- `ops:governance`

All WebSocket messages are downstream notifications of indexed state, not proof that a transaction is final until the indexer marks the block confirmed under the configured finality depth.

## Database Ownership

Backend-owned projections:

- `contracts`
- `templates`
- `epochs`
- `positions`
- `user_epochs`
- `oracle_readings`
- `oracle_health`
- `chain_events`
- `keeper_schedule`
- `keeper_executions`
- `incidents`
- `audit_log`
- `operator_sessions`

Database rows should store raw integer values as strings or numeric/decimal-safe types at API boundaries. Do not coerce token amounts, pools, claim liabilities, or prices to floating point.

## Safety Rules

- Never serve stale state without a freshness indicator.
- Never use implementation or module addresses as normal app entrypoints.
- Never bypass `.operator/.runbook.md` for privileged operational actions.
- Never assume Base mainnet addresses until a mainnet address registry exists.
