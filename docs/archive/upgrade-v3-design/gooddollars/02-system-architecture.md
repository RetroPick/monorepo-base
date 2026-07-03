# 02 — System Architecture

## Integration model

RetroPick should integrate GoodDollar as an ecosystem layer, not as the settlement layer.

```mermaid
flowchart TB
  subgraph user[User App]
    FE[RetroPick Web]
    REOWN[Reown Connect]
    GOODID[GoodDollar Identity]
    ERSDK[EngagementRewards SDK]
  end

  subgraph chain[Celo Chain]
    GUSD[G$ Token]
    ME[RetroPick MarketEngine]
    FR[RetroPick FeeRouter]
    TV[TreasuryVault]
    RV[RewardsVault]
    CP[CommunityPool]
  end

  subgraph backend[RetroPick Backend]
    API[API]
    IDX[Indexer]
    LEDGER[Reward + Referral Ledger]
    QUEST[Quest Engine]
    IMPACT[Impact Dashboard API]
  end

  FE --> REOWN
  FE --> GOODID
  FE --> GUSD
  FE --> ME
  ME --> IDX
  IDX --> LEDGER
  LEDGER --> API
  API --> ERSDK
  ME --> FR
  FR --> TV
  FR --> RV
  FR --> CP
  RV --> ERSDK
  IDX --> IMPACT
```

## Component responsibility

| Component | Responsibility |
|---|---|
| MarketEngine | Accept G$ market entries, settle markets, emit events |
| FeeRouter | Pull protocol fees and route exact allocation |
| TreasuryVault | Hold protocol revenue |
| RewardsVault | Hold rewards funding for referral/quest/campaign claims |
| CommunityPool | Hold sponsored market or campaign budgets |
| Backend Indexer | Project chain events into database |
| Referral Ledger | Calculate invite rewards from real fee events |
| Quest Engine | Track Learn-to-Predict tasks |
| EngagementRewards | Claim/distribution UX for rewards |
| GoodDollar Identity | Verified-human gating for bonus/UBI/campaigns |
| Reown | Social/email/wallet onboarding and analytics funnel |

## Why this matches RetroPick's current stack

RetroPick already uses an on-chain engine, off-chain projections, and realtime frontend updates. GoodDollar integration should hook into those existing event and read-model patterns rather than adding a separate settlement system.

## Key invariant

```text
On-chain market settlement must not depend on referral or quest logic.
Referral and quest rewards must depend on indexed, idempotent chain activity.
```

## Data flow

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant ME as MarketEngine
  participant IDX as Indexer
  participant DB as Postgres
  participant API as API
  participant ER as EngagementRewards

  U->>FE: Connect with Reown
  FE->>ME: Enter daily G$ market
  ME-->>IDX: Position/Fee event
  IDX->>DB: Store chain event + projections
  DB->>API: Claimable/quest/referral state
  U->>FE: Click claim reward
  FE->>API: Prepare reward claim
  API-->>FE: Signed claim payload
  FE->>ER: Submit claim
  ER-->>U: G$ reward
```
