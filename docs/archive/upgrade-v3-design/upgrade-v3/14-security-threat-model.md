# 14 — Security and Threat Model

## V3 Highest-Risk Areas

| Area | Risk | V3 Control |
|---|---|---|
| upgradeable contracts | storage collision or initializer issue | storage-layout CI, initializer checks, multisig/timelock |
| FeeRouter | wrong routing or arbitrary transfer | exact sum checks, whitelists, role gates |
| RewardsVault | malicious funding destination | destination allowlist, batch events, pause |
| referral ledger | self-referral/cycles/farming | no self-referral, cycle checks, rewards only from fees |
| EngagementRewards | claim replay | nonce, claim id, signed payload, DB uniqueness |
| GoodID | overblocking users | required only for subsidized rewards |
| indexer | double process or reorg | block hash tracking, idempotency keys |
| keeper | double submit | keeper_executions idempotency |
| reporter | false outcome | evidence, 2-of-3, conflict freeze, audit |
| frontend | showing non-final state as final | indexed-confirmation rule |

## FeeRouter Invariants

```text
treasuryAmount + rewardsAmount + communityAmount == receivedAmount
receivedAmount == amount pulled
batchId cannot be replayed
destination addresses are whitelisted
no arbitrary user withdrawals
```

## Referral Invariants

```text
sum(referral rewards) + treasury amount == fee amount
no reward without fee event
one direct referrer per user
missing levels go to treasury
self-referral impossible
cycles impossible
reward claims cannot exceed ledger balance
```

## G$ Accounting Invariant

```text
Use actual received amount for fee and market accounting.
Do not assume transfer amount equals received amount.
```

## Frontend Risk Controls

- show confirmation amount
- show platform fee in plain language
- do not hide network fee
- distinguish pending vs confirmed
- show result source
- show "not financial advice" / educational framing where needed
