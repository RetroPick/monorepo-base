# 07 — Share Card and OG Image System

## 1. First card to build

Build **portfolio performance card** first.

```txt
Portfolio card = persistent identity
Position card = temporary opinion
```

## 2. Card types by phase

Phase 1:

```txt
portfolio_performance
weekly_performance
streak
asset_specialist
```

Phase 3:

```txt
position_entry
position_result
fade_me
join_my_side
```

Phase 5:

```txt
room_leaderboard
creator_room_invite
```

Phase 6:

```txt
season_rank
season_winner
campaign_badge
```

## 3. MVP implementation

Start cheap:

```txt
HTML/CSS card preview
copy text button
Open Graph metadata route
manual screenshot acceptable
```

Then add:

```http
GET /api/v1/share/cards/{id}.png
```

## 4. Card payload

```json
{
  "cardType": "portfolio_performance",
  "tag": "asyam",
  "predictionScore": 742,
  "accuracyBps": 6100,
  "currentStreak": 5,
  "rank": "Top 12%",
  "cta": "Can you beat my score?",
  "url": "https://retropick.xyz/@asyam?r=asyam"
}
```

## 5. Share URL

```txt
https://retropick.xyz/s/{shortCode}
```

The short code expands to:

```txt
destination path
referrer id
campaign id
card type
source platform
```

## 6. Post template

```txt
I’m ranked Top 12% on RetroPick.

61% accuracy
5-win streak
BTC specialist

Can you beat my score?
{link}
```

## 7. Tracking events

```txt
share_card_created
share_card_viewed
share_link_copied
share_link_clicked
share_destination_signup
share_destination_first_prediction
```

## 8. Anti-abuse

Do not grant high points for:

```txt
card generation
copy button click
self-clicks
same IP repeated clicks
```

Reward conversions.
