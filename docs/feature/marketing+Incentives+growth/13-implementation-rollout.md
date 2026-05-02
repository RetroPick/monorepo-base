# 13 — Implementation Rollout

## 1. Connection to realtime backend plan

Existing realtime phases:

```txt
realtime_events
WebSocket gateway
market live updates
user updates
LI.FI deposit realtime
market data service
operator realtime
gRPC later
```

Growth layering:

```txt
Growth Phase 0/1 can ship before paid deposits.
Growth Phase 4 depends on deposit/balance flow.
Growth Phase 5/6 depends on leaderboards and points.
Growth Phase 7 depends on revenue.
```

## 2. Engineering sprints

### Sprint A — Identity and profile

```txt
app_users
user_tags
public profile route
tag claim endpoint
profile page frontend
basic growth_events
```

### Sprint B — Free predictions and performance

```txt
free_predictions
prediction resolution worker
user_performance_stats
performance recompute service
profile performance cards
global leaderboard snapshot
```

### Sprint C — Share cards

```txt
share_cards
short link redirect
portfolio card template
copy post template
share click tracking
```

### Sprint D — Referral attribution and points

```txt
referral_links
referral_clicks
referral_attributions
points_ledger
PointsWorker
ReferralDashboard
PointsBalance
```

### Sprint E — Realtime growth updates

```txt
profile:{tag}
points:{address}
referrals:{address}
leaderboard:weekly
growth event publishing
```

### Sprint F — Paid stats integration

```txt
user_paid_stats
paid PnL card
paid referral points
reward_reviews
manual rewards
```

### Sprint G — Creator rooms

```txt
creator_rooms
room_memberships
room leaderboard
room share card
creator dashboard
```

### Sprint H — Seasons

```txt
seasons
campaigns
season leaderboard
badges
reward review
```

## 3. Must build first

```txt
ShareTag
free prediction
performance stats
portfolio share card
referral attribution
points ledger
```

## 4. Later

```txt
creator payouts
fee-share
video cards
Telegram mini app
X bot
advanced anti-fraud
multi-level affiliate
```

## 5. Testing checklist

Backend:

```txt
tag uniqueness
reserved tag rejection
one free prediction per epoch
prediction scoring idempotency
stats recompute correctness
short link redirect records click
referral attribution last-click
self-referral blocked
points idempotency
points pending/confirm/reject
leaderboard snapshot
```

Frontend:

```txt
profile loads by tag
performance card renders
share link copies
free prediction locks after submit
leaderboard updates
referral dashboard displays activation
points dashboard shows pending/confirmed
```
