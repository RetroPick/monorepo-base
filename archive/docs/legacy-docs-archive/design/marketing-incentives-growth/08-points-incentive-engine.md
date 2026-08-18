# 08 — Points and Incentive Engine

## 1. Principle

Points must reward quality behavior:

```txt
retention > signup
first prediction > click
paid activation > vanity volume
creator quality > follower count
```

## 2. No token promises

Use:

```txt
RetroPoints may be redeemable for future perks, campaign benefits, rewards, and fee discounts.
```

Avoid:

```txt
RetroPoints guarantee token allocation.
```

## 3. Points lifecycle

```txt
PENDING
CONFIRMED
REJECTED
CLAWED_BACK
```

## 4. Phase 1 score

```txt
correct free prediction: +10 score
3-win streak: +20 score
5-win streak: +50 score
daily active prediction: +10 score
```

## 5. Phase 2 referral points

```txt
link click: +1 point, capped 10/day
signup: +10 pending
first free prediction: +50 pending
D1 return: +100 pending
5 predictions: +150 pending
```

Confirm after:

```txt
7 days
no abuse flag
user not self-referred
```

## 6. Phase 4 paid points

```txt
first USDC deposit: +200 pending
first paid prediction: +300 pending
referred first paid prediction: +500 pending
3 paid active days: +700 pending
```

Daily cap:

```txt
max 1,000 growth points/day/user in MVP
```

## 7. Volume points

Avoid at first.

If added:

```txt
1 point per $1 paid stake
daily cap
only settled non-refunded markets
only after anti-abuse works
```

## 8. Worker pattern

Use DB queue and SKIP LOCKED.

```txt
growth event occurs
→ insert growth_events
→ PointsWorker reads event
→ applies rule
→ inserts points_ledger PENDING
→ emits points_pending
→ ConfirmationWorker confirms/rejects later
```

## 9. Idempotency keys

```txt
points:signup:{referredUserId}
points:first_free_prediction:{predictionId}
points:d1_return:{userId}:{date}
points:first_paid:{marketEntryId}
points:creator_room_10_members:{roomId}
```

## 10. Cost control

Under $100/month:

```txt
points are mostly non-cash
rewards are tiny and manual
no automatic USDC redemption in first phases
```
