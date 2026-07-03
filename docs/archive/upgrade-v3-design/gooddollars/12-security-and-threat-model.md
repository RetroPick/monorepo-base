# 12 — Security and Threat Model

## Threat model summary

GoodDollar integration introduces reward farming, identity gating, G$ transfer quirks, and routing/funding risk. It should not introduce settlement risk.

## Threats and mitigations

| Threat | Layer | Mitigation |
|---|---|---|
| Fake signups farm rewards | Growth/rewards | No rewards from signups; real fee events only |
| Multi-wallet bonus farming | Identity | GoodID required for subsidized rewards |
| Referral cycles | Backend | Cycle detection before lock |
| Self-referral | Backend | Block same root wallet / same wallet |
| Overpay referral rewards | Backend | `sum(rewards)+treasury=fee` invariant |
| FeeRouter bad split | Contract | `treasury+rewards+community=amount` require |
| Bad G$ amount due to transfer fee | Contract | Check actual received amount |
| Reward claim replay | Backend/claim | Nonce, claim id, status transitions |
| Unfunded claims | Backend/vault | Only sign claims within funded budget |
| GoodID status stale | Backend | Refresh before bonus claim |
| EngagementRewards claim mismatch | Backend | Store signed payload hash and tx hash |
| Market settlement corruption | Contract | Do not put referral/quest logic in settlement path |
| Admin compromise | Contract/Ops | Multisig, timelock later, role split |

## Critical invariants

```text
MarketEngine claims reserve is never used for referral or quest rewards.
FeeRouter cannot send funds to arbitrary addresses.
RewardsVault cannot be drained by public users.
Backend cannot sign claim larger than ledger balance.
A fee event is processed once.
A reward event is claimed once.
GoodID-gated reward is one-human-one-claim.
```

## Contract tests

- FeeRouter correct split.
- Revert on bad split.
- Revert on bad received amount.
- Revert on unauthorized routing.
- Pause blocks routing.
- RewardsVault only funds whitelisted destination.
- CommunityPool only accepts authorized campaign spending.

## Backend tests

- Duplicate chain events do not create duplicate rewards.
- Missing referral levels go to treasury.
- Cycles blocked.
- GoodID root wallet dedupes bonus claims.
- Claim replay rejected.
- Claim amount cannot exceed funded/claimable.

## Frontend tests

- GoodID optional until bonus claim.
- Pending tx never shown as final.
- G$ transfer failure handled.
- Claim failure does not remove reward from UI.
