# 01 — Product Growth Architecture

## 1. Product objective

RetroPick should grow because:

```txt
Every prediction creates identity.
Every portfolio becomes proof.
Every performance card becomes content.
Every user can become a creator.
Every creator can become an affiliate later.
```

## 2. Fit with realtime backend plan

Growth features should reuse the current realtime primitives:

```txt
REST snapshots
WebSocket realtime deltas
PostgreSQL durable event store
points ledger
realtime_events
user channels
leaderboard channels
```

Add growth as domains in the existing Go backend:

```txt
internal/app/growth
internal/app/referrals
internal/app/points
internal/app/leaderboards
internal/app/sharecards
internal/app/rooms
internal/app/seasons
```

## 3. Core loops

### Loop A — Portfolio performance loop

```txt
User predicts
→ stats update
→ profile updates
→ performance card generated
→ user shares
→ friend clicks
→ friend signs up
→ friend predicts
```

### Loop B — Challenge/fade loop

```txt
User shares "I am Top 12%"
→ friend clicks "Beat my score"
→ friend makes predictions
→ leaderboard/rivalry emerges
```

### Loop C — Referral activation loop

```txt
User shares profile/portfolio/market
→ new user attributed
→ new user makes first free prediction
→ referrer earns pending points
→ both earn streak/score
```

### Loop D — Paid conversion loop

```txt
Free user has score/streak
→ wants real payout
→ deposits USDC
→ paid PnL starts
→ paid PnL share card
```

### Loop E — Creator room loop

```txt
Power user creates room
→ shares room leaderboard
→ members compete
→ room grows
→ creator earns points/revenue share later
```

## 4. Product layers

| Layer | Purpose | Build time |
|---|---|---|
| ShareTag | Persistent identity | Phase 0 |
| Free predictions | Activation without deposit | Phase 1 |
| Portfolio stats | Status and credibility | Phase 1 |
| Share cards | Distribution content | Phase 1 |
| Referrals | Attribution | Phase 2 |
| Points | Incentive accounting | Phase 2 |
| Paid mode | Monetization | Phase 4 |
| Rooms | Creator/community growth | Phase 5 |
| Seasons | Retention cycles | Phase 6 |
| Affiliate | Revenue-backed growth | Phase 7 |

## 5. North star metric

For bootstrap:

```txt
weekly active predictors
```

Supporting metrics:

```txt
D1 retention
D7 retention
predictions per active user
profile shares per user
signup-to-first-prediction conversion
referral activation rate
free-to-paid conversion
```

Do not optimize TVL first. Optimize repeated prediction behavior.

## 6. Product promise

```txt
Everyone has opinions. RetroPick keeps score.
```
