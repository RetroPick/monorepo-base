# 01 — Product Scope

## Goal

Create a simple GoodDollar-native RetroPick experience that is easy for non-crypto users but still interesting for crypto-native users.

## MVP product loop

```text
Open RetroPick
→ Connect with Reown
→ See G$ balance
→ Claim/receive G$ if needed
→ Use 1–10 G$ in a daily market
→ Result resolves automatically
→ Claim/view result
→ Complete Learn-to-Predict quest
→ Claim reward
→ Share invite link
```

## Features to build now

| Priority | Feature | Why it matters | Owner layer |
|---:|---|---|---|
| 1 | G$ Daily Micro-Markets | Direct G$ utility | Contract + FE + Backend |
| 2 | Claim-to-Predict onboarding | Non-crypto user activation | FE + GoodDollar |
| 3 | 4-Level Invite Network Rewards | Distribution engine | Backend + FeeRouter |
| 4 | Learn-to-Predict Quests | Education + retention | Backend + EngagementRewards |
| 5 | GoodDollar Impact Dashboard | GoodBuilders proof | Backend + FE |

## Beginner market types only

Expose only these in MVP beginner mode:

```text
Direction
Threshold
Range Close
```

Hide these from non-crypto users:

```text
Velocity
Ladder
Convergence
Composite
Corridor
Cascade
```

The protocol may support them, but the first user experience should not.

## Non-crypto copy rules

| Technical wording | User-facing wording |
|---|---|
| Stake | Use G$ |
| Protocol fee | Platform fee |
| Oracle | Result source / checked automatically |
| Settlement | Result confirmed |
| Epoch | Round |
| Position | Your pick |
| Claimable | Ready to claim |
| Referral tree | Invite network |
| EngagementRewards | Reward claim |

## Cut from MVP

| Feature | Decision | Why |
|---|---|---|
| Superfluid streaming | Phase 2 | Too much complexity for first GoodBuilders demo |
| AI trading/agent | Cut | Risky and confusing |
| AI explainer | Optional later | Useful but not core to G$ utility |
| Trading competitions | Phase 2 | Degen-first, less non-crypto friendly |
| Badges/profile | Phase 2 | Nice but not core utility |
| Creator dashboard | Phase 2 | Needs real creator traction first |
| Yield-on-deposit UX | Phase 2 | Too DeFi-heavy |
| CLOB | Cut | Current architecture is pool-based |

## Acceptance criteria

- A user can connect, see G$ balance, and enter a simple daily market.
- A user can complete one Learn-to-Predict loop.
- A user can claim a reward through the planned EngagementRewards integration path.
- Referral rewards are calculated only from real protocol fee events.
- Impact Dashboard shows G$ usage, verified users, rewards, and conversions.
