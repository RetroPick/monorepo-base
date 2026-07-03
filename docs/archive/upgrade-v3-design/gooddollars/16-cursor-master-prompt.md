# 16 — Cursor Master Prompt

Use this prompt inside Cursor from the RetroPick monorepo root.

```text
You are a senior protocol engineer and full-stack architect working on RetroPick.

Goal: implement the GoodDollar integration docs inside `gooddollars/` while preserving the current MarketEngine settlement architecture.

Context:
- RetroPick is an event-driven pool-based prediction market protocol.
- MarketEngine remains the settlement source of truth.
- GoodDollar integration is additive: G$ token utility, GoodID, EngagementRewards, FeeRouter, RewardsVault, referral ledger, quest ledger, impact dashboard.
- Do not rewrite MarketEngine settlement paths unless absolutely required.
- Do not build CLOB, Redis, Superfluid streaming, or AI trading in MVP.

Implement in phases:

1. Add GoodDollar config package:
   - Celo chain IDs and G$ addresses.
   - Token decimals handling.
   - Feature flags for GoodID, EngagementRewards, FeeRouter.

2. Contracts:
   - Add `RetroPickFeeRouter.sol`.
   - Add `RetroPickTreasuryVault.sol`.
   - Add `RetroPickRewardsVault.sol`.
   - Add optional `RetroPickCommunityPool.sol`.
   - Add Foundry tests for all invariants.

3. Backend:
   - Add `internal/domain/gooddollar`.
   - Add migrations for identity status, quest events, reward events, claims, referral users, referral reward events, fee route batches.
   - Add endpoints under `/api/v1/gooddollar`, `/api/v1/rewards`, `/api/v1/referrals`, `/api/v1/impact/gooddollar`.
   - Make fee/reward processing idempotent by tx_hash + log_index.

4. Frontend:
   - Add `features/gooddollar` folder.
   - Build G$ balance card, Daily Market page, Claim-to-Predict card, GoodID badge, Quest panel, Reward claim button, Impact panel.
   - Use beginner copy; no protocol jargon.

5. Testing:
   - Contract tests for FeeRouter/vaults.
   - Backend tests for referral math, claim replay, GoodID gating.
   - Frontend tests for onboarding and rewards UI.

Rules:
- Preserve existing API behavior.
- Add feature flags so the integration can be disabled.
- Use indexed API as frontend source of truth.
- Do not create direct frontend RPC reads except for wallet writes.
- Every new money-moving path needs events, tests, and docs.

Start by scanning current contracts, backend routes, migrations, chain registry, frontend wallet integration, and app routing. Then propose exact file modifications before editing.
```
