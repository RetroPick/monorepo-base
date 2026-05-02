# 02 — Phase Roadmap and Budget

## Budget assumption

Monthly bootstrap budget: **~$100/month**.

Use:

```txt
one small VPS or low-cost backend host
Vercel/free frontend where possible
PostgreSQL on VPS
free/open-source analytics where possible
tiny manual reward pool
no paid affiliate until revenue exists
```

---

## Phase 0 — Identity foundation

### Goal

Create persistent user identity.

### Must build

```txt
ShareTag reservation
wallet-linked user profile
public profile URL
basic profile page
referral code generated automatically
growth event tracking foundation
```

### Later

```txt
custom profile themes
verified creator badge
ENS/Farcaster/X linking
profile NFT
```

### Backend

```http
POST /api/v1/growth/tags/check
POST /api/v1/growth/tags/claim
GET  /api/v1/users/{tag}
GET  /api/v1/users/{tag}/public-profile
```

### Cost

```txt
$0–5/month
```

### Exit criteria

```txt
User can claim @tag.
User has public profile URL.
Every user has referral code.
```

---

## Phase 1 — Shareable portfolio performance + free predictions

### Goal

Make the first viral loop work before paid markets.

### Must build

```txt
free predictions
portfolio stats
prediction score
accuracy
current streak
best streak
rank
portfolio share card
basic leaderboard
profile referral link
```

### Later

```txt
advanced score formula
asset specialist badges
underdog caller score
paid PnL stats
multi-timeframe rankings
```

### Backend

```http
POST /api/v1/free-predictions
GET  /api/v1/users/{tag}/performance
GET  /api/v1/leaderboards/global
GET  /api/v1/share/portfolio/{tag}
```

### WS

```txt
profile:{tag}
leaderboard:global
user:{address}
```

### Cost

```txt
$0–15/month
```

### Exit criteria

```txt
User can make free predictions.
Portfolio stats update after resolution.
User can share performance card.
Friend can click card and see profile.
```

---

## Phase 2 — Referral activation points

### Goal

Reward referrals based on quality actions, not clicks.

### Must build

```txt
referral links
UTM/link parameter capture
click tracking
signup attribution
first prediction attribution
points ledger
referral dashboard
points event queue
```

### Later

```txt
multi-touch attribution
indirect referrals
creator campaign dashboards
cross-device attribution
```

### Cost

```txt
$0–10/month
```

### Exit criteria

```txt
Can identify which users bring activated users.
Points ledger has pending/confirmed states.
Referral dashboard shows clicks/signups/activations.
```

---

## Phase 3 — Position/result share cards

### Goal

Make individual predictions and results shareable after the performance identity exists.

### Must build

```txt
prediction card
result card
streak card
fade/challenge card
market-specific referral links
share text templates
```

### Later

```txt
video card
TikTok/Reels template
animated cards
meme templates
X bot integration
```

### Cost

```txt
$0–10/month
```

### Exit criteria

```txt
Every prediction/result can produce a trackable share card.
Shared market links preserve referrer and market context.
```

---

## Phase 4 — Paid USDC beta incentives

### Goal

Convert free users into paid prediction users.

### Must build

```txt
paid performance stats
paid PnL
ROI
paid leaderboard
paid referral activation points
small reward pool
clear free vs paid profile tabs
```

### Later

```txt
fee rebates
VIP tiers
advanced paid analytics
copy-pick alerts
```

### Cost

```txt
$20–40/month
```

Suggested allocation:

```txt
$10–30 tiny reward pool
$10 infra buffer
```

### Exit criteria

```txt
Free users convert to Base USDC paid rounds.
Paid PnL card works.
Rewards are small and manually reviewed.
```

---

## Phase 5 — Creator rooms

### Goal

Turn strong referrers into community operators.

### Must build

```txt
creator room page
room leaderboard
room referral link
room stats
room share card
creator stats dashboard
```

### Later

```txt
public room creation
paid creator campaigns
room-vs-room battles
creator fee-share
Telegram mini app
```

### Cost

```txt
$0–20/month
```

### Exit criteria

```txt
At least 3 rooms create repeated active predictions.
Room owner can see members, activations, points.
```

---

## Phase 6 — Seasons + prize pools

### Goal

Create retention cycles.

### Must build

```txt
season table
campaign table
season leaderboard snapshots
weekly reset
badges
point multipliers
small monthly prize pool
campaign-specific multipliers
```

### Later

```txt
sponsored campaigns
larger prize pools
NFT badges
partner campaigns
```

### Cost

```txt
$30–50/month
```

### Exit criteria

```txt
Users return weekly for leaderboard/prize cycles.
Rooms/creators compete within seasons.
```

---

## Phase 7 — Revenue-backed affiliate

### Goal

Scale proven creators with fee-share only after revenue exists.

### Add only when

```txt
100+ active users
10+ paid users
3+ creators bringing retained users
some protocol fee revenue
anti-abuse is working
```

### Cost

```txt
funded from revenue
```

### Exit criteria

```txt
Affiliate payouts do not exceed a fixed % of protocol revenue.
```

---

## Phase 8 — Advanced growth engine

### Build later

```txt
Telegram mini app
X bot
creator API
sponsored rooms
automated video generation
advanced recommendations
AI market explanations
```

### Cost

```txt
only after traction or sponsorship
```

## Must under $100/month

```txt
ShareTag
public profile
free prediction
portfolio stats
performance card
basic referral attribution
points ledger
basic leaderboard
manual small rewards
```

## Later

```txt
fee-share
large prizes
creator payout automation
X bot
Telegram mini app
advanced OG image infra
multi-level affiliate
token/airdrop
```
