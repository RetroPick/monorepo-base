# 16 — Implementation Roadmap

## Week 1 — V3 Documentation and Skeleton

- add `docs/upgrade-v3`
- create `packages/gooddollar`
- add Celo/G$ config
- add backend domain skeletons:
  - `domain/gooddollar`
  - `domain/referrals`
  - `domain/rewards`
  - `domain/impact`
- define DB migrations

## Week 2 — FeeRouter Contracts

- implement FeeRouter
- implement TreasuryVault
- implement RewardsVault
- optional CommunityPool
- add tests and invariants
- add deploy script
- set MarketEngine treasury to FeeRouter on testnet profile

## Week 3 — Backend GoodDollar + Rewards

- implement GoodDollar status endpoint
- implement referral binding APIs
- implement fee event processor
- implement reward ledger
- implement claim preparation endpoint
- add impact aggregation job

## Week 4 — Frontend Beginner UX

- add My G$ screen
- add Daily Market flow
- add Invite screen
- add Rewards screen
- add Learn-to-Predict quest UI
- add Impact dashboard

## Week 5 — EngagementRewards Integration

- integrate claim payload from backend
- connect frontend claim flow
- record claim tx
- reconcile claim status from indexer/backend
- add error states

## Week 6 — GoodBuilders/Celo Demo

- run G$ daily market demo
- show fee routing batch
- show referral ledger
- show verified-human status
- show rewards claim
- show impact dashboard
- record demo video

## 90-Day Upgrade Track

| Phase | Focus |
|---|---|
| 1 | V3 docs, contracts, GoodDollar skeleton |
| 2 | FeeRouter and ledger |
| 3 | frontend non-crypto UX |
| 4 | ops/reporter workflow |
| 5 | harden indexer and event bus |
| 6 | production readiness |
