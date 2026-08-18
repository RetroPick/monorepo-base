# 06 — Frontend Growth Refactor

## 1. New routes

```txt
/@[tag]                         Public profile
/leaderboard                     Global leaderboard
/share/[shortCode]               Share-card landing
/r/[tag]                         Referral redirect/profile
/rooms                           Room listing
/rooms/[slug]                    Room page
/seasons/[slug]                  Season page
/me/growth                       User growth dashboard
/me/referrals                    Referral dashboard
/me/points                       Points ledger
```

## 2. New components

```txt
src/components/growth/
  ShareTagClaim.tsx
  PublicProfileHeader.tsx
  PerformanceSummary.tsx
  PerformanceCardPreview.tsx
  PredictionScoreCard.tsx
  AccuracyBreakdown.tsx
  StreakBadge.tsx
  ReferralStats.tsx
  PointsBalance.tsx
  LeaderboardTable.tsx
  ShareButton.tsx
  ShareTextComposer.tsx
  GrowthQuestList.tsx
```

## 3. Hooks

```txt
usePublicProfile(tag)
usePerformance(tag)
useFreePrediction()
useShareCard()
useReferralAttribution()
usePoints()
useLeaderboard(key)
useRoom(slug)
useGrowthRealtime(channels)
```

## 4. Phase 1 public profile page

Layout:

```txt
Profile header:
  @tag
  joined date
  referral/challenge CTA

Performance cards:
  Prediction Score
  Accuracy
  Current Streak
  Best Streak
  Rank

Share section:
  "Share my performance"
  copy text
  image preview

Prediction history:
  latest free predictions
```

## 5. Primary CTA

```txt
Can you beat my score?
```

Do not start with "Deposit USDC" for new free users.

## 6. Realtime usage

Profile page:

```txt
profile:{tag}
leaderboard:weekly
```

User dashboard:

```txt
user:{address}
points:{address}
referrals:{address}
```

Room page:

```txt
room:{slug}
```

## 7. Frontend state pattern

Use React Query for snapshots and WebSocket deltas.

```ts
useRealtimeSubscription(`profile:${tag}`, event => {
  if (event.type === 'performance_update') {
    queryClient.setQueryData(['performance', tag], old => ({
      ...old,
      ...event.payload,
    }))
  }
})
```

## 8. Must not build early

```txt
No complex social graph.
No full creator CRM.
No token claim page.
No big rewards dashboard.
No automated cash payout before abuse controls.
```
