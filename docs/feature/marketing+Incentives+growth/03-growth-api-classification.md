# 03 — Growth API Classification

## 1. Classification rule

```txt
REST = snapshots, commands, auth, pagination, share metadata
WebSocket = live deltas, points/profile/leaderboard updates
DB queue = async point confirmation, fraud review, leaderboard snapshot
gRPC = later internal service boundaries
```

## 2. Growth feature matrix

| Feature | Snapshot | Mutation | Live update |
|---|---|---|---|
| Public profile | REST | REST claim/edit | WS `profile:{tag}` |
| Free prediction | REST market snapshot | REST command | WS result/profile update |
| Portfolio stats | REST | worker recompute | WS `performance_update` |
| Share card | REST/OG endpoint | REST create/link | none or WS analytics |
| Referral click | REST redirect endpoint | server event | none |
| Referral activation | REST dashboard | worker attribution | WS `referral_update` |
| Points | REST dashboard | worker ledger | WS `points_update` |
| Leaderboard | REST snapshot | worker snapshot | WS `leaderboard_update` |
| Creator room | REST | REST create/join | WS `room:{id}` |
| Season | REST | ops/admin | WS `season_update` |

## 3. Public profile endpoints

```http
GET  /api/v1/p/{tag}
GET  /api/v1/p/{tag}/performance
GET  /api/v1/p/{tag}/predictions
GET  /api/v1/p/{tag}/share
```

Alias:

```http
GET /@{tag}
```

## 4. Tag endpoints

```http
POST /api/v1/growth/tags/check
POST /api/v1/growth/tags/claim
PATCH /api/v1/growth/profile
```

## 5. Free prediction endpoints

```http
POST /api/v1/free-predictions
GET  /api/v1/free-predictions/{id}
GET  /api/v1/user/free-predictions
```

## 6. Performance endpoints

```http
GET /api/v1/users/{address}/performance
GET /api/v1/p/{tag}/performance
GET /api/v1/p/{tag}/performance-card
```

## 7. Share endpoints

```http
POST /api/v1/share/cards
GET  /api/v1/share/cards/{id}
GET  /api/v1/share/cards/{id}.png
GET  /api/v1/s/{shortCode}
```

## 8. Referral endpoints

```http
GET  /api/v1/referrals/dashboard
GET  /api/v1/referrals/events
POST /api/v1/referrals/claim-code
```

## 9. Points endpoints

```http
GET /api/v1/points/balance
GET /api/v1/points/ledger
GET /api/v1/points/summary
```

Do not let public endpoints directly confirm points.

## 10. Leaderboard endpoints

```http
GET /api/v1/leaderboards/global
GET /api/v1/leaderboards/weekly
GET /api/v1/leaderboards/assets/{asset}
GET /api/v1/leaderboards/rooms/{roomSlug}
```

## 11. Creator room endpoints

```http
POST /api/v1/rooms
GET  /api/v1/rooms
GET  /api/v1/rooms/{slug}
POST /api/v1/rooms/{slug}/join
GET  /api/v1/rooms/{slug}/leaderboard
GET  /api/v1/rooms/{slug}/creator-dashboard
```

## 12. WebSocket channels

Public:

```txt
profile:{tag}
leaderboard:global
leaderboard:weekly
season:{seasonId}
room:{roomSlug}
```

User:

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
