# 12 — Security, Anti-Abuse, and Compliance

## 1. Principle

```txt
points are ledgered
points can be pending
points can be rejected
points can be clawed back
rewards require review
financial balances are separate from points
```

## 2. Abuse risks

```txt
self-referrals
multi-wallet sybil farms
bot clicks
fake free predictions
wash paid trades
creator room farming
referral rings
same user creating many rooms
reward exploitation
```

## 3. Controls by phase

Phase 0:

```txt
reserved tag list
rate limit tag claim
one primary tag per wallet
basic wallet auth
```

Phase 1:

```txt
one free prediction per user per epoch
no changing prediction after lock
stats recomputed from source predictions
score idempotency
```

Phase 2:

```txt
click points capped
signup points pending
self-referral blocked
D1 and 5-prediction rewards delayed
IP/device cluster flags
```

Phase 4:

```txt
no volume farming reward without caps
only settled paid markets count
refunded/voided markets excluded or reduced
daily point cap
manual review for rewards
```

Phase 5:

```txt
creator rooms by allowlist first
one official room per creator
room activity quality threshold
manual creator review
```

## 4. Privacy

Store:

```txt
hashed IP
hashed user agent
visitor id
campaign parameters
```

Avoid storing raw sensitive data unless necessary.

## 5. Compliance copy rules

Avoid:

```txt
guaranteed token
guaranteed cash
risk-free earning
betting language for restricted jurisdictions
sports/politics before legal review
```

Use:

```txt
prediction score
loyalty points
campaign rewards
perks
```

## 6. Invariants

```txt
points_ledger idempotency key unique
confirmed points must equal sum confirmed ledger
reward payout must reference approved review
paid rewards must never debit user balance table
growth frontend cannot confirm points
```
