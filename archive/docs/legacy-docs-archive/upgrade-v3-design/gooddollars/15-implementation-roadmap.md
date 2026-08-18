# 15 — Implementation Roadmap

## Week 1 — Celo and G$ base

- Add Celo chain config.
- Add G$ token registry for dev/staging/prod.
- Add G$ balance API and frontend card.
- Deploy or configure MarketEngine staging with G$.
- Launch one Direction market and one Threshold market.

Acceptance:

```text
User can connect and see G$ balance.
User can enter one test market with G$.
Indexer can project the market event.
```

## Week 2 — FeeRouter and vaults

- Implement `RetroPickFeeRouter`.
- Implement `TreasuryVault`.
- Implement `RewardsVault`.
- Add route batch event schema.
- Add Foundry tests.

Acceptance:

```text
Fees can be pulled and routed to treasury/rewards/community buckets.
Bad allocation reverts.
Routing events are indexed.
```

## Week 3 — Referral and quest ledger

- Add referral registry tables.
- Add referral lock logic.
- Add 4-level reward math.
- Add quest events.
- Add claimable rewards API.

Acceptance:

```text
A fee event creates correct referral rewards.
A completed quest creates a claimable reward.
Missing levels go to treasury.
```

## Week 4 — GoodID and EngagementRewards

- Add GoodID status endpoint.
- Add verified-human campaign logic.
- Add prepare-claim endpoint.
- Integrate EngagementRewards frontend call path.
- Store claim payload hash and tx hash.

Acceptance:

```text
Verified user can claim quest reward.
Unverified user sees verify prompt only for bonus rewards.
Claim replay is rejected.
```

## Week 5 — Non-crypto UX polish

- Build Daily Market page.
- Hide advanced market types.
- Add plain-English confirmation and result page.
- Add pending/syncing states.
- Add invite link screen.

Acceptance:

```text
A non-crypto user can complete connect → use G$ → pick → result → reward without seeing protocol jargon.
```

## Week 6 — Impact Dashboard and GoodBuilders package

- Build GoodDollar Impact Dashboard.
- Add weekly KPI export.
- Add public demo data seed.
- Prepare GoodBuilders application copy and demo video.

Acceptance:

```text
Dashboard shows G$ used, predictions, rewards, verified users, and conversion funnel.
```
