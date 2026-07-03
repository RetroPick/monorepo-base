# 01 — Upgrade V3 Scope

## V3 Objective

Upgrade V3 turns RetroPick from a technically strong V1 into a safer, cleaner, grant-ready, growth-ready protocol architecture.

V3 is the release where:

1. core boundaries are hardened,
2. GoodDollar/Celo support is integrated,
3. rewards and referral accounting become measurable,
4. non-crypto user onboarding becomes the default path,
5. production-readiness controls are installed.

## Scope Classification

### Build Now

| Priority | Feature/System | Why |
|---:|---|---|
| 1 | FeeRouter + TreasuryVault + RewardsVault | Required for protocol-fee economics and referral/community rewards |
| 2 | Celo/G$ deployment profile | Required for GoodDollar ecosystem alignment |
| 3 | G$ Daily Micro-Markets | Direct utility for G$ and easiest non-crypto user flow |
| 4 | Referral ledger | Needed for distribution; off-chain first for speed and safety |
| 5 | EngagementRewards claim adapter | GoodDollar-compatible reward claim UX |
| 6 | GoodID status integration | Needed for verified rewards and anti-sybil bonus campaigns |
| 7 | Backend platform/domain split | Reduces god-binary and internal ownership risk |
| 8 | Event bus + idempotent indexer | Reduces projection/realtime/keeper coupling |
| 9 | Frontend one-truth-source rule | Prevents contradictory UI states |
| 10 | Impact dashboard | Required for GoodBuilders/Celo reporting and business analytics |

### Build Later

| Feature | Defer Reason |
|---|---|
| Superfluid G$ streaming | Strong phase 2, but not needed for initial reward claims |
| AI market explainer | Useful once core G$ loop works |
| UMA/optimistic oracle | More complexity than current volume requires |
| Redis | Postgres-first realtime is already enough |
| CLOB | Not aligned with current pool-based architecture |
| Creator dashboard | Needs real usage first |
| Advanced risk terminal | Degen feature; not non-crypto-first |

## V3 Product Surface

The default app should expose only:

```text
Home
Daily Market
My G$
My Predictions
Rewards
Invite
Learn
Impact
```

Advanced mode can expose:

```text
All Markets
Portfolio
Activity
Advanced market types
Resolution details
```

## V3 Technical Surface

The technical release should expose:

```text
contracts/
  FeeRouter
  TreasuryVault
  RewardsVault
  CommunityPool optional
  Celo/G$ registry profile

backend/
  domain/gooddollar
  domain/referrals
  domain/rewards
  domain/impact
  platform/bus
  platform/cache
  platform/obs

frontend/
  features/gooddollar
  features/daily-market
  features/rewards
  features/invite
  features/impact
```
