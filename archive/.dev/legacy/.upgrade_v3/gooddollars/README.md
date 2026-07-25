# RetroPick x GoodDollar Integration Pack

This folder is the implementation documentation set for integrating RetroPick with GoodDollar and Celo while keeping RetroPick's existing protocol architecture safe.

The direction is intentionally narrow: use G$ for beginner-friendly daily micro-markets, route real protocol fees through a FeeRouter, calculate referral rewards from indexed activity, use GoodDollar Identity for verified-human campaigns, and use EngagementRewards as the claim layer for quests and rewards. Do not rewrite the MarketEngine, do not build CLOB, and do not force every user into GoodID before they understand the product.

## Locked MVP feature set

1. G$ Daily Micro-Markets
2. Claim-to-Predict onboarding
3. 4-Level Invite Network Rewards
4. Learn-to-Predict Quests via EngagementRewards
5. GoodDollar Impact Dashboard

## Documents

| File | Purpose |
|---|---|
| `00-executive-summary.md` | Senior-level summary and final architecture decision |
| `01-product-scope.md` | What to build now vs cut/defer |
| `02-system-architecture.md` | End-to-end architecture across chain, backend, frontend, rewards |
| `03-smart-contracts.md` | Contract integration plan and design principles |
| `04-fee-router-rewards-vault.md` | FeeRouter, TreasuryVault, RewardsVault and CommunityPool design |
| `05-referral-ledger.md` | 4-level referral accounting and reward ledger |
| `06-gusd-token-integration.md` | G$ token integration details and UX handling |
| `07-goodid-sybil-resistance.md` | GoodDollar Identity integration and anti-abuse rules |
| `08-engagement-rewards.md` | EngagementRewards integration and claim flow |
| `09-backend-indexer-api.md` | Backend/indexer/API additions |
| `10-frontend-ux.md` | Non-crypto UX flow and UI requirements |
| `11-impact-dashboard-kpis.md` | GoodDollar impact dashboard metrics |
| `12-security-and-threat-model.md` | Security model, risks and mitigations |
| `13-testing-plan.md` | Contract/backend/frontend test plan |
| `14-goodbuilders-application-positioning.md` | Copy and positioning for GoodBuilders |
| `15-implementation-roadmap.md` | 6-week build plan and acceptance criteria |
| `16-cursor-master-prompt.md` | Cursor prompt to implement the integration in the monorepo |
| `sources.md` | Sources and assumptions |

## Architecture north star

```text
RetroPick MarketEngine remains the settlement source of truth.
GoodDollar adds G$ utility, identity, and reward distribution.
FeeRouter connects protocol fees to treasury/reward pools.
Backend/indexer calculates eligibility and reward accounting.
Frontend gives non-crypto users a simple claim → predict → learn → claim loop.
```

For the two-phase plan-mode prompt that starts in `upgrade-v3` and then moves into `gooddollars`, use `../cursor-plan-prompt.md`.
