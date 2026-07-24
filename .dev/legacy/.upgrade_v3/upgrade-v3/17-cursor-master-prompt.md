# 17 — Cursor Master Prompt

Paste this into Cursor from the root of the RetroPick monorepo.

```text
You are a senior protocol engineer and full-stack architect working on RetroPick Upgrade V3.

Goal:
Implement the Upgrade V3 architecture safely and incrementally. Do not rewrite RetroPick into a CLOB. Do not add Redis, Kafka, NATS, UMA, or microservices. Preserve the current pool-based MarketEngine, indexer -> Postgres -> API/WS read model, and wallet-based writes.

Primary documents:
- docs/upgrade-v3/README.md
- docs/upgrade-v3/00-executive-summary.md
- docs/upgrade-v3/02-target-architecture.md
- docs/upgrade-v3/04-smart-contract-upgrade-plan.md
- docs/upgrade-v3/05-fee-router-rewards-vault.md
- docs/upgrade-v3/09-gooddollar-celo-integration.md
- docs/upgrade-v3/10-referral-and-engagement-rewards.md
- docs/upgrade-v3/16-implementation-roadmap.md

Immediate task:
Create the V3 skeleton without changing existing behavior:
1. Create docs/upgrade-v3 if missing and keep these docs.
2. Create contracts/src/treasury skeleton:
   - FeeRouter.sol
   - TreasuryVault.sol
   - RewardsVault.sol
   - CommunityPool.sol
3. Create interfaces:
   - IMarketEngineFees.sol
   - IRewardFundingSink.sol
4. Create backend domains:
   - services/backend/internal/domain/gooddollar
   - services/backend/internal/domain/referrals
   - services/backend/internal/domain/rewards
   - services/backend/internal/domain/impact
5. Create packages/gooddollar with typed config for Celo and G$.
6. Add migrations for referral, rewards, GoodID status, fee events, impact metrics.
7. Do not modify MarketEngine settlement yet.
8. Do not put referral tree logic on-chain.
9. Add tests for any new code.
10. Run formatting and existing test suite.

Architecture rules:
- MarketEngine remains settlement source of truth.
- Backend/indexer calculates referral and reward eligibility.
- EngagementRewards is claim/distribution UX, not settlement source.
- GoodID is required only for UBI/bonus/sponsored rewards, not for normal market entry.
- Frontend reads indexed API by default; wallet writes only; no default direct RPC reads.
- All new endpoints must be additive under /api/v1.

Start with a plan, list files to create/modify, then implement in small commits.
```
