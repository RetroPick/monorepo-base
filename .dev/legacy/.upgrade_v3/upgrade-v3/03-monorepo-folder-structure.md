# 03 — Monorepo Folder Structure

## Target V3 Structure

```text
retropick/
├── apps/
│   ├── web/
│   ├── ops/
│   ├── docs/
│   └── landing/
├── services/
│   └── backend/
│       ├── cmd/
│       │   ├── api/
│       │   ├── indexer/
│       │   ├── keeper/
│       │   ├── price-worker/
│       │   ├── funding-worker/
│       │   ├── reporter-worker/
│       │   ├── rewards-worker/
│       │   ├── alert/
│       │   └── migrator/
│       ├── internal/
│       │   ├── platform/
│       │   │   ├── db/
│       │   │   ├── bus/
│       │   │   ├── chain/
│       │   │   ├── config/
│       │   │   ├── obs/
│       │   │   ├── httpx/
│       │   │   └── cache/
│       │   └── domain/
│       │       ├── market/
│       │       ├── epoch/
│       │       ├── oracle/
│       │       ├── funding/
│       │       ├── reporter/
│       │       ├── realtime/
│       │       ├── gooddollar/
│       │       ├── referrals/
│       │       ├── rewards/
│       │       └── impact/
│       ├── migrations/
│       └── api/
├── contracts/
│   ├── src/
│   │   ├── engine/
│   │   ├── modules/
│   │   ├── oracle/
│   │   ├── treasury/
│   │   │   ├── FeeRouter.sol
│   │   │   ├── TreasuryVault.sol
│   │   │   ├── RewardsVault.sol
│   │   │   └── CommunityPool.sol
│   │   ├── logic/
│   │   └── types/
│   ├── script/
│   ├── test/
│   └── out/abi/
├── packages/
│   ├── contracts/
│   ├── sdk/
│   ├── market-types/
│   ├── event-core/
│   └── gooddollar/
├── docs/
│   └── upgrade-v3/
├── infra/
│   ├── compose/
│   ├── caddy/
│   └── scripts/
└── DECISIONS.md
```

## Important Renames

| Current | Target | Why |
|---|---|---|
| `apps/backend` | `services/backend` | Backend is service layer, not frontend app |
| `apps/web` | `apps/web` | Clearer product naming |
| `contracts/legacy-pool-v1` | `contracts` | Standard Foundry/EVM naming |
| scattered API clients | `packages/sdk` | One typed client |

## New GoodDollar Package

```text
packages/gooddollar/
├── src/
│   ├── chains.ts
│   ├── tokens.ts
│   ├── goodid.ts
│   ├── engagementRewards.ts
│   ├── claims.ts
│   └── types.ts
```

This package should not own business rules. It only wraps GoodDollar-specific addresses, ABI helpers, identity status calls, and EngagementRewards payload helpers.
