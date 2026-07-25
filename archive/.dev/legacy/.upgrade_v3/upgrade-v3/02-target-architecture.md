# 02 — Target Architecture

## V3 Architecture Diagram

```mermaid
flowchart TB
  subgraph Chain[Celo / Base Testnet]
    ME[MarketEngine]
    FR[FeeRouter]
    TV[TreasuryVault]
    RV[RewardsVault]
    CP[CommunityPool optional]
    GD[GoodDollar / G$]
    ER[GoodDollar EngagementRewards]
    ME -->|withdrawFees / fee reserve| FR
    FR --> TV
    FR --> RV
    FR --> CP
    RV -->|fund reward source| ER
    GD --> ME
  end

  subgraph Backend[Go Backend]
    API[api REST + WS only]
    IDX[indexer]
    BUS[platform/event bus]
    MKT[domain/market]
    EPO[domain/epoch]
    REF[domain/referrals]
    REW[domain/rewards]
    GOOD[domain/gooddollar]
    IMP[domain/impact]
    RT[domain/realtime]
    PG[(Postgres)]
    IDX --> BUS
    BUS --> MKT
    BUS --> EPO
    BUS --> REF
    BUS --> REW
    BUS --> IMP
    BUS --> RT
    API --> PG
    MKT --> PG
    EPO --> PG
    REF --> PG
    REW --> PG
    GOOD --> PG
    IMP --> PG
    RT --> PG
  end

  subgraph Frontend[Next.js Apps]
    WEB[apps/web]
    OPS[apps/ops]
    LAND[landing]
    WEB -->|indexed reads| API
    WEB -->|wallet writes| ME
    WEB -->|claim rewards| ER
    OPS --> API
  end

  IDX -->|read logs| ME
  IDX -->|read FeeRouted events| FR
  IDX -->|read claims| ER
```

## The Key V3 Rule

```text
On-chain settlement is canonical.
Backend projections are the default UX truth.
Frontend never treats txs as final until indexed.
GoodDollar rewards are claim UX, not market settlement.
```

## Chain Responsibilities

| Component | Responsibility |
|---|---|
| `MarketEngine` | Market deposits, switches, epoch lifecycle, resolution, claims |
| `FeeRouter` | Pull/receive fees and route exact amounts |
| `TreasuryVault` | Protocol-owned revenue |
| `RewardsVault` | Referral/quest/community reward budget |
| `CommunityPool` | Sponsored campaigns and GoodBuilders-style reward pools |
| `EngagementRewards` | User reward claim transaction UX |
| `G$` | Market participation token and reward currency |

## Backend Responsibilities

| Domain | Responsibility |
|---|---|
| `market` | templates and market read models |
| `epoch` | epoch state, positions, claims |
| `gooddollar` | GoodID status, G$ config, EngagementRewards claim metadata |
| `referrals` | invite code, referral tree, 4-level accounting |
| `rewards` | quest/reward ledger, claimable balances, claim payloads |
| `impact` | G$ volume, verified users, reward KPIs |
| `realtime` | durable `realtime_events` and WS envelope publishing |

## Frontend Responsibilities

| Feature | Responsibility |
|---|---|
| Daily Market | simplest non-crypto market flow |
| My G$ | balance, claim/receive guidance |
| Rewards | claimable rewards, claim button |
| Invite | referral code, invite network stats |
| Learn | beginner explanations and quest progress |
| Impact | public GoodDollar/RetroPick metrics |
