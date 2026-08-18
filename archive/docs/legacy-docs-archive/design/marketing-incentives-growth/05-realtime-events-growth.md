# 05 — Growth Realtime Events

## 1. Principle

Growth realtime events must reuse the existing `EventEnvelope` and `realtime_events` table.

Browser can send subscription messages, but must not confirm points or mutate financial state.

## 2. Channels

Public:

```txt
profile:{tag}
leaderboard:global
leaderboard:weekly
room:{roomSlug}
season:{seasonSlug}
```

User-authenticated:

```txt
user:{address}
points:{address}
referrals:{address}
```

Operator:

```txt
ops:growth
ops:abuse
ops:rewards
```

## 3. Profile event

```json
{
  "type": "performance_update",
  "channel": "profile:asyam",
  "scope": "public",
  "payload": {
    "predictionScore": 742,
    "accuracyBps": 6100,
    "currentStreak": 5,
    "bestStreak": 9,
    "rankGlobal": 128
  }
}
```

## 4. Free prediction event

```json
{
  "type": "free_prediction_resolved",
  "channel": "user:0xuser",
  "scope": "user",
  "payload": {
    "predictionId": "uuid",
    "isCorrect": true,
    "scoreDelta": 10,
    "newStreak": 5
  }
}
```

## 5. Points event

```json
{
  "type": "points_pending",
  "channel": "points:0xuser",
  "scope": "user",
  "payload": {
    "delta": 50,
    "reason": "REFERRED_FIRST_FREE_PREDICTION",
    "status": "PENDING"
  }
}
```

## 6. Referral event

```json
{
  "type": "referral_first_prediction",
  "channel": "referrals:0xreferrer",
  "scope": "user",
  "payload": {
    "referredTag": "newuser",
    "pointsPending": 50
  }
}
```

## 7. Leaderboard event

```json
{
  "type": "leaderboard_update",
  "channel": "leaderboard:weekly",
  "scope": "public",
  "payload": {
    "leaderboardKey": "weekly-score",
    "top": [
      {"tag": "asyam", "score": 742, "rank": 1},
      {"tag": "ridho", "score": 721, "rank": 2}
    ]
  }
}
```

## 8. Emit after commit

Emit after:

```txt
free prediction inserted
prediction resolved
stats recomputed
points ledger inserted/confirmed
referral attribution created
leaderboard snapshot updated
room membership changed
reward review created
```
